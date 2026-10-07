mod credential_commands;
mod credential_store;
mod external_links;
mod linkedin_provider;
mod native_credential_store;

use credential_commands::{
    credential_capability, credential_delete, credential_has, credential_put, CredentialVaultState,
};
use external_links::open_external_destination;
use linkedin_provider::{linkedin_connect_member, linkedin_publish_text};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(CredentialVaultState::initialize())
        .invoke_handler(tauri::generate_handler![
            credential_capability,
            credential_put,
            credential_has,
            credential_delete,
            linkedin_connect_member,
            linkedin_publish_text,
            open_external_destination
        ])
        .run(tauri::generate_context!())
        .expect("error while running Viable");
}
