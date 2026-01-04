// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/

// Platform-specific window detection modules
#[cfg(windows)]
mod win_name;

#[cfg(target_os = "macos")]
mod mac_name;

// Import the media_player module
mod media_player;
// Import the anilist module
mod anilist;
// Import file system module
mod file_system;
// Import title parser module
mod title_parser;
// Import CBZ reader module
mod cbz_reader;
// Import downloader module
mod downloader;

// Platform-conditional imports for unified interface
#[cfg(windows)]
use win_name as platform_window;

#[cfg(target_os = "macos")]
use mac_name as platform_window;

use tauri::{Emitter, Manager};

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
    let title = match platform_window::get_active_window_title() {
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
    platform_window::get_active_window_title().unwrap_or_else(|| "No active window".to_string())
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
    let title = match platform_window::get_active_window_title() {
        Some(t) => {
            println!("[DEBUG] Active window title: {:?}", t);
            t
        }
        None => {
            println!("[DEBUG] No active window found");
            return "No active window".to_string();
        }
    };

    // Check if it's a media player
    match detect_media_player(&title) {
        Some(player) => {
            println!("[DEBUG] Detected media player: {:?}", player);
            // Return structured info
            format!("{:?}: {}", player, title)
        }
        None => {
            println!("[DEBUG] Not a media player: {}", title);
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

/// Simple in-memory cache for AniList lookups
/// This prevents hammering the API with repeated lookups for the same title
use std::collections::HashMap;
use std::sync::Mutex;
use std::time::{Duration, Instant};

struct CacheEntry {
    anime: Option<anilist::Anime>,
    timestamp: Instant,
}

lazy_static::lazy_static! {
    static ref ANILIST_CACHE: Mutex<HashMap<String, CacheEntry>> = Mutex::new(HashMap::new());
}

const CACHE_DURATION: Duration = Duration::from_secs(300); // 5 minutes

fn get_cached_anime(title: &str) -> Option<Option<anilist::Anime>> {
    let cache = ANILIST_CACHE.lock().ok()?;
    if let Some(entry) = cache.get(title) {
        if entry.timestamp.elapsed() < CACHE_DURATION {
            return Some(entry.anime.clone());
        }
    }
    None
}

fn set_cached_anime(title: String, anime: Option<anilist::Anime>) {
    if let Ok(mut cache) = ANILIST_CACHE.lock() {
        cache.insert(
            title,
            CacheEntry {
                anime,
                timestamp: Instant::now(),
            },
        );
    }
}

/// Tauri command to detect anime from the current media player window
/// Combines: media detection → title parsing → AniList search (with caching)
///
/// # Returns
/// * JSON with detected anime info including parsed title, episode, and matched AniList entry
#[tauri::command]
async fn detect_anime_command() -> Result<String, String> {
    use serde_json::json;

    // Helper function to search with caching
    async fn search_with_cache(title: &str) -> Option<anilist::Anime> {
        // Check cache first
        if let Some(cached) = get_cached_anime(title) {
            println!("[Detection] Cache hit for: {}", title);
            return cached;
        }

        // Not in cache, make API call
        println!("[Detection] Cache miss, searching AniList for: {}", title);
        let result = match anilist::search_anime(title, 1).await {
            Ok(results) => results.into_iter().next(),
            Err(e) => {
                println!("[Detection] AniList search error: {}", e);
                None
            }
        };

        // Cache the result (even if None)
        set_cached_anime(title.to_string(), result.clone());
        result
    }

    // 1. Try active window first
    let active_title = platform_window::get_active_window_title();
    println!("[Detection] Active window title: {:?}", active_title);

    if let Some(ref window_title) = active_title {
        let player_result = media_player::detect_media_player(window_title);
        println!("[Detection] Media player detected: {:?}", player_result);

        if let Some(player) = player_result {
            let parsed = title_parser::parse_window_title(window_title);
            println!(
                "[Detection] Parsed result: title={:?}, episode={:?}",
                parsed.title, parsed.episode
            );

            let anime_match = if let Some(ref title) = parsed.title {
                search_with_cache(title).await
            } else {
                None
            };
            println!("[Detection] AniList match found: {}", anime_match.is_some());

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
    let all_titles = platform_window::get_all_visible_window_titles();
    println!(
        "[Detection] Fallback: searching {} visible windows",
        all_titles.len()
    );
    for (i, title) in all_titles.iter().enumerate() {
        println!("[Detection] Window {}: {:?}", i, title);
    }

    for window_title in all_titles {
        if let Some(player) = media_player::detect_media_player(&window_title) {
            let parsed = title_parser::parse_window_title(&window_title);
            println!(
                "[Detection] Fallback found browser: {:?}, parsed title={:?}, ep={:?}",
                player, parsed.title, parsed.episode
            );

            // Only count as "detected" if we actually parsed a title or episode
            // This avoids catching empty media player windows
            if parsed.title.is_some() || parsed.episode.is_some() {
                let anime_match = if let Some(ref title) = parsed.title {
                    search_with_cache(title).await
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

/// Tauri command to download a chapter as CBZ
///
/// # Arguments
/// * `chapter_title` - Title of the chapter (e.g., "Chapter 1")
/// * `manga_title` - Title of the manga
/// * `urls` - List of image URLs to download
/// * `download_dir` - Directory to save the file in
///
/// # Returns
/// * Path to the downloaded CBZ file
#[tauri::command]
async fn download_chapter_command(
    chapter_title: String,
    manga_title: String,
    urls: Vec<String>,
    download_dir: String,
) -> Result<String, String> {
    println!(
        "[Downloader] Received command: {} - {} ({} pages)",
        manga_title,
        chapter_title,
        urls.len()
    );
    println!("[Downloader] Download dir: {}", download_dir);

    let result =
        downloader::download_chapter_to_cbz(chapter_title, manga_title, urls, download_dir).await;

    match &result {
        Ok(path) => println!("[Downloader] Success! CBZ saved to: {}", path),
        Err(e) => println!("[Downloader] Error: {}", e),
    }

    result
}

lazy_static::lazy_static! {
    static ref IMAGE_CACHE: Mutex<HashMap<String, String>> = Mutex::new(HashMap::new());
}

/// Tauri command to download an image and return local file path
/// Used for Windows notifications which require local file paths
///
/// # Arguments
/// * `url` - HTTP URL of the image to download
///
/// # Returns
/// * Local file path to the cached image
#[tauri::command]
async fn download_image_for_notification(url: String) -> Result<String, String> {
    use std::io::Write;
    use std::path::PathBuf;

    // Check cache first
    {
        let cache = IMAGE_CACHE.lock().map_err(|_| "Cache lock error")?;
        if let Some(path) = cache.get(&url) {
            if std::path::Path::new(path).exists() {
                println!("[ImageCache] Cache hit: {}", url);
                return Ok(path.clone());
            }
        }
    }

    println!("[ImageCache] Downloading: {}", url);

    // Create cache directory in temp
    let cache_dir = std::env::temp_dir().join("playon_image_cache");
    std::fs::create_dir_all(&cache_dir)
        .map_err(|e| format!("Failed to create cache dir: {}", e))?;

    // Generate filename from URL hash
    let hash = format!("{:x}", md5_hash(&url));
    let extension = url.split('.').last().unwrap_or("jpg");
    let filename = format!("{}.{}", hash, extension);
    let file_path: PathBuf = cache_dir.join(&filename);

    // Download image
    let response = reqwest::get(&url)
        .await
        .map_err(|e| format!("Download failed: {}", e))?;

    let bytes = response
        .bytes()
        .await
        .map_err(|e| format!("Failed to read response: {}", e))?;

    // Save to file
    let mut file =
        std::fs::File::create(&file_path).map_err(|e| format!("Failed to create file: {}", e))?;
    file.write_all(&bytes)
        .map_err(|e| format!("Failed to write file: {}", e))?;

    let path_str = file_path.to_string_lossy().to_string();

    // Update cache
    {
        let mut cache = IMAGE_CACHE.lock().map_err(|_| "Cache lock error")?;
        cache.insert(url, path_str.clone());
    }

    println!("[ImageCache] Saved to: {}", path_str);
    Ok(path_str)
}

/// Simple hash function for cache keys
fn md5_hash(s: &str) -> u64 {
    use std::collections::hash_map::DefaultHasher;
    use std::hash::{Hash, Hasher};
    let mut hasher = DefaultHasher::new();
    s.hash(&mut hasher);
    hasher.finish()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_drpc::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
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
            progressive_search_command,
            download_image_for_notification,
            download_image_for_notification,
            cbz_reader::get_cbz_info,
            cbz_reader::get_cbz_page,
            cbz_reader::is_valid_cbz,
            download_chapter_command
        ])
        .setup(|_app| {
            // Register deep links at runtime for development mode (Windows/Linux)
            // This is needed because deep links are only registered on install by default
            #[cfg(any(target_os = "linux", windows))]
            {
                use tauri_plugin_deep_link::DeepLinkExt;
                app.deep_link().register_all()?;
            }
            Ok(())
        })
        .register_uri_scheme_protocol("manga", |_app, request| {
            let url = request.uri().to_string();
            // Format: manga://localhost/path/to/file.cbz/page.jpg
            // The path might be URL encoded, so we need to decode it.

            // Typical URL: manga://localhost/E%3A%2FBooks%2FManga.cbz/001.jpg

            // 1. Strip scheme and host
            let path_and_query = url.replace("manga://localhost/", "");

            // 2. Split into file path and page name
            // The last slash separates the file path from the page name?
            // NO, the user might have slashes in the page name (subfolders in zip).
            // BUT, our frontend encodes the file path as a single segment.

            // Let's assume the frontend sends: manga://localhost/<encoded_file_path>/<encoded_page_name>

            let segments: Vec<&str> = path_and_query.split('/').collect();
            if segments.len() < 2 {
                return tauri::http::Response::builder()
                    .status(400)
                    .body(Vec::new())
                    .unwrap();
            }

            let encoded_path = segments[0];
            // The rest is the page name (might handle subfolders later, but for now assuming flattened or encoded)
            let encoded_page = segments[1..].join("/");

            let decoded_path = match urlencoding::decode(encoded_path) {
                Ok(p) => p.to_string(),
                Err(_) => {
                    return tauri::http::Response::builder()
                        .status(400)
                        .body(Vec::new())
                        .unwrap()
                }
            };

            let decoded_page = match urlencoding::decode(&encoded_page) {
                Ok(p) => p.to_string(),
                Err(_) => {
                    return tauri::http::Response::builder()
                        .status(400)
                        .body(Vec::new())
                        .unwrap()
                }
            };

            match cbz_reader::read_cbz_page_bytes(&decoded_path, &decoded_page) {
                Ok((bytes, mime)) => tauri::http::Response::builder()
                    .header("Content-Type", mime)
                    .header("Access-Control-Allow-Origin", "*")
                    .body(bytes)
                    .unwrap(),
                Err(e) => {
                    eprintln!("Manga protocol error: {}", e);
                    tauri::http::Response::builder()
                        .status(404)
                        .body(Vec::new())
                        .unwrap()
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
