use crate::credential_commands::CredentialVaultState;
use crate::credential_store::{
    CredentialReference, CredentialStore, CredentialStoreError, SecretValue,
};
use reqwest::blocking::Client;
use reqwest::header::HeaderMap;
use reqwest::StatusCode;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::time::Duration;
use tauri::State;

const LINKEDIN_PROFILE_URL: &str = "https://api.linkedin.com/v2/me";
// LinkedIn's current open, self-service Share on LinkedIn product documents
// /v2/ugcPosts for w_member_social. The versioned /rest/posts API is documented
// under Community Management, which has a separate approval boundary. Keep the
// first proof on the explicitly self-service contract until LinkedIn documents
// equivalent /rest/posts access for Share on LinkedIn apps or dogfood proves it.
const LINKEDIN_UGC_POSTS_URL: &str = "https://api.linkedin.com/v2/ugcPosts";
const RESTLI_PROTOCOL_VERSION: &str = "2.0.0";
const HTTP_TIMEOUT_SECONDS: u64 = 20;

#[derive(Debug, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct LinkedInConnectResponse {
    kind: &'static str,
    #[serde(skip_serializing_if = "Option::is_none")]
    member_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    member_urn: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    failure_class: Option<&'static str>,
    #[serde(skip_serializing_if = "Option::is_none")]
    detail: Option<&'static str>,
}

#[derive(Debug, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct LinkedInPublishResponse {
    kind: &'static str,
    #[serde(skip_serializing_if = "Option::is_none")]
    publication_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    provider_response_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    detail: Option<&'static str>,
}

#[derive(Debug, Deserialize)]
struct LinkedInProfileResponse {
    id: String,
}

#[tauri::command]
pub fn linkedin_connect_member(
    credential_reference: String,
    access_token: String,
    state: State<'_, CredentialVaultState>,
) -> LinkedInConnectResponse {
    let reference = match CredentialReference::parse(credential_reference) {
        Ok(reference) => reference,
        Err(_) => {
            return connect_rejected(
                "local_unavailable",
                "Secure credential reference is invalid.",
            )
        }
    };
    let token = access_token.trim();
    if token.is_empty() {
        return connect_rejected("invalid_token", "LinkedIn access token is required.");
    }

    let client = match linkedin_client() {
        Ok(client) => client,
        Err(()) => {
            return connect_rejected(
                "local_unavailable",
                "LinkedIn HTTPS client could not be initialized.",
            )
        }
    };

    let validation = validate_member(&client, token);
    if validation.kind != "connected" {
        return validation;
    }

    let secret = SecretValue::new(token.as_bytes().to_vec());
    let store = match state.store() {
        Ok(store) => store,
        Err(_) => {
            return connect_rejected(
                "local_unavailable",
                "Native secure credential storage is unavailable.",
            )
        }
    };
    if store.put_secret(&reference, &secret).is_err() {
        return connect_rejected(
            "local_unavailable",
            "LinkedIn authorization could not be stored securely.",
        );
    }

    validation
}

#[tauri::command]
pub fn linkedin_publish_text(
    credential_reference: String,
    member_urn: String,
    text: String,
    state: State<'_, CredentialVaultState>,
) -> LinkedInPublishResponse {
    let reference = match CredentialReference::parse(credential_reference) {
        Ok(reference) => reference,
        Err(_) => return publish_local_unavailable("Secure credential reference is invalid."),
    };
    if !valid_member_urn(&member_urn) {
        return publish_provider_rejected("LinkedIn member authority is invalid.");
    }
    let text = text.trim();
    if text.is_empty() {
        return publish_provider_rejected("LinkedIn text publication requires approved text.");
    }

    let store = match state.store() {
        Ok(store) => store,
        Err(_) => {
            return publish_local_unavailable("Native secure credential storage is unavailable.")
        }
    };
    let secret = match store.get_secret(&reference) {
        Ok(secret) => secret,
        Err(CredentialStoreError::Missing) => {
            return publish_reconnect_required("LinkedIn authorization is missing.")
        }
        Err(_) => {
            return publish_local_unavailable("Native secure credential storage is unavailable.")
        }
    };
    let token = match std::str::from_utf8(secret.expose()) {
        Ok(token) if !token.trim().is_empty() => token,
        _ => return publish_reconnect_required("LinkedIn authorization is invalid."),
    };

    let client = match linkedin_client() {
        Ok(client) => client,
        Err(()) => {
            return publish_local_unavailable("LinkedIn HTTPS client could not be initialized.")
        }
    };
    let payload = ugc_text_payload(&member_urn, text);
    let response = match client
        .post(LINKEDIN_UGC_POSTS_URL)
        .bearer_auth(token)
        .header("X-Restli-Protocol-Version", RESTLI_PROTOCOL_VERSION)
        .json(&payload)
        .send()
    {
        Ok(response) => response,
        Err(_) => {
            return publish_outcome_unknown(
                "LinkedIn publishing ended without a definitive provider outcome after dispatch became possible.",
            )
        }
    };

    classify_publish_response(response.status(), response.headers())
}

fn linkedin_client() -> Result<Client, ()> {
    Client::builder()
        .timeout(Duration::from_secs(HTTP_TIMEOUT_SECONDS))
        .build()
        .map_err(|_| ())
}

fn validate_member(client: &Client, access_token: &str) -> LinkedInConnectResponse {
    let response = match client
        .get(LINKEDIN_PROFILE_URL)
        .bearer_auth(access_token)
        .header("X-Restli-Protocol-Version", RESTLI_PROTOCOL_VERSION)
        .send()
    {
        Ok(response) => response,
        Err(_) => {
            return connect_rejected(
                "provider_failure",
                "LinkedIn member validation could not reach the provider.",
            )
        }
    };

    match response.status() {
        StatusCode::OK => match response.json::<LinkedInProfileResponse>() {
            Ok(profile) if !profile.id.trim().is_empty() => connect_success(profile.id.trim()),
            _ => connect_rejected(
                "provider_failure",
                "LinkedIn member validation returned an unusable profile response.",
            ),
        },
        StatusCode::UNAUTHORIZED => {
            connect_rejected("invalid_token", "LinkedIn rejected the access token.")
        }
        StatusCode::FORBIDDEN => connect_rejected(
            "insufficient_scope",
            "LinkedIn authorization does not include the required member profile authority.",
        ),
        StatusCode::TOO_MANY_REQUESTS => {
            connect_rejected("rate_limited", "LinkedIn rate limited member validation.")
        }
        _ => connect_rejected(
            "provider_failure",
            "LinkedIn member validation did not return a successful provider response.",
        ),
    }
}

fn classify_publish_response(status: StatusCode, headers: &HeaderMap) -> LinkedInPublishResponse {
    match status {
        StatusCode::CREATED => match headers
            .get("X-RestLi-Id")
            .and_then(|value| value.to_str().ok())
            .map(str::trim)
            .filter(|value| !value.is_empty())
        {
            Some(publication_id) => publish_success(publication_id),
            None => publish_outcome_unknown(
                "LinkedIn accepted the publication request but did not return definitive publication evidence.",
            ),
        },
        StatusCode::UNAUTHORIZED => {
            publish_reconnect_required("LinkedIn authorization is invalid or expired.")
        }
        StatusCode::TOO_MANY_REQUESTS => {
            publish_rate_limited("LinkedIn rate limited the publication request.")
        }
        status if status.is_client_error() => {
            publish_provider_rejected("LinkedIn rejected the publication request.")
        }
        _ => publish_outcome_unknown(
            "LinkedIn did not return a definitive publication outcome after the request was dispatched.",
        ),
    }
}

fn ugc_text_payload(member_urn: &str, text: &str) -> Value {
    json!({
        "author": member_urn,
        "lifecycleState": "PUBLISHED",
        "specificContent": {
            "com.linkedin.ugc.ShareContent": {
                "shareCommentary": { "text": text },
                "shareMediaCategory": "NONE"
            }
        },
        "visibility": {
            "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
        }
    })
}

fn valid_member_urn(value: &str) -> bool {
    value
        .strip_prefix("urn:li:person:")
        .is_some_and(|member_id| {
            !member_id.trim().is_empty() && !member_id.chars().any(char::is_whitespace)
        })
}

fn connect_success(member_id: &str) -> LinkedInConnectResponse {
    LinkedInConnectResponse {
        kind: "connected",
        member_id: Some(member_id.to_string()),
        member_urn: Some(format!("urn:li:person:{member_id}")),
        failure_class: None,
        detail: None,
    }
}

fn connect_rejected(failure_class: &'static str, detail: &'static str) -> LinkedInConnectResponse {
    LinkedInConnectResponse {
        kind: "rejected",
        member_id: None,
        member_urn: None,
        failure_class: Some(failure_class),
        detail: Some(detail),
    }
}

fn publish_success(publication_id: &str) -> LinkedInPublishResponse {
    LinkedInPublishResponse {
        kind: "published",
        publication_id: Some(publication_id.to_string()),
        provider_response_id: Some(publication_id.to_string()),
        detail: None,
    }
}

fn publish_rate_limited(detail: &'static str) -> LinkedInPublishResponse {
    LinkedInPublishResponse {
        kind: "rate_limited",
        publication_id: None,
        provider_response_id: None,
        detail: Some(detail),
    }
}

fn publish_reconnect_required(detail: &'static str) -> LinkedInPublishResponse {
    LinkedInPublishResponse {
        kind: "reconnect_required",
        publication_id: None,
        provider_response_id: None,
        detail: Some(detail),
    }
}

fn publish_local_unavailable(detail: &'static str) -> LinkedInPublishResponse {
    LinkedInPublishResponse {
        kind: "local_unavailable",
        publication_id: None,
        provider_response_id: None,
        detail: Some(detail),
    }
}

fn publish_provider_rejected(detail: &'static str) -> LinkedInPublishResponse {
    LinkedInPublishResponse {
        kind: "provider_rejected",
        publication_id: None,
        provider_response_id: None,
        detail: Some(detail),
    }
}

fn publish_outcome_unknown(detail: &'static str) -> LinkedInPublishResponse {
    LinkedInPublishResponse {
        kind: "outcome_unknown",
        publication_id: None,
        provider_response_id: None,
        detail: Some(detail),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use reqwest::header::HeaderValue;

    #[test]
    fn successful_member_identity_is_non_secret_and_stable() {
        assert_eq!(
            connect_success("abc123"),
            LinkedInConnectResponse {
                kind: "connected",
                member_id: Some("abc123".into()),
                member_urn: Some("urn:li:person:abc123".into()),
                failure_class: None,
                detail: None,
            }
        );
    }

    #[test]
    fn member_urn_validation_rejects_empty_or_whitespace_authority() {
        assert!(valid_member_urn("urn:li:person:abc123"));
        assert!(!valid_member_urn("urn:li:person:"));
        assert!(!valid_member_urn("urn:li:person:a b"));
        assert!(!valid_member_urn("urn:li:organization:123"));
    }

    #[test]
    fn ugc_payload_is_text_only_public_member_content() {
        let payload = ugc_text_payload("urn:li:person:abc123", "Approved post");
        assert_eq!(payload["author"], "urn:li:person:abc123");
        assert_eq!(payload["lifecycleState"], "PUBLISHED");
        assert_eq!(
            payload["specificContent"]["com.linkedin.ugc.ShareContent"]["shareCommentary"]["text"],
            "Approved post"
        );
        assert_eq!(
            payload["specificContent"]["com.linkedin.ugc.ShareContent"]["shareMediaCategory"],
            "NONE"
        );
        assert_eq!(
            payload["visibility"]["com.linkedin.ugc.MemberNetworkVisibility"],
            "PUBLIC"
        );
    }

    #[test]
    fn created_with_restli_id_is_definitive_provider_evidence() {
        let mut headers = HeaderMap::new();
        headers.insert("X-RestLi-Id", HeaderValue::from_static("urn:li:ugcPost:42"));
        assert_eq!(
            classify_publish_response(StatusCode::CREATED, &headers),
            publish_success("urn:li:ugcPost:42")
        );
    }

    #[test]
    fn created_without_provider_receipt_is_outcome_unknown() {
        let response = classify_publish_response(StatusCode::CREATED, &HeaderMap::new());
        assert_eq!(response.kind, "outcome_unknown");
    }

    #[test]
    fn publication_statuses_preserve_retry_and_reconnect_semantics() {
        assert_eq!(
            classify_publish_response(StatusCode::UNAUTHORIZED, &HeaderMap::new()).kind,
            "reconnect_required"
        );
        assert_eq!(
            classify_publish_response(StatusCode::TOO_MANY_REQUESTS, &HeaderMap::new()).kind,
            "rate_limited"
        );
        assert_eq!(
            classify_publish_response(StatusCode::BAD_REQUEST, &HeaderMap::new()).kind,
            "provider_rejected"
        );
        assert_eq!(
            classify_publish_response(StatusCode::INTERNAL_SERVER_ERROR, &HeaderMap::new()).kind,
            "outcome_unknown"
        );
    }

    #[test]
    fn responses_cannot_serialize_secret_material() {
        let response = connect_rejected("invalid_token", "LinkedIn rejected the access token.");
        let serialized = serde_json::to_string(&response).expect("serialize response");
        assert!(!serialized.contains("access_token"));
        assert!(!serialized.contains("Bearer"));
    }
}
