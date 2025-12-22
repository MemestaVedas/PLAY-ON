// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/

// Import the win_name module
mod win_name;
// Import the media_player module
mod media_player;
// Import the anilist module
mod anilist;

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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            get_active_window,
            get_active_media_window,
            search_anime_command,
            get_anime_by_id_command,
            match_anime_from_window_command
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
