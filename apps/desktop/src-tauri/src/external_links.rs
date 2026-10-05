use std::process::{Command, Stdio};

// The webview never receives arbitrary URLs to open. It names one of these
// fixed destinations and the native side hands the constant URL to the
// operating system's default browser, so provider sign-in never happens inside
// an embedded Viable webview.
const LINKEDIN_DEVELOPER_APPS_URL: &str = "https://www.linkedin.com/developers/apps";
const LINKEDIN_TOKEN_GENERATOR_URL: &str =
    "https://www.linkedin.com/developers/tools/oauth/token-generator";

fn allowlisted_url(destination: &str) -> Option<&'static str> {
    match destination {
        "linkedin_developer_apps" => Some(LINKEDIN_DEVELOPER_APPS_URL),
        "linkedin_token_generator" => Some(LINKEDIN_TOKEN_GENERATOR_URL),
        _ => None,
    }
}

#[tauri::command(async)]
pub fn open_external_destination(destination: String) -> Result<(), String> {
    let url = allowlisted_url(&destination)
        .ok_or_else(|| "External destination is not allowlisted.".to_string())?;
    system_browser_command(url)
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .map(|_| ())
        .map_err(|_| "The system browser could not be opened.".to_string())
}

#[cfg(target_os = "windows")]
fn system_browser_command(url: &str) -> Command {
    // rundll32 receives the URL as a single argument; no command shell parses it.
    let mut command = Command::new("rundll32");
    command.args(["url.dll,FileProtocolHandler", url]);
    command
}

#[cfg(target_os = "macos")]
fn system_browser_command(url: &str) -> Command {
    let mut command = Command::new("open");
    command.arg(url);
    command
}

#[cfg(not(any(target_os = "windows", target_os = "macos")))]
fn system_browser_command(url: &str) -> Command {
    let mut command = Command::new("xdg-open");
    command.arg(url);
    command
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn only_named_https_linkedin_destinations_are_allowlisted() {
        for destination in ["linkedin_developer_apps", "linkedin_token_generator"] {
            let url = allowlisted_url(destination).expect("allowlisted destination");
            assert!(url.starts_with("https://www.linkedin.com/developers/"));
        }
        assert_eq!(
            allowlisted_url("https://www.linkedin.com/developers/apps"),
            None
        );
        assert_eq!(allowlisted_url("file:///etc/passwd"), None);
        assert_eq!(allowlisted_url(""), None);
    }
}
