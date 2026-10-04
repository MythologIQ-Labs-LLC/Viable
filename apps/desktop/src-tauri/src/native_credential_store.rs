use crate::credential_store::{
    CredentialCapability, CredentialReference, CredentialStore, CredentialStoreError, SecretValue,
};
use keyring_core::{Entry, Error as KeyringError};

#[derive(Debug)]
pub struct NativeCredentialStore;

impl NativeCredentialStore {
    pub fn initialize() -> Result<Self, CredentialStoreError> {
        initialize_platform_store()?;
        Ok(Self)
    }

    fn entry(reference: &CredentialReference) -> Result<Entry, CredentialStoreError> {
        let (provider, connection, kind) = reference.parts();
        let service = format!("com.mythologiq.viable.{provider}.{kind}");
        Entry::new(&service, connection).map_err(map_keyring_error)
    }
}

impl CredentialStore for NativeCredentialStore {
    fn capability(&self) -> CredentialCapability {
        CredentialCapability::Available
    }

    fn put_secret(
        &self,
        reference: &CredentialReference,
        secret: &SecretValue,
    ) -> Result<(), CredentialStoreError> {
        Self::entry(reference)?
            .set_secret(secret.expose())
            .map_err(map_keyring_error)
    }

    fn get_secret(
        &self,
        reference: &CredentialReference,
    ) -> Result<SecretValue, CredentialStoreError> {
        Self::entry(reference)?
            .get_secret()
            .map(SecretValue::new)
            .map_err(map_keyring_error)
    }

    fn delete_secret(&self, reference: &CredentialReference) -> Result<(), CredentialStoreError> {
        Self::entry(reference)?
            .delete_credential()
            .map_err(map_keyring_error)
    }
}

impl Drop for NativeCredentialStore {
    fn drop(&mut self) {
        keyring_core::unset_default_store();
    }
}

#[cfg(target_os = "linux")]
fn initialize_platform_store() -> Result<(), CredentialStoreError> {
    let store = zbus_secret_service_keyring_store::Store::new().map_err(map_keyring_error)?;
    keyring_core::set_default_store(store);
    Ok(())
}

#[cfg(target_os = "windows")]
fn initialize_platform_store() -> Result<(), CredentialStoreError> {
    let store = windows_native_keyring_store::Store::new().map_err(map_keyring_error)?;
    keyring_core::set_default_store(store);
    Ok(())
}

#[cfg(not(any(target_os = "linux", target_os = "windows")))]
fn initialize_platform_store() -> Result<(), CredentialStoreError> {
    Err(CredentialStoreError::Unsupported)
}

fn map_keyring_error(error: KeyringError) -> CredentialStoreError {
    match error {
        KeyringError::NoEntry => CredentialStoreError::Missing,
        KeyringError::NoStorageAccess(_) => CredentialStoreError::Inaccessible,
        KeyringError::NoDefaultStore | KeyringError::NotSupportedByStore(_) => {
            CredentialStoreError::Unsupported
        }
        KeyringError::PlatformFailure(_) => classified_failure("platform_failure"),
        KeyringError::BadEncoding(_) => classified_failure("bad_encoding"),
        KeyringError::BadDataFormat(_, _) => classified_failure("bad_data_format"),
        KeyringError::BadStoreFormat(_) => classified_failure("bad_store_format"),
        KeyringError::TooLong(_, _) => classified_failure("platform_length_limit"),
        KeyringError::Invalid(_, _) => classified_failure("platform_invalid_value"),
        KeyringError::Ambiguous(_) => classified_failure("ambiguous_credential"),
        _ => classified_failure("unknown_secure_store_error"),
    }
}

fn classified_failure(classification: &str) -> CredentialStoreError {
    CredentialStoreError::PlatformFailure(classification.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn keyring_error_mapping_never_serializes_platform_error_details() {
        let no_entry = map_keyring_error(KeyringError::NoEntry);
        assert_eq!(no_entry, CredentialStoreError::Missing);

        let unsupported = map_keyring_error(KeyringError::NoDefaultStore);
        assert_eq!(unsupported, CredentialStoreError::Unsupported);

        let invalid = map_keyring_error(KeyringError::Invalid(
            "password".into(),
            "contains-sensitive-provider-detail".into(),
        ));
        assert_eq!(
            invalid,
            CredentialStoreError::PlatformFailure("platform_invalid_value".into())
        );
        assert!(!invalid.to_string().contains("contains-sensitive-provider-detail"));
    }
}
