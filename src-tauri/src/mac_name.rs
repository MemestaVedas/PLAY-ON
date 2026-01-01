//! macOS Window Detection Module
//!
//! PURPOSE: Detect window titles on macOS using AppleScript
//! Provides the same interface as win_name.rs for cross-platform compatibility
//!
//! NOTE: Requires Accessibility permissions for full functionality
#![cfg(target_os = "macos")]

use std::process::Command;

/// Get the title of the currently active/frontmost window on macOS
///
/// Uses AppleScript to query System Events for the frontmost application's
/// active window title.
///
/// # Returns
/// * `Some(String)` - The window title if successfully retrieved
/// * `None` - If no window is active or an error occurred
pub fn get_active_window_title() -> Option<String> {
    // AppleScript to get the frontmost window's name
    let script = r#"
        tell application "System Events"
            set frontApp to first application process whose frontmost is true
            try
                set frontWindow to first window of frontApp
                return name of frontWindow
            on error
                return name of frontApp
            end try
        end tell
    "#;

    let output = Command::new("osascript")
        .arg("-e")
        .arg(script)
        .output()
        .ok()?;

    if output.status.success() {
        let title = String::from_utf8_lossy(&output.stdout)
            .trim()
            .to_string();
        if title.is_empty() {
            None
        } else {
            Some(title)
        }
    } else {
        None
    }
}

/// Get titles of all visible windows from common media players
///
/// Queries each known media player application for their window titles.
/// This is used as a fallback when the active window isn't a media player.
///
/// # Returns
/// * `Vec<String>` - List of window titles from media player applications
pub fn get_all_visible_window_titles() -> Vec<String> {
    let mut titles = Vec::new();
    
    // List of common media players on macOS
    let media_players = [
        "VLC",
        "IINA",
        "mpv",
        "QuickTime Player",
        "Elmedia Player",
        "Infuse",
    ];

    for player in &media_players {
        if let Some(window_titles) = get_app_window_titles(player) {
            titles.extend(window_titles);
        }
    }

    titles
}

/// Get window titles for a specific application
///
/// # Arguments
/// * `app_name` - The name of the application to query
///
/// # Returns
/// * `Some(Vec<String>)` - List of window titles for the application
/// * `None` - If the application isn't running or an error occurred
fn get_app_window_titles(app_name: &str) -> Option<Vec<String>> {
    // AppleScript to get all window names from a specific application
    let script = format!(r#"
        tell application "System Events"
            if exists (process "{}") then
                tell process "{}"
                    set windowNames to {{}}
                    repeat with w in windows
                        set end of windowNames to name of w
                    end repeat
                    return windowNames
                end tell
            end if
        end tell
    "#, app_name, app_name);

    let output = Command::new("osascript")
        .arg("-e")
        .arg(&script)
        .output()
        .ok()?;

    if output.status.success() {
        let raw_output = String::from_utf8_lossy(&output.stdout)
            .trim()
            .to_string();
        
        // Parse AppleScript list output (e.g., "title1, title2, title3")
        if raw_output.is_empty() {
            return None;
        }
        
        let titles: Vec<String> = raw_output
            .split(", ")
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty())
            .collect();
        
        if titles.is_empty() {
            None
        } else {
            Some(titles)
        }
    } else {
        None
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_active_window_returns_result() {
        // This test just verifies the function doesn't panic
        // Actual return value depends on system state
        let _result = get_active_window_title();
    }

    #[test]
    fn test_get_all_visible_windows() {
        // This test just verifies the function doesn't panic
        let titles = get_all_visible_window_titles();
        // Should return empty vec if no media players are running
        assert!(titles.len() >= 0);
    }
}
