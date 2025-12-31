// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/

// Import the win_name module
mod win_name;
// Import the media_player module
mod media_player;
// Import the anilist module
mod anilist;
// Import file system module
// Import file system module
mod file_system;
// Import title parser module
mod title_parser;

use tauri::{Emitter, Manager};

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

/// Tauri command to search for anime on AniList
///
/// # Arguments
/// * `query` - Search query (anime title)
/// * `limit` - Maximum number of results (default: 10)
///
/// # Returns
/// * JSON string with array of anime results
#[tauri::command]
async fn search_anime_command(query: String, limit: Option<i32>) -> Result<String, String> {
    let results = anilist::search_anime(&query, limit.unwrap_or(10)).await?;
    serde_json::to_string(&results).map_err(|e| format!("Serialization error: {}", e))
}

/// Tauri command to get anime details by ID
///
/// # Arguments
/// * `id` - AniList anime ID
///
/// # Returns
/// * JSON string with anime details
#[tauri::command]
async fn get_anime_by_id_command(id: i32) -> Result<String, String> {
    let anime = anilist::get_anime_by_id(id).await?;
    serde_json::to_string(&anime).map_err(|e| format!("Serialization error: {}", e))
}

/// Tauri command to match anime from window title
/// This combines media detection with AniList search
///
/// # Returns
/// * JSON string with matched anime or null if no match
#[tauri::command]
async fn match_anime_from_window_command() -> Result<String, String> {
    // Get active window title
    let title = match win_name::get_active_window_title() {
        Some(t) => t,
        None => return Ok("null".to_string()),
    };

    // Check if it's a media player
    if media_player::detect_media_player(&title).is_none() {
        return Ok("null".to_string());
    }

    // Try to match with AniList
    let anime = anilist::match_anime_from_title(&title).await?;
    serde_json::to_string(&anime).map_err(|e| format!("Serialization error: {}", e))
}

/// Tauri command to get the currently active window title
/// Returns the window title as a String, or "No active window" if none found
///
/// NOTE: This returns ALL windows, not just media players
/// Use get_active_media_window for filtered results
#[tauri::command]
fn get_active_window() -> String {
    win_name::get_active_window_title().unwrap_or_else(|| "No active window".to_string())
}

/// Tauri command to get active media player window
/// Returns JSON with player type and title, or "No media playing" if not a media player
///
/// This filters out non-media windows (VS Code, File Explorer, etc.)
/// Only returns data for known media players
#[tauri::command]
fn get_active_media_window() -> String {
    use media_player::detect_media_player;

    // Get active window title
    let title = match win_name::get_active_window_title() {
        Some(t) => t,
        None => return "No active window".to_string(),
    };

    // Check if it's a media player
    match detect_media_player(&title) {
        Some(player) => {
            // Return structured info
            format!("{:?}: {}", player, title)
        }
        None => {
            // Not a media player - ignore
            "No media playing".to_string()
        }
    }
}

#[tauri::command]
async fn exchange_login_code(
    code: String,
    client_id: String,
    client_secret: String,
    redirect_uri: String,
) -> Result<String, String> {
    let token_data =
        anilist::exchange_code_for_token(code, client_id, client_secret, redirect_uri).await?;
    serde_json::to_string(&token_data).map_err(|e| format!("Serialization error: {}", e))
}

/// Tauri command to parse a window title and extract anime info
///
/// # Arguments
/// * `window_title` - The window title to parse
///
/// # Returns
/// * JSON string with parsed title, episode, and season
#[tauri::command]
fn parse_window_title_command(window_title: String) -> String {
    let parsed = title_parser::parse_window_title(&window_title);
    serde_json::to_string(&parsed).unwrap_or_else(|_| "null".to_string())
}

/// Tauri command to detect anime from the current media player window
/// Combines: media detection → title parsing → AniList search
///
/// # Returns
/// * JSON with detected anime info including parsed title, episode, and matched AniList entry
#[tauri::command]
async fn detect_anime_command() -> Result<String, String> {
    use serde_json::json;

    // 1. Try active window first
    let active_title = win_name::get_active_window_title();
    if let Some(ref window_title) = active_title {
        if let Some(player) = media_player::detect_media_player(window_title) {
            let parsed = title_parser::parse_window_title(window_title);
            let anime_match = if let Some(ref title) = parsed.title {
                match anilist::search_anime(title, 1).await {
                    Ok(results) => results.into_iter().next(),
                    Err(_) => None,
                }
            } else {
                None
            };

            return Ok(json!({
                "status": "detected",
                "player": format!("{:?}", player),
                "window_title": window_title,
                "parsed": {
                    "title": parsed.title,
                    "episode": parsed.episode,
                    "season": parsed.season
                },
                "anilist_match": anime_match
            })
            .to_string());
        }
    }

    // 2. If active window isn't a media player, search ALL visible windows
    let all_titles = win_name::get_all_visible_window_titles();
    for window_title in all_titles {
        if let Some(player) = media_player::detect_media_player(&window_title) {
            let parsed = title_parser::parse_window_title(&window_title);

            // Only count as "detected" if we actually parsed a title or episode
            // This avoids catching empty media player windows
            if parsed.title.is_some() || parsed.episode.is_some() {
                let anime_match = if let Some(ref title) = parsed.title {
                    match anilist::search_anime(title, 1).await {
                        Ok(results) => results.into_iter().next(),
                        Err(_) => None,
                    }
                } else {
                    None
                };

                return Ok(json!({
                    "status": "detected",
                    "player": format!("{:?}", player),
                    "window_title": window_title,
                    "parsed": {
                        "title": parsed.title,
                        "episode": parsed.episode,
                        "season": parsed.season
                    },
                    "anilist_match": anime_match
                })
                .to_string());
            }
        }
    }

    // 3. Fallback
    let status = if active_title.is_some() {
        "not_media_player"
    } else {
        "no_window"
    };

    Ok(json!({
        "status": status,
        "window": active_title.unwrap_or_default()
    })
    .to_string())
}

/// Tauri command to update anime progress on AniList
///
/// # Arguments
/// * `access_token` - OAuth access token
/// * `media_id` - AniList media ID
/// * `progress` - Episode number
/// * `status` - Optional status (CURRENT, COMPLETED, etc.)
///
/// # Returns
/// * JSON with updated entry or error
#[tauri::command]
async fn update_anime_progress_command(
    access_token: String,
    media_id: i32,
    progress: i32,
    status: Option<String>,
) -> Result<String, String> {
    let status_ref = status.as_deref();
    let entry =
        anilist::update_media_progress(&access_token, media_id, progress, status_ref).await?;
    serde_json::to_string(&entry).map_err(|e| format!("Serialization error: {}", e))
}

/// Tauri command to search anime progressively (word by word)
/// Uses the parsed title and searches AniList starting with 1 word
///
/// # Arguments
/// * `title` - The parsed anime title to search
///
/// # Returns
/// * JSON with the matched anime title and search info
#[tauri::command]
async fn progressive_search_command(title: String) -> Result<String, String> {
    let result = anilist::progressive_search_anime(&title).await?;
    serde_json::to_string(&result).map_err(|e| format!("Serialization error: {}", e))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| {
            println!("{}, {argv:?}, {_cwd}", app.package_info().name);

            app.emit("single-instance", argv.clone()).unwrap();

            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_focus();

                // Forward deep link URLs to frontend for OAuth handling
                for arg in argv {
                    if arg.starts_with("playon://") {
                        let _ = window.emit("auth-callback", arg);
                    }
                }
            }
        }))
        .invoke_handler(tauri::generate_handler![
            greet,
            get_active_window,
            get_active_media_window,
            search_anime_command,
            get_anime_by_id_command,
            match_anime_from_window_command,
            file_system::get_folder_contents,
            exchange_login_code,
            parse_window_title_command,
            detect_anime_command,
            update_anime_progress_command,
            progressive_search_command
        ])
        .setup(|app| {
            // Register deep links at runtime for development mode (Windows/Linux)
            // This is needed because deep links are only registered on install by default
            #[cfg(any(target_os = "linux", windows))]
            {
                use tauri_plugin_deep_link::DeepLinkExt;
                app.deep_link().register_all()?;
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
