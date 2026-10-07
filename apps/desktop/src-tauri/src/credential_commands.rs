use crate::credential_store::{
    CredentialCapability, CredentialReference, CredentialStore, CredentialStoreError, SecretValue,
};
use crate::native_credential_store::NativeCredentialStore;
use serde::Serialize;
use tauri::State;

pub struct CredentialVaultState {
    store: Option<NativeCredentialStore>,
    capability: CredentialCapability,
}

impl CredentialVaultState {
    pub fn initialize() -> Self {
        match NativeCredentialStore::initialize() {
            Ok(store) => Self {
                store: Some(store),
                capability: CredentialCapability::Available,
            },
            Err(error) => Self {
                store: None,
                capability: error.capability(),
            },
        }
    }

    #[cfg(test)]
    fn unavailable(capability: CredentialCapability) -> Self {
        Self {
            store: None,
            capability,
        }
    }

    pub(crate) fn store(&self) -> Result<&NativeCredentialStore, CredentialStoreError> {
        self.store.as_ref().ok_or_else(|| match self.capability {
            CredentialCapability::Inaccessible => CredentialStoreError::Inaccessible,
            CredentialCapability::Unsupported => CredentialStoreError::Unsupported,
            CredentialCapability::PlatformFailure => {
                CredentialStoreError::PlatformFailure("native_store_unavailable".into())
            }
            CredentialCapability::Available => {
                CredentialStoreError::PlatformFailure("native_store_missing".into())
            }
        })
    }
}

#[derive(Debug, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct CredentialCapabilityResponse {
    status: &'static str,
    can_store_secrets: bool,
}

#[derive(Debug, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct CredentialReferenceResponse {
    reference: String,
    present: bool,
}

#[tauri::command]
pub fn credential_capability(
    state: State<'_, CredentialVaultState>,
) -> CredentialCapabilityResponse {
    capability_response(state.capability)
}

#[tauri::command]
pub fn credential_put(
    reference: String,
    secret: String,
    state: State<'_, CredentialVaultState>,
) -> Result<CredentialReferenceResponse, String> {
    let reference = CredentialReference::parse(reference).map_err(public_error)?;
    let secret = SecretValue::new(secret.into_bytes());
    state
        .store()
        .and_then(|store| store.put_secret(&reference, &secret))
        .map_err(public_error)?;
    Ok(CredentialReferenceResponse {
        reference: reference.as_str().to_string(),
        present: true,
    })
}

#[tauri::command]
pub fn credential_has(
    reference: String,
    state: State<'_, CredentialVaultState>,
) -> Result<CredentialReferenceResponse, String> {
    let reference = CredentialReference::parse(reference).map_err(public_error)?;
    let present = state
        .store()
        .and_then(|store| store.has_secret(&reference))
        .map_err(public_error)?;
    Ok(CredentialReferenceResponse {
        reference: reference.as_str().to_string(),
        present,
    })
}

#[tauri::command]
pub fn credential_delete(
    reference: String,
    state: State<'_, CredentialVaultState>,
) -> Result<CredentialReferenceResponse, String> {
    let reference = CredentialReference::parse(reference).map_err(public_error)?;
    match state
        .store()
        .and_then(|store| store.delete_secret(&reference))
    {
        Ok(()) | Err(CredentialStoreError::Missing) => Ok(CredentialReferenceResponse {
            reference: reference.as_str().to_string(),
            present: false,
        }),
        Err(error) => Err(public_error(error)),
    }
}

fn capability_response(capability: CredentialCapability) -> CredentialCapabilityResponse {
    CredentialCapabilityResponse {
        status: capability.as_str(),
        can_store_secrets: capability == CredentialCapability::Available,
    }
}

fn public_error(error: CredentialStoreError) -> String {
    match error {
        CredentialStoreError::Missing => "credential_missing".into(),
        CredentialStoreError::Inaccessible => "credential_store_inaccessible".into(),
        CredentialStoreError::Unsupported => "credential_store_unsupported".into(),
        CredentialStoreError::PlatformFailure(classification) => {
            format!("credential_store_{classification}")
        }
        CredentialStoreError::InvalidReference(_) => "credential_reference_invalid".into(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn capability_results_are_bounded_and_non_secret() {
        assert_eq!(
            capability_response(CredentialCapability::Available),
            CredentialCapabilityResponse {
                status: "available",
                can_store_secrets: true,
            }
        );
        assert_eq!(
            capability_response(CredentialCapability::Inaccessible),
            CredentialCapabilityResponse {
                status: "inaccessible",
                can_store_secrets: false,
            }
        );
    }

    #[test]
    fn unavailable_state_fails_closed_without_platform_detail() {
        let inaccessible = CredentialVaultState::unavailable(CredentialCapability::Inaccessible);
        assert_eq!(
            inaccessible
                .store()
                .expect_err("store must remain unavailable"),
            CredentialStoreError::Inaccessible
        );

        let failed = CredentialVaultState::unavailable(CredentialCapability::PlatformFailure);
        let error = failed.store().expect_err("store must remain unavailable");
        assert_eq!(
            public_error(error),
            "credential_store_native_store_unavailable"
        );
    }

    #[test]
    fn public_error_contract_discards_invalid_reference_detail() {
        let error = CredentialStoreError::InvalidReference("secret-like input".into());
        assert_eq!(public_error(error), "credential_reference_invalid");
    }
}
