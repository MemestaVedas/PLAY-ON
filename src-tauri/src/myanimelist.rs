// MyAnimeList API v2 Integration
// OAuth2 with PKCE + REST API for anime/manga tracking

use serde::{Deserialize, Serialize};

/// MyAnimeList API base URL
const MAL_API_URL: &str = "https://api.myanimelist.net/v2";
const MAL_AUTH_URL: &str = "https://myanimelist.net/v1/oauth2";

// ============================================================================
// DATA STRUCTURES
// ============================================================================

/// Token response from MAL OAuth
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MalTokenResponse {
    pub access_token: String,
    pub refresh_token: String,
    pub token_type: String,
    pub expires_in: i64,
}

/// MAL User profile
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MalUser {
    pub id: i64,
    pub name: String,
    #[serde(default)]
    pub picture: Option<String>,
}

/// MAL Anime/Manga item in search results
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MalMediaNode {
    pub id: i64,
    pub title: String,
    #[serde(default)]
    pub main_picture: Option<MalPicture>,
    #[serde(default)]
    pub num_episodes: Option<i32>,
    #[serde(default)]
    pub num_chapters: Option<i32>,
    #[serde(default)]
    pub status: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MalPicture {
    pub medium: Option<String>,
    pub large: Option<String>,
}

/// Wrapper for search results
#[derive(Debug, Deserialize)]
struct MalSearchResponse {
    data: Vec<MalSearchNode>,
}

#[derive(Debug, Deserialize)]
struct MalSearchNode {
    node: MalMediaNode,
}

/// List status for anime
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MalAnimeListStatus {
    pub status: Option<String>,
    pub score: Option<i32>,
    pub num_episodes_watched: Option<i32>,
    pub is_rewatching: Option<bool>,
}

/// List status for manga
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MalMangaListStatus {
    pub status: Option<String>,
    pub score: Option<i32>,
    pub num_chapters_read: Option<i32>,
    pub num_volumes_read: Option<i32>,
    pub is_rereading: Option<bool>,
}

/// Response when updating list entry
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MalListUpdateResponse {
    pub status: String,
    #[serde(default)]
    pub score: i32,
    #[serde(default)]
    pub num_episodes_watched: Option<i32>,
    #[serde(default)]
    pub num_chapters_read: Option<i32>,
}

// ============================================================================
// OAUTH2 + PKCE FUNCTIONS
// ============================================================================

/// Generate PKCE code verifier (random 43-128 character string)
/// Using only alphanumeric characters to avoid encoding issues with MAL
pub fn generate_code_verifier() -> String {
    use rand::Rng;
    use std::iter;

    // Use only alphanumeric chars to avoid any encoding issues with MAL
    const CHARSET: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let mut rng = rand::thread_rng();

    iter::repeat_with(|| CHARSET[rng.gen_range(0..CHARSET.len())] as char)
        .take(128) // Use max length for better security
        .collect()
}

/// Generate PKCE code challenge from verifier (plain method - MAL uses plain, not S256)
pub fn generate_code_challenge(verifier: &str) -> String {
    // MAL uses "plain" method, so challenge == verifier
    verifier.to_string()
}

/// Start a localhost server and wait for OAuth callback
/// Returns the authorization code from the callback
pub async fn start_oauth_callback_server(port: u16) -> Result<String, String> {
    use tokio::io::{AsyncReadExt, AsyncWriteExt};
    use tokio::net::TcpListener;

    let listener = TcpListener::bind(format!("127.0.0.1:{}", port))
        .await
        .map_err(|e| format!("Failed to bind to port {}: {}", port, e))?;

    println!("[MAL] OAuth callback server listening on port {}", port);

    // Accept one connection
    let (mut socket, _) = listener
        .accept()
        .await
        .map_err(|e| format!("Failed to accept connection: {}", e))?;

    let mut buffer = [0; 2048];
    let size = socket
        .read(&mut buffer)
        .await
        .map_err(|e| format!("Failed to read request: {}", e))?;

    let request = String::from_utf8_lossy(&buffer[..size]);
    println!("[MAL] Received callback request");

    // Parse the GET request to extract code
    if let Some(code) = extract_code_from_request(&request) {
        // Send success response
        let response = "HTTP/1.1 200 OK\r\n\
            Content-Type: text/html; charset=utf-8\r\n\
            Connection: close\r\n\r\n\
            <!DOCTYPE html><html><head><meta charset=\"utf-8\"></head>\
            <body style='font-family: -apple-system, sans-serif; text-align: center; padding: 50px; background: #1a1a2e; color: white;'>\
            <h1 style='color: #4ade80;'>✓ Login Successful!</h1>\
            <p>You can close this window and return to PLAY-ON.</p>\
            </body></html>";

        let _ = socket.write_all(response.as_bytes()).await;
        let _ = socket.flush().await;

        return Ok(code);
    }

    // Send error response
    let response = "HTTP/1.1 400 Bad Request\r\n\
        Content-Type: text/html\r\n\
        Connection: close\r\n\r\n\
        <html><body><h1>Error</h1><p>No authorization code received.</p></body></html>";

    let _ = socket.write_all(response.as_bytes()).await;
    let _ = socket.flush().await;

    Err("No authorization code in request".to_string())
}

/// Extract authorization code from HTTP GET request
fn extract_code_from_request(request: &str) -> Option<String> {
    // Find the query string in the request
    let first_line = request.lines().next()?;

    // Parse: GET /?code=xxx&state=yyy HTTP/1.1
    let path = first_line.split_whitespace().nth(1)?;

    // Parse query parameters
    if let Some(query_start) = path.find('?') {
        let query = &path[query_start + 1..];
        for param in query.split('&') {
            if let Some((key, value)) = param.split_once('=') {
                if key == "code" {
                    return Some(urlencoding::decode(value).ok()?.into_owned());
                }
            }
        }
    }

    None
}

/// Exchange authorization code for tokens using PKCE
pub async fn exchange_code_for_token(
    code: String,
    client_id: String,
    code_verifier: String,
    redirect_uri: String,
) -> Result<MalTokenResponse, String> {
    let client = reqwest::Client::new();

    println!("[MAL] === Token Exchange Debug ===");
    println!("[MAL] Client ID: {}", client_id);
    println!("[MAL] Code: {}...", &code[..20.min(code.len())]);
    println!(
        "[MAL] Code verifier: {}...",
        &code_verifier[..20.min(code_verifier.len())]
    );
    println!("[MAL] Code verifier length: {}", code_verifier.len());
    println!("[MAL] Redirect URI: {}", redirect_uri);

    // Use reqwest's form encoding
    let params = [
        ("client_id", client_id.as_str()),
        ("grant_type", "authorization_code"),
        ("code", code.as_str()),
        ("code_verifier", code_verifier.as_str()),
        ("redirect_uri", redirect_uri.as_str()),
    ];

    let url = format!("{}/token", MAL_AUTH_URL);
    println!("[MAL] Token URL: {}", url);

    let response = client
        .post(&url)
        .form(&params)
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    println!("[MAL] Token response status: {}", response.status());

    if !response.status().is_success() {
        let error_text = response.text().await.unwrap_or_default();
        println!("[MAL] Token exchange error: {}", error_text);
        return Err(format!("Token exchange failed: {}", error_text));
    }

    let token_data: MalTokenResponse = response
        .json()
        .await
        .map_err(|e| format!("Parse error: {}", e))?;

    println!("[MAL] Token exchange successful!");
    Ok(token_data)
}

/// Refresh an expired access token
pub async fn refresh_token(
    refresh_token: String,
    client_id: String,
) -> Result<MalTokenResponse, String> {
    let client = reqwest::Client::new();

    let params = [
        ("client_id", client_id.as_str()),
        ("grant_type", "refresh_token"),
        ("refresh_token", refresh_token.as_str()),
    ];

    let response = client
        .post(format!("{}/token", MAL_AUTH_URL))
        .form(&params)
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    if !response.status().is_success() {
        let error_text = response.text().await.unwrap_or_default();
        return Err(format!("Token refresh failed: {}", error_text));
    }

    let token_data: MalTokenResponse = response
        .json()
        .await
        .map_err(|e| format!("Parse error: {}", e))?;

    Ok(token_data)
}

// ============================================================================
// USER API
// ============================================================================

/// Get authenticated user's profile
pub async fn get_user_info(access_token: &str) -> Result<MalUser, String> {
    let client = reqwest::Client::new();

    let response = client
        .get(format!("{}/users/@me", MAL_API_URL))
        .header("Authorization", format!("Bearer {}", access_token))
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    if !response.status().is_success() {
        let error_text = response.text().await.unwrap_or_default();
        return Err(format!("Failed to get user info: {}", error_text));
    }

    let user: MalUser = response
        .json()
        .await
        .map_err(|e| format!("Parse error: {}", e))?;

    Ok(user)
}

// ============================================================================
// SEARCH API
// ============================================================================

/// Search for anime by title
pub async fn search_anime(
    access_token: &str,
    query: &str,
    limit: i32,
) -> Result<Vec<MalMediaNode>, String> {
    let client = reqwest::Client::new();

    let response = client
        .get(format!("{}/anime", MAL_API_URL))
        .header("Authorization", format!("Bearer {}", access_token))
        .query(&[
            ("q", query),
            ("limit", &limit.to_string()),
            ("fields", "id,title,main_picture,num_episodes,status"),
        ])
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    if !response.status().is_success() {
        let error_text = response.text().await.unwrap_or_default();
        return Err(format!("Search failed: {}", error_text));
    }

    let search_response: MalSearchResponse = response
        .json()
        .await
        .map_err(|e| format!("Parse error: {}", e))?;

    Ok(search_response.data.into_iter().map(|n| n.node).collect())
}

/// Search for manga by title
pub async fn search_manga(
    access_token: &str,
    query: &str,
    limit: i32,
) -> Result<Vec<MalMediaNode>, String> {
    let client = reqwest::Client::new();

    let response = client
        .get(format!("{}/manga", MAL_API_URL))
        .header("Authorization", format!("Bearer {}", access_token))
        .query(&[
            ("q", query),
            ("limit", &limit.to_string()),
            ("fields", "id,title,main_picture,num_chapters,status"),
        ])
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    if !response.status().is_success() {
        let error_text = response.text().await.unwrap_or_default();
        return Err(format!("Search failed: {}", error_text));
    }

    let search_response: MalSearchResponse = response
        .json()
        .await
        .map_err(|e| format!("Parse error: {}", e))?;

    Ok(search_response.data.into_iter().map(|n| n.node).collect())
}

// ============================================================================
// LIST UPDATE API
// ============================================================================

/// Update anime progress on MAL
///
/// # Arguments
/// * `access_token` - OAuth access token
/// * `anime_id` - MAL anime ID
/// * `episodes_watched` - Number of episodes watched
/// * `status` - Optional status (watching, completed, on_hold, dropped, plan_to_watch)
pub async fn update_anime_progress(
    access_token: &str,
    anime_id: i64,
    episodes_watched: i32,
    status: Option<&str>,
) -> Result<MalListUpdateResponse, String> {
    let client = reqwest::Client::new();

    let mut params = vec![("num_watched_episodes", episodes_watched.to_string())];

    if let Some(s) = status {
        params.push(("status", s.to_string()));
    }

    let response = client
        .patch(format!("{}/anime/{}/my_list_status", MAL_API_URL, anime_id))
        .header("Authorization", format!("Bearer {}", access_token))
        .form(&params)
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    if !response.status().is_success() {
        let error_text = response.text().await.unwrap_or_default();
        return Err(format!("Update failed: {}", error_text));
    }

    let update_response: MalListUpdateResponse = response
        .json()
        .await
        .map_err(|e| format!("Parse error: {}", e))?;

    Ok(update_response)
}

/// Update manga progress on MAL
///
/// # Arguments
/// * `access_token` - OAuth access token
/// * `manga_id` - MAL manga ID
/// * `chapters_read` - Number of chapters read
/// * `status` - Optional status (reading, completed, on_hold, dropped, plan_to_read)
pub async fn update_manga_progress(
    access_token: &str,
    manga_id: i64,
    chapters_read: i32,
    status: Option<&str>,
) -> Result<MalListUpdateResponse, String> {
    let client = reqwest::Client::new();

    let mut params = vec![("num_chapters_read", chapters_read.to_string())];

    if let Some(s) = status {
        params.push(("status", s.to_string()));
    }

    let response = client
        .patch(format!("{}/manga/{}/my_list_status", MAL_API_URL, manga_id))
        .header("Authorization", format!("Bearer {}", access_token))
        .form(&params)
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    if !response.status().is_success() {
        let error_text = response.text().await.unwrap_or_default();
        return Err(format!("Update failed: {}", error_text));
    }

    let update_response: MalListUpdateResponse = response
        .json()
        .await
        .map_err(|e| format!("Parse error: {}", e))?;

    Ok(update_response)
}

// ============================================================================
// LIST FETCH API
// ============================================================================

/// Response for user's anime/manga list
#[derive(Debug, Deserialize)]
struct MalListResponse {
    data: Vec<MalListNode>,
}

#[derive(Debug, Deserialize)]
struct MalListNode {
    node: MalMediaNode,
    list_status: serde_json::Value, // Can be anime or manga status
}

/// Anime list entry with status
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MalAnimeListEntry {
    pub anime: MalMediaNode,
    pub status: String,
    pub score: i32,
    pub num_episodes_watched: i32,
}

/// Manga list entry with status
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MalMangaListEntry {
    pub manga: MalMediaNode,
    pub status: String,
    pub score: i32,
    pub num_chapters_read: i32,
}

/// Get user's anime list
///
/// # Arguments
/// * `access_token` - OAuth access token
/// * `status` - Optional filter (watching, completed, on_hold, dropped, plan_to_watch)
/// * `limit` - Max entries to return
pub async fn get_anime_list(
    access_token: &str,
    status: Option<&str>,
    limit: i32,
) -> Result<Vec<MalAnimeListEntry>, String> {
    let client = reqwest::Client::new();

    let mut query_params = vec![
        ("fields", "list_status,num_episodes".to_string()),
        ("limit", limit.to_string()),
    ];

    if let Some(s) = status {
        query_params.push(("status", s.to_string()));
    }

    let response = client
        .get(format!("{}/users/@me/animelist", MAL_API_URL))
        .header("Authorization", format!("Bearer {}", access_token))
        .query(&query_params)
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    if !response.status().is_success() {
        let error_text = response.text().await.unwrap_or_default();
        return Err(format!("Failed to get anime list: {}", error_text));
    }

    let list_response: MalListResponse = response
        .json()
        .await
        .map_err(|e| format!("Parse error: {}", e))?;

    let entries: Vec<MalAnimeListEntry> = list_response
        .data
        .into_iter()
        .map(|item| {
            let status = item
                .list_status
                .get("status")
                .and_then(|v| v.as_str())
                .unwrap_or("unknown")
                .to_string();
            let score = item
                .list_status
                .get("score")
                .and_then(|v| v.as_i64())
                .unwrap_or(0) as i32;
            let eps = item
                .list_status
                .get("num_episodes_watched")
                .and_then(|v| v.as_i64())
                .unwrap_or(0) as i32;

            MalAnimeListEntry {
                anime: item.node,
                status,
                score,
                num_episodes_watched: eps,
            }
        })
        .collect();

    Ok(entries)
}

/// Get user's manga list
///
/// # Arguments
/// * `access_token` - OAuth access token
/// * `status` - Optional filter (reading, completed, on_hold, dropped, plan_to_read)
/// * `limit` - Max entries to return
pub async fn get_manga_list(
    access_token: &str,
    status: Option<&str>,
    limit: i32,
) -> Result<Vec<MalMangaListEntry>, String> {
    let client = reqwest::Client::new();

    let mut query_params = vec![
        ("fields", "list_status,num_chapters".to_string()),
        ("limit", limit.to_string()),
    ];

    if let Some(s) = status {
        query_params.push(("status", s.to_string()));
    }

    let response = client
        .get(format!("{}/users/@me/mangalist", MAL_API_URL))
        .header("Authorization", format!("Bearer {}", access_token))
        .query(&query_params)
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    if !response.status().is_success() {
        let error_text = response.text().await.unwrap_or_default();
        return Err(format!("Failed to get manga list: {}", error_text));
    }

    let list_response: MalListResponse = response
        .json()
        .await
        .map_err(|e| format!("Parse error: {}", e))?;

    let entries: Vec<MalMangaListEntry> = list_response
        .data
        .into_iter()
        .map(|item| {
            let status = item
                .list_status
                .get("status")
                .and_then(|v| v.as_str())
                .unwrap_or("unknown")
                .to_string();
            let score = item
                .list_status
                .get("score")
                .and_then(|v| v.as_i64())
                .unwrap_or(0) as i32;
            let chapters = item
                .list_status
                .get("num_chapters_read")
                .and_then(|v| v.as_i64())
                .unwrap_or(0) as i32;

            MalMangaListEntry {
                manga: item.node,
                status,
                score,
                num_chapters_read: chapters,
            }
        })
        .collect();

    Ok(entries)
}
