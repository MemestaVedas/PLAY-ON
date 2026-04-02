use rusqlite::{Connection, OptionalExtension, params};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::fs;
use std::path::PathBuf;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

/// AniList API endpoint
const ANILIST_API_URL: &str = "https://graphql.anilist.co";

const SEARCH_CACHE_TTL_SECS: i64 = 60 * 60 * 12; // 12 hours
const DETAIL_CACHE_TTL_SECS: i64 = 60 * 60 * 24; // 24 hours
const PROGRESSIVE_CACHE_TTL_SECS: i64 = 60 * 60 * 24 * 7; // 7 days

fn current_ts_secs() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or(Duration::from_secs(0))
        .as_secs() as i64
}

fn cache_db_path() -> PathBuf {
    #[cfg(target_os = "windows")]
    {
        if let Ok(local_app_data) = std::env::var("LOCALAPPDATA") {
            let dir = PathBuf::from(local_app_data).join("PLAY-ON");
            let _ = fs::create_dir_all(&dir);
            return dir.join("anilist_cache.sqlite3");
        }
    }

    if let Ok(home_dir) = std::env::var("HOME") {
        let dir = PathBuf::from(home_dir).join(".play-on");
        let _ = fs::create_dir_all(&dir);
        return dir.join("anilist_cache.sqlite3");
    }

    std::env::temp_dir().join("playon_anilist_cache.sqlite3")
}

fn open_cache_db() -> Result<Connection, String> {
    let path = cache_db_path();
    let conn = Connection::open(path).map_err(|e| format!("Failed to open cache DB: {}", e))?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS anilist_cache (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            expires_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        )",
        [],
    )
    .map_err(|e| format!("Failed to initialize cache table: {}", e))?;

    Ok(conn)
}

fn normalize_cache_key(key: &str) -> String {
    key.trim().to_lowercase()
}

fn read_cache_json(key: &str, allow_stale: bool) -> Result<Option<String>, String> {
    let normalized_key = normalize_cache_key(key);
    let now = current_ts_secs();
    let conn = open_cache_db()?;

    let row: Option<(String, i64)> = conn
        .query_row(
            "SELECT value, expires_at FROM anilist_cache WHERE key = ?1",
            params![normalized_key],
            |row| Ok((row.get::<_, String>(0)?, row.get::<_, i64>(1)?)),
        )
        .optional()
        .map_err(|e| format!("Failed to read cache: {}", e))?;

    if let Some((value, expires_at)) = row {
        if allow_stale || expires_at >= now {
            return Ok(Some(value));
        }
    }

    Ok(None)
}

fn write_cache_json(key: &str, value: &str, ttl_secs: i64) -> Result<(), String> {
    let normalized_key = normalize_cache_key(key);
    let now = current_ts_secs();
    let expires_at = now + ttl_secs;
    let conn = open_cache_db()?;

    conn.execute(
        "INSERT INTO anilist_cache (key, value, expires_at, updated_at)
         VALUES (?1, ?2, ?3, ?4)
         ON CONFLICT(key) DO UPDATE SET
           value = excluded.value,
           expires_at = excluded.expires_at,
           updated_at = excluded.updated_at",
        params![normalized_key, value, expires_at, now],
    )
    .map_err(|e| format!("Failed to write cache: {}", e))?;

    Ok(())
}

fn cache_get<T: serde::de::DeserializeOwned>(key: &str, allow_stale: bool) -> Result<Option<T>, String> {
    if let Some(value) = read_cache_json(key, allow_stale)? {
        let parsed = serde_json::from_str::<T>(&value)
            .map_err(|e| format!("Failed to decode cache value: {}", e))?;
        return Ok(Some(parsed));
    }

    Ok(None)
}

fn cache_set<T: serde::Serialize>(key: &str, value: &T, ttl_secs: i64) -> Result<(), String> {
    let serialized = serde_json::to_string(value)
        .map_err(|e| format!("Failed to encode cache value: {}", e))?;
    write_cache_json(key, &serialized, ttl_secs)
}

/// Result of a simple title search
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TitleSearchResult {
    pub english: Option<String>,
    pub romaji: Option<String>,
}

/// Result of progressive search with match info
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProgressiveSearchResult {
    pub title: TitleSearchResult,
    pub matched_query: String, // The query that matched
    pub words_used: usize,     // How many words were used
    pub total_words: usize,    // Total words in original title
}

#[derive(Debug, Deserialize)]
struct SimpleTitleResponse {
    #[serde(rename = "Media")]
    media: Option<SimpleTitleMedia>,
}

#[derive(Debug, Deserialize)]
struct SimpleTitleMedia {
    title: TitleSearchResult,
}

/// Search anime title word-by-word, starting with 1 word
///
/// # Arguments
/// * `title` - The parsed anime title to search
///
/// # Returns
/// * `Result<Option<ProgressiveSearchResult>, String>` - Match result or error
///
/// # Strategy
/// 1. Split title into words
/// 2. Search with first word
/// 3. If found, return the result
/// 4. If not, add next word and try again
/// 5. Continue until match found or all words tried
pub async fn progressive_search_anime(
    title: &str,
) -> Result<Option<ProgressiveSearchResult>, String> {
    let normalized_title = title.trim().to_lowercase();
    if normalized_title.is_empty() {
        return Ok(None);
    }

    let cache_key = format!("progressive:{}", normalized_title);
    if let Some(cached) = cache_get::<Option<ProgressiveSearchResult>>(&cache_key, false)? {
        println!("[AniList] Progressive cache hit for: {}", title);
        return Ok(cached);
    }

    let words: Vec<&str> = normalized_title.split_whitespace().collect();
    if words.is_empty() {
        return Ok(None);
    }

    let total_words = words.len();
    let client = reqwest::Client::new();

    // Try progressively more words
    for word_count in 1..=total_words {
        let search_query: String = words[..word_count].join(" ");

        println!(
            "[AniList] Searching with {} word(s): \"{}\"",
            word_count, search_query
        );

        let graphql_query = r#"
            query Title($search: String) {
                Media(search: $search, type: ANIME) {
                    title {
                        english
                        romaji
                    }
                }
            }
        "#;

        let request_body = json!({
            "query": graphql_query,
            "variables": { "search": search_query }
        });

        let response = client
            .post(ANILIST_API_URL)
            .header("Content-Type", "application/json")
            .header("Accept", "application/json")
            .json(&request_body)
            .send()
            .await
            .map_err(|e| format!("Failed to send request: {}", e))?;

        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().await.unwrap_or_default();
            println!("[AniList] Progressive search failed: {} {}", status, body);

            // On API failures (including rate limits), return stale cache if present.
            if let Some(stale) = cache_get::<Option<ProgressiveSearchResult>>(&cache_key, true)? {
                println!("[AniList] Returning stale progressive cache for: {}", title);
                return Ok(stale);
            }

            return Err(format!("AniList progressive search failed: {}", status));
        }

        let anilist_response: AniListResponse<SimpleTitleResponse> = response
            .json()
            .await
            .map_err(|e| format!("Failed to parse response: {}", e))?;

        if let Some(ref media) = anilist_response.data.media {
            let english_lower = media
                .title
                .english
                .as_ref()
                .map(|s| s.to_lowercase())
                .unwrap_or_default();
            let romaji_lower = media
                .title
                .romaji
                .as_ref()
                .map(|s| s.to_lowercase())
                .unwrap_or_default();

            let title_matches = search_query
                .split_whitespace()
                .all(|word| english_lower.contains(word) || romaji_lower.contains(word));

            if title_matches {
                let result = Some(ProgressiveSearchResult {
                    title: media.title.clone(),
                    matched_query: search_query,
                    words_used: word_count,
                    total_words,
                });
                let _ = cache_set(&cache_key, &result, PROGRESSIVE_CACHE_TTL_SECS);
                println!("[AniList] ✓ Valid match cached for: {}", title);
                return Ok(result);
            }
        }
    }

    let no_match: Option<ProgressiveSearchResult> = None;
    let _ = cache_set(&cache_key, &no_match, PROGRESSIVE_CACHE_TTL_SECS);
    println!(
        "[AniList] No valid match found after trying all {} words",
        total_words
    );
    Ok(None)
}

/// Represents an anime from AniList
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Anime {
    pub id: i32,
    pub title: AnimeTitle,
    #[serde(rename = "coverImage")]
    pub cover_image: CoverImage,
    pub episodes: Option<i32>,
    pub status: Option<String>,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnimeTitle {
    pub romaji: Option<String>,
    pub english: Option<String>,
    pub native: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CoverImage {
    pub large: Option<String>,
    pub medium: Option<String>,
}

/// Response wrapper for AniList GraphQL queries
#[derive(Debug, Deserialize)]
struct AniListResponse<T> {
    data: T,
}

#[derive(Debug, Deserialize)]
struct MediaResponse {
    #[serde(rename = "Media")]
    media: Anime,
}

#[derive(Debug, Deserialize)]
struct SearchResponse {
    #[serde(rename = "Page")]
    page: PageData,
}

#[derive(Debug, Deserialize)]
struct PageData {
    media: Vec<Anime>,
}

/// Search for anime by title
///
/// # Arguments
/// * `query` - The search query (anime title)
/// * `limit` - Maximum number of results to return
///
/// # Returns
/// * `Result<Vec<Anime>, String>` - List of matching anime or error message
pub async fn search_anime(query: &str, limit: i32) -> Result<Vec<Anime>, String> {
    let normalized_query = query.trim().to_lowercase();
    if normalized_query.is_empty() {
        return Ok(Vec::new());
    }

    let cache_key = format!("search:{}:{}", normalized_query, limit);
    if let Some(cached) = cache_get::<Vec<Anime>>(&cache_key, false)? {
        println!("[AniList] Search cache hit: '{}'", query);
        return Ok(cached);
    }

    let graphql_query = r#"
        query ($search: String, $perPage: Int) {
            Page(perPage: $perPage) {
                media(search: $search, type: ANIME) {
                    id
                    title {
                        romaji
                        english
                        native
                    }
                    coverImage {
                        large
                        medium
                    }
                    episodes
                    status
                    description
                }
            }
        }
    "#;

    let request_body = json!({
        "query": graphql_query,
        "variables": {
            "search": query,
            "perPage": limit
        }
    });

    let client = reqwest::Client::new();
    let response = client
        .post(ANILIST_API_URL)
        .header("Content-Type", "application/json")
        .header("Accept", "application/json")
        .json(&request_body)
        .send()
        .await
        .map_err(|e| format!("Failed to send request: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        println!("[AniList] Search failed: {} {}", status, body);

        if let Some(stale) = cache_get::<Vec<Anime>>(&cache_key, true)? {
            println!("[AniList] Returning stale search cache: '{}'", query);
            return Ok(stale);
        }

        return Err(format!("AniList search failed: {}", status));
    }

    let anilist_response: AniListResponse<SearchResponse> = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    let results = anilist_response.data.page.media;
    let _ = cache_set(&cache_key, &results, SEARCH_CACHE_TTL_SECS);
    Ok(results)
}

/// Get anime details by ID
///
/// # Arguments
/// * `id` - The AniList anime ID
///
/// # Returns
/// * `Result<Anime, String>` - Anime details or error message
pub async fn get_anime_by_id(id: i32) -> Result<Anime, String> {
    let cache_key = format!("detail:{}", id);
    if let Some(cached) = cache_get::<Anime>(&cache_key, false)? {
        println!("[AniList] Detail cache hit: {}", id);
        return Ok(cached);
    }

    let graphql_query = r#"
        query ($id: Int) {
            Media(id: $id, type: ANIME) {
                id
                title {
                    romaji
                    english
                    native
                }
                coverImage {
                    large
                    medium
                }
                episodes
                status
                description
            }
        }
    "#;

    let request_body = json!({
        "query": graphql_query,
        "variables": { "id": id }
    });

    let client = reqwest::Client::new();
    let response = client
        .post(ANILIST_API_URL)
        .header("Content-Type", "application/json")
        .header("Accept", "application/json")
        .json(&request_body)
        .send()
        .await
        .map_err(|e| format!("Failed to send request: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        println!("[AniList] Detail fetch failed: {} {}", status, body);

        if let Some(stale) = cache_get::<Anime>(&cache_key, true)? {
            println!("[AniList] Returning stale detail cache: {}", id);
            return Ok(stale);
        }

        return Err(format!("AniList detail fetch failed: {}", status));
    }

    let anilist_response: AniListResponse<MediaResponse> = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    let media = anilist_response.data.media;
    let _ = cache_set(&cache_key, &media, DETAIL_CACHE_TTL_SECS);
    Ok(media)
}

/// Search for anime by window title (fuzzy matching)
/// This is useful for matching detected media player titles to AniList entries
///
/// # Arguments
/// * `window_title` - The window title from media player
///
/// # Returns
/// * `Result<Option<Anime>, String>` - Best matching anime or None if no good match
pub async fn match_anime_from_title(window_title: &str) -> Result<Option<Anime>, String> {
    // Clean up the window title (remove common suffixes like "- VLC media player")
    let cleaned_title = window_title
        .split(" - ")
        .next()
        .unwrap_or(window_title)
        .trim();

    // Search for the anime
    let results = search_anime(cleaned_title, 5).await?;

    // Return the first result (best match)
    Ok(results.into_iter().next())
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TokenResponse {
    pub access_token: String,
    pub token_type: String,
    pub expires_in: i32,
    pub refresh_token: Option<String>,
}

/// Exchange Authorization Code for Access Token
pub async fn exchange_code_for_token(
    code: String,
    client_id: String,
    client_secret: String,
    redirect_uri: String,
) -> Result<TokenResponse, String> {
    let client = reqwest::Client::new();
    let params = json!({
        "grant_type": "authorization_code",
        "client_id": client_id,
        "client_secret": client_secret,
        "redirect_uri": redirect_uri,
        "code": code
    });

    let response = client
        .post("https://anilist.co/api/v2/oauth/token")
        .header("Content-Type", "application/json")
        .header("Accept", "application/json")
        .json(&params)
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    if !response.status().is_success() {
        let error_text = response.text().await.unwrap_or_default();
        return Err(format!("Token exchange failed: {}", error_text));
    }

    let token_data: TokenResponse = response
        .json()
        .await
        .map_err(|e| format!("Parse error: {}", e))?;

    Ok(token_data)
}

/// Response from SaveMediaListEntry mutation
#[derive(Debug, Serialize, Deserialize)]
pub struct MediaListEntry {
    pub id: i32,
    pub progress: i32,
    pub status: String,
}

#[derive(Debug, Deserialize)]
struct SaveMediaListResponse {
    #[serde(rename = "SaveMediaListEntry")]
    save_media_list_entry: MediaListEntry,
}

/// Update anime progress on AniList (requires authentication)
///
/// # Arguments
/// * `access_token` - OAuth access token for authentication
/// * `media_id` - AniList media ID
/// * `progress` - Episode number to set as progress
/// * `status` - Optional status (CURRENT, COMPLETED, PAUSED, DROPPED, PLANNING, REPEATING)
///
/// # Returns
/// * `Result<MediaListEntry, String>` - Updated entry or error message
pub async fn update_media_progress(
    access_token: &str,
    media_id: i32,
    progress: i32,
    status: Option<&str>,
) -> Result<MediaListEntry, String> {
    let graphql_mutation = r#"
        mutation UpdateMediaProgress($mediaId: Int, $progress: Int, $status: MediaListStatus) {
            SaveMediaListEntry(mediaId: $mediaId, progress: $progress, status: $status) {
                id
                progress
                status
            }
        }
    "#;

    let variables = if let Some(s) = status {
        json!({
            "mediaId": media_id,
            "progress": progress,
            "status": s
        })
    } else {
        json!({
            "mediaId": media_id,
            "progress": progress
        })
    };

    let request_body = json!({
        "query": graphql_mutation,
        "variables": variables
    });

    let client = reqwest::Client::new();
    let response = client
        .post(ANILIST_API_URL)
        .header("Content-Type", "application/json")
        .header("Accept", "application/json")
        .header("Authorization", format!("Bearer {}", access_token))
        .json(&request_body)
        .send()
        .await
        .map_err(|e| format!("Failed to send request: {}", e))?;

    if !response.status().is_success() {
        let error_text = response.text().await.unwrap_or_default();
        return Err(format!("Update failed: {}", error_text));
    }

    let anilist_response: AniListResponse<SaveMediaListResponse> = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    Ok(anilist_response.data.save_media_list_entry)
}
