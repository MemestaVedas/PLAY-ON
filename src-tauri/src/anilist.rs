use serde::{Deserialize, Serialize};
use serde_json::json;

/// AniList API endpoint
const ANILIST_API_URL: &str = "https://graphql.anilist.co";

/// Represents an anime from AniList
#[derive(Debug, Serialize, Deserialize)]
pub struct Anime {
    pub id: i32,
    pub title: AnimeTitle,
    #[serde(rename = "coverImage")]
    pub cover_image: CoverImage,
    pub episodes: Option<i32>,
    pub status: Option<String>,
    pub description: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AnimeTitle {
    pub romaji: Option<String>,
    pub english: Option<String>,
    pub native: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
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

    let variables = json!({
        "search": query,
        "perPage": limit
    });

    let request_body = json!({
        "query": graphql_query,
        "variables": variables
    });

    // Make HTTP request
    let client = reqwest::Client::new();
    let response = client
        .post(ANILIST_API_URL)
        .header("Content-Type", "application/json")
        .header("Accept", "application/json")
        .json(&request_body)
        .send()
        .await
        .map_err(|e| format!("Failed to send request: {}", e))?;

    // Parse response
    let anilist_response: AniListResponse<SearchResponse> = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    Ok(anilist_response.data.page.media)
}

/// Get anime details by ID
///
/// # Arguments
/// * `id` - The AniList anime ID
///
/// # Returns
/// * `Result<Anime, String>` - Anime details or error message
pub async fn get_anime_by_id(id: i32) -> Result<Anime, String> {
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

    let variables = json!({
        "id": id
    });

    let request_body = json!({
        "query": graphql_query,
        "variables": variables
    });

    // Make HTTP request
    let client = reqwest::Client::new();
    let response = client
        .post(ANILIST_API_URL)
        .header("Content-Type", "application/json")
        .header("Accept", "application/json")
        .json(&request_body)
        .send()
        .await
        .map_err(|e| format!("Failed to send request: {}", e))?;

    // Parse response
    let anilist_response: AniListResponse<MediaResponse> = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    Ok(anilist_response.data.media)
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
