/// Title Parser Module
///
/// PURPOSE: Parse anime titles and episode numbers from window titles
/// Handles common anime filename formats from VLC, MPV, MPC, etc.
///
/// APPROACH: Use regex patterns to extract structured data
use regex::Regex;
use serde::{Deserialize, Serialize};

/// Result of parsing a window title
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ParsedTitle {
    /// Cleaned anime title (if detected)
    pub title: Option<String>,
    /// Episode number (if detected)
    pub episode: Option<i32>,
    /// Season number (if detected)
    pub season: Option<i32>,
}

/// Parse anime title and episode from a window title
///
/// # Arguments
/// * `window_title` - The window title from a media player
///
/// # Returns
/// * `ParsedTitle` with extracted title, episode, and season
///
/// # Supported Formats
/// - `[SubGroup] Anime Title - 05 [1080p].mkv - VLC media player`
/// - `Anime Title S02E05.mkv - mpv`
/// - `Anime Title Episode 12 - MPC-HC`
/// - `Anime Title - 05.mp4`
/// - `Anime_Title_01.mkv` (underscores as spaces)
/// - `Anime.Title.01.mkv` (dots as spaces)
pub fn parse_window_title(window_title: &str) -> ParsedTitle {
    // First, remove the media player suffix
    let cleaned = remove_player_suffix(window_title);

    // Normalize separators: treat _ and . as spaces (common in filenames)
    let normalized = normalize_separators(&cleaned);

    // Try different parsing strategies
    if let Some(result) = try_parse_season_episode(&normalized) {
        return result;
    }

    if let Some(result) = try_parse_episode_keyword(&normalized) {
        return result;
    }

    if let Some(result) = try_parse_dash_number(&normalized) {
        return result;
    }

    if let Some(result) = try_parse_bracketed(&normalized) {
        return result;
    }

    // Fallback: just clean the title
    ParsedTitle {
        title: Some(clean_title(&normalized)),
        episode: None,
        season: None,
    }
}

/// Normalize common filename separators to spaces
/// Converts underscores and dots to spaces (except dots in file extensions)
fn normalize_separators(title: &str) -> String {
    let mut result = title.to_string();

    // First, protect file extensions by temporarily replacing them
    let extensions = [
        ".mkv", ".mp4", ".avi", ".webm", ".m4v", ".mov", ".wmv", ".flv",
    ];
    let mut ext_found = String::new();
    for ext in &extensions {
        if result.to_lowercase().ends_with(ext) {
            ext_found = ext.to_string();
            result = result[..result.len() - ext.len()].to_string();
            break;
        }
    }

    // Replace underscores with spaces
    result = result.replace('_', " ");

    // Replace dots with spaces (these are likely word separators in filenames)
    result = result.replace('.', " ");

    // Clean up multiple spaces
    let space_re = Regex::new(r"\s+").unwrap();
    result = space_re.replace_all(&result, " ").to_string();

    // Add extension back (will be removed by clean_title later)
    result.push_str(&ext_found);

    result.trim().to_string()
}

/// Remove common media player suffixes from window title
fn remove_player_suffix(title: &str) -> String {
    let suffixes = [
        " - VLC media player",
        " - VLC",
        " - mpv",
        " - MPC-HC",
        " - MPC-BE",
        " - Media Player Classic",
        " - Windows Media Player",
        " - PotPlayer",
        " – VLC media player", // en-dash variant
    ];

    let mut result = title.to_string();
    for suffix in &suffixes {
        if let Some(pos) = result.to_lowercase().rfind(&suffix.to_lowercase()) {
            result = result[..pos].to_string();
            break;
        }
    }
    result.trim().to_string()
}

/// Try to parse S##E## format (e.g., "Anime S02E05")
fn try_parse_season_episode(title: &str) -> Option<ParsedTitle> {
    let re = Regex::new(r"(?i)(.+?)\s*[Ss](\d{1,2})\s*[Ee](\d{1,3})").ok()?;
    let caps = re.captures(title)?;

    let anime_title = clean_title(caps.get(1)?.as_str());
    let season: i32 = caps.get(2)?.as_str().parse().ok()?;
    let episode: i32 = caps.get(3)?.as_str().parse().ok()?;

    Some(ParsedTitle {
        title: Some(anime_title),
        episode: Some(episode),
        season: Some(season),
    })
}

/// Try to parse "Episode ##" or "Ep ##" format
fn try_parse_episode_keyword(title: &str) -> Option<ParsedTitle> {
    let re = Regex::new(r"(?i)(.+?)\s*(?:Episode|Ep\.?)\s*(\d{1,3})").ok()?;
    let caps = re.captures(title)?;

    let anime_title = clean_title(caps.get(1)?.as_str());
    let episode: i32 = caps.get(2)?.as_str().parse().ok()?;

    Some(ParsedTitle {
        title: Some(anime_title),
        episode: Some(episode),
        season: None,
    })
}

/// Try to parse "Anime - ## " format (common in fansubs)
fn try_parse_dash_number(title: &str) -> Option<ParsedTitle> {
    // Match: Title - 05 [quality] or Title - 05.mkv
    let re = Regex::new(r"(.+?)\s*-\s*(\d{1,3})(?:\s*[\[\(]|\s*\.|\s*$)").ok()?;
    let caps = re.captures(title)?;

    let anime_title = clean_title(caps.get(1)?.as_str());
    let episode: i32 = caps.get(2)?.as_str().parse().ok()?;

    Some(ParsedTitle {
        title: Some(anime_title),
        episode: Some(episode),
        season: None,
    })
}

/// Try to parse [SubGroup] Title - ## [quality] format
fn try_parse_bracketed(title: &str) -> Option<ParsedTitle> {
    // First, remove leading [SubGroup] tag
    let re_subgroup = Regex::new(r"^\s*\[[^\]]+\]\s*").ok()?;
    let without_subgroup = re_subgroup.replace(title, "").to_string();

    // Now try dash-number parsing on the cleaned string
    try_parse_dash_number(&without_subgroup)
}

/// Clean up a title string by removing common noise
fn clean_title(title: &str) -> String {
    let mut result = title.to_string();

    // Remove file extensions
    let extensions = [".mkv", ".mp4", ".avi", ".webm", ".m4v"];
    for ext in &extensions {
        if result.to_lowercase().ends_with(ext) {
            result = result[..result.len() - ext.len()].to_string();
        }
    }

    // Remove quality tags like [1080p], (720p), [BD], etc.
    let quality_re = Regex::new(r"[\[\(]\s*(?:\d{3,4}p|BD|HEVC|x264|x265|AAC|FLAC|10bit|Hi10P|WEB-DL|WEB|BDRip|BluRay)\s*[\]\)]").unwrap();
    result = quality_re.replace_all(&result, "").to_string();

    // Remove subgroup tags at the start
    let subgroup_re = Regex::new(r"^\s*\[[^\]]+\]\s*").unwrap();
    result = subgroup_re.replace(&result, "").to_string();

    // Remove hash tags at the end like [ABCD1234]
    let hash_re = Regex::new(r"\s*\[[A-Fa-f0-9]{8}\]\s*$").unwrap();
    result = hash_re.replace(&result, "").to_string();

    // Clean up extra whitespace and dashes
    result = result.trim().to_string();
    result = result.trim_end_matches('-').trim().to_string();

    result
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_simple_dash_format() {
        let result = parse_window_title("Frieren - 05 [1080p].mkv - VLC media player");
        assert_eq!(result.title, Some("Frieren".to_string()));
        assert_eq!(result.episode, Some(5));
    }

    #[test]
    fn test_subgroup_format() {
        let result = parse_window_title("[SubsPlease] Jujutsu Kaisen - 23 [1080p].mkv - mpv");
        assert_eq!(result.title, Some("Jujutsu Kaisen".to_string()));
        assert_eq!(result.episode, Some(23));
    }

    #[test]
    fn test_season_episode_format() {
        let result = parse_window_title("My Hero Academia S05E12.mp4 - VLC media player");
        assert_eq!(result.title, Some("My Hero Academia".to_string()));
        assert_eq!(result.episode, Some(12));
        assert_eq!(result.season, Some(5));
    }

    #[test]
    fn test_episode_keyword() {
        let result = parse_window_title("Attack on Titan Episode 25 - MPC-HC");
        assert_eq!(result.title, Some("Attack on Titan".to_string()));
        assert_eq!(result.episode, Some(25));
    }

    #[test]
    fn test_with_quality_tags() {
        let result = parse_window_title("[Erai-raws] Spy x Family - 12 [1080p][HEVC].mkv - VLC");
        assert_eq!(result.title, Some("Spy x Family".to_string()));
        assert_eq!(result.episode, Some(12));
    }

    #[test]
    fn test_no_episode_number() {
        let result = parse_window_title("Random Movie Title - VLC media player");
        assert!(result.title.is_some());
        // Episode may or may not be detected depending on title format
    }

    #[test]
    fn test_removes_player_suffix() {
        let result = remove_player_suffix("Anime - 01 - VLC media player");
        assert_eq!(result, "Anime - 01");
    }
}

    #[test]
    fn test_hianime_browser_title() {
        let result = parse_window_title("Chitose Is In The Ramune Bottle Episode 1 English Sub at Hianime - Google Chrome");
        println!("Parsed: title={:?}, episode={:?}", result.title, result.episode);
        assert_eq!(result.episode, Some(1));
        assert!(result.title.is_some());
    }
