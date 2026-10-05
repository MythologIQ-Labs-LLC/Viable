use std::fmt;

const REFERENCE_PREFIX: &str = "viable://credential/";

#[derive(Clone, PartialEq, Eq, Hash)]
pub struct CredentialReference(String);

impl CredentialReference {
    pub fn parse(value: impl Into<String>) -> Result<Self, CredentialStoreError> {
        let value = value.into();
        let suffix = value.strip_prefix(REFERENCE_PREFIX).ok_or_else(|| {
            CredentialStoreError::InvalidReference(
                "credential reference must use viable://credential/".into(),
            )
        })?;

        let segments: Vec<&str> = suffix.split('/').collect();
        if segments.len() != 3 || segments.iter().any(|segment| !valid_segment(segment)) {
            return Err(CredentialStoreError::InvalidReference(
                "credential reference must contain provider, connection, and kind segments".into(),
            ));
        }

        Ok(Self(value))
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }

    pub(crate) fn parts(&self) -> (&str, &str, &str) {
        let suffix = self
            .0
            .strip_prefix(REFERENCE_PREFIX)
            .expect("validated credential reference lost its prefix");
        let mut segments = suffix.split('/');
        let provider = segments
            .next()
            .expect("validated credential reference lost provider segment");
        let connection = segments
            .next()
            .expect("validated credential reference lost connection segment");
        let kind = segments
            .next()
            .expect("validated credential reference lost kind segment");
        (provider, connection, kind)
    }
}

impl fmt::Debug for CredentialReference {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.debug_tuple("CredentialReference").field(&self.0).finish()
    }
}

#[derive(Clone, PartialEq, Eq)]
pub struct SecretValue(Vec<u8>);

impl SecretValue {
    pub fn new(value: impl Into<Vec<u8>>) -> Self {
        Self(value.into())
    }

    pub fn expose(&self) -> &[u8] {
        &self.0
    }
}

impl fmt::Debug for SecretValue {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str("SecretValue([REDACTED])")
    }
}

impl Drop for SecretValue {
    fn drop(&mut self) {
        self.0.fill(0);
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CredentialCapability {
    Available,
    Inaccessible,
    Unsupported,
    PlatformFailure,
}

impl CredentialCapability {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Available => "available",
            Self::Inaccessible => "inaccessible",
            Self::Unsupported => "unsupported",
            Self::PlatformFailure => "platform_failure",
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum CredentialStoreError {
    Missing,
    Inaccessible,
    Unsupported,
    PlatformFailure(String),
    InvalidReference(String),
}

impl CredentialStoreError {
    pub fn capability(&self) -> CredentialCapability {
        match self {
            Self::Inaccessible => CredentialCapability::Inaccessible,
            Self::Unsupported => CredentialCapability::Unsupported,
            Self::PlatformFailure(_) | Self::InvalidReference(_) => {
                CredentialCapability::PlatformFailure
            }
            Self::Missing => CredentialCapability::Available,
        }
    }
}

impl fmt::Display for CredentialStoreError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Missing => f.write_str("credential is missing"),
            Self::Inaccessible => f.write_str("secure credential storage is inaccessible"),
            Self::Unsupported => f.write_str("secure credential storage is unsupported"),
            Self::PlatformFailure(classification) => {
                write!(f, "secure credential storage failed: {classification}")
            }
            Self::InvalidReference(reason) => write!(f, "invalid credential reference: {reason}"),
        }
    }
}

impl std::error::Error for CredentialStoreError {}

pub trait CredentialStore: Send + Sync {
    fn capability(&self) -> CredentialCapability;
    fn put_secret(
        &self,
        reference: &CredentialReference,
        secret: &SecretValue,
    ) -> Result<(), CredentialStoreError>;
    fn get_secret(
        &self,
        reference: &CredentialReference,
    ) -> Result<SecretValue, CredentialStoreError>;
    fn delete_secret(&self, reference: &CredentialReference) -> Result<(), CredentialStoreError>;

    fn has_secret(&self, reference: &CredentialReference) -> Result<bool, CredentialStoreError> {
        match self.get_secret(reference) {
            Ok(_) => Ok(true),
            Err(CredentialStoreError::Missing) => Ok(false),
            Err(error) => Err(error),
        }
    }
}

fn valid_segment(value: &str) -> bool {
    !value.is_empty()
        && value
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'-' | b'_'))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;
    use std::sync::Mutex;

    struct FakeCredentialStore {
        capability: CredentialCapability,
        values: Mutex<HashMap<CredentialReference, SecretValue>>,
        forced_error: Option<CredentialStoreError>,
    }

    impl FakeCredentialStore {
        fn available() -> Self {
            Self {
                capability: CredentialCapability::Available,
                values: Mutex::new(HashMap::new()),
                forced_error: None,
            }
        }

        fn failing(capability: CredentialCapability, error: CredentialStoreError) -> Self {
            Self {
                capability,
                values: Mutex::new(HashMap::new()),
                forced_error: Some(error),
            }
        }

        fn guard_error(&self) -> Result<(), CredentialStoreError> {
            match &self.forced_error {
                Some(error) => Err(error.clone()),
                None => Ok(()),
            }
        }
    }

    impl CredentialStore for FakeCredentialStore {
        fn capability(&self) -> CredentialCapability {
            self.capability
        }

        fn put_secret(
            &self,
            reference: &CredentialReference,
            secret: &SecretValue,
        ) -> Result<(), CredentialStoreError> {
            self.guard_error()?;
            self.values
                .lock()
                .expect("fake credential store mutex poisoned")
                .insert(reference.clone(), secret.clone());
            Ok(())
        }

        fn get_secret(
            &self,
            reference: &CredentialReference,
        ) -> Result<SecretValue, CredentialStoreError> {
            self.guard_error()?;
            self.values
                .lock()
                .expect("fake credential store mutex poisoned")
                .get(reference)
                .cloned()
                .ok_or(CredentialStoreError::Missing)
        }

        fn delete_secret(
            &self,
            reference: &CredentialReference,
        ) -> Result<(), CredentialStoreError> {
            self.guard_error()?;
            self.values
                .lock()
                .expect("fake credential store mutex poisoned")
                .remove(reference)
                .map(|_| ())
                .ok_or(CredentialStoreError::Missing)
        }
    }

    fn reference() -> CredentialReference {
        CredentialReference::parse("viable://credential/linkedin/connection-1/access_token")
            .expect("valid credential reference")
    }

    #[test]
    fn opaque_references_require_three_safe_non_ambiguous_segments() {
        assert!(CredentialReference::parse(
            "viable://credential/linkedin/connection-1/access_token"
        )
        .is_ok());
        assert!(CredentialReference::parse("credential/linkedin/token").is_err());
        assert!(CredentialReference::parse("viable://credential/linkedin/token").is_err());
        assert!(CredentialReference::parse(
            "viable://credential/linkedin/connection 1/access_token"
        )
        .is_err());
        assert!(CredentialReference::parse(
            "viable://credential/linkedin.member/connection-1/access_token"
        )
        .is_err());
        assert!(CredentialReference::parse(
            "viable://credential/linkedin/connection-1/access.token"
        )
        .is_err());
    }

    #[test]
    fn reference_parts_are_stable_and_non_secret() {
        let reference = reference();
        assert_eq!(
            reference.as_str(),
            "viable://credential/linkedin/connection-1/access_token"
        );
        assert_eq!(
            reference.parts(),
            ("linkedin", "connection-1", "access_token")
        );
    }

    #[test]
    fn secret_debug_output_is_always_redacted() {
        let secret = SecretValue::new(b"super-secret-token".to_vec());
        let rendered = format!("{secret:?}");
        assert_eq!(rendered, "SecretValue([REDACTED])");
        assert!(!rendered.contains("super-secret-token"));
    }

    #[test]
    fn available_store_round_trips_and_deletes_without_changing_reference_authority() {
        let store = FakeCredentialStore::available();
        let reference = reference();
        let secret = SecretValue::new(b"token-value".to_vec());

        assert_eq!(store.capability(), CredentialCapability::Available);
        assert!(!store.has_secret(&reference).expect("missing is false"));
        store
            .put_secret(&reference, &secret)
            .expect("fake store accepts secret");
        assert!(store.has_secret(&reference).expect("stored is true"));
        assert_eq!(
            store
                .get_secret(&reference)
                .expect("stored secret")
                .expose(),
            b"token-value"
        );
        store.delete_secret(&reference).expect("delete succeeds");
        assert!(!store.has_secret(&reference).expect("deleted is false"));
    }

    #[test]
    fn inaccessible_store_fails_closed_for_every_secret_operation() {
        let store = FakeCredentialStore::failing(
            CredentialCapability::Inaccessible,
            CredentialStoreError::Inaccessible,
        );
        let reference = reference();
        let secret = SecretValue::new(b"token-value".to_vec());

        assert_eq!(store.capability(), CredentialCapability::Inaccessible);
        assert_eq!(
            store.put_secret(&reference, &secret),
            Err(CredentialStoreError::Inaccessible)
        );
        assert_eq!(
            store.get_secret(&reference),
            Err(CredentialStoreError::Inaccessible)
        );
        assert_eq!(
            store.delete_secret(&reference),
            Err(CredentialStoreError::Inaccessible)
        );
        assert_eq!(
            store.has_secret(&reference),
            Err(CredentialStoreError::Inaccessible)
        );
    }

    #[test]
    fn unsupported_and_platform_failures_remain_distinct_capability_states() {
        let unsupported = FakeCredentialStore::failing(
            CredentialCapability::Unsupported,
            CredentialStoreError::Unsupported,
        );
        let failed = FakeCredentialStore::failing(
            CredentialCapability::PlatformFailure,
            CredentialStoreError::PlatformFailure("native_store_error".into()),
        );

        assert_eq!(unsupported.capability(), CredentialCapability::Unsupported);
        assert_eq!(failed.capability(), CredentialCapability::PlatformFailure);
        assert_eq!(
            unsupported.get_secret(&reference()),
            Err(CredentialStoreError::Unsupported)
        );
        assert_eq!(
            failed.get_secret(&reference()),
            Err(CredentialStoreError::PlatformFailure(
                "native_store_error".into()
            ))
        );
    }
}
