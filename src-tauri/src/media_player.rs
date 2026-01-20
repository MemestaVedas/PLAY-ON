/// Media Player Detection Module
///
/// PURPOSE: Filter out non-media windows using allow-listing
/// Only track windows from known media players
///
/// APPROACH: Simple, deterministic matching
/// - No guessing or complex heuristics
/// - Media players advertise themselves in window titles
/// - Easy to extend and debug
///
/// NOTE: For more robust detection, consider using Windows Media Session API (SMTC)
/// in a future enhancement - this current approach relies on window titles.

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum MediaPlayer {
    VLC,
    MPV,
    MPC,
    PotPlayer,
    KMPlayer,
    GOM,
    WMP,
    Browser,
    Generic, // For players detected by file extension
}

/// Detect media player type from window title
///
/// Returns Some(MediaPlayer) if the window belongs to a known media player
/// Returns None for all other windows (VS Code, File Explorer, etc.)
///
/// This is the core filtering logic - only known media players pass through
pub fn detect_media_player(title: &str) -> Option<MediaPlayer> {
    let title_lower = title.to_lowercase();

    // VLC Media Player
    if title_lower.contains("vlc media player") || title_lower.contains("vlc") {
        return Some(MediaPlayer::VLC);
    }

    // MPV Player
    if title_lower.contains("mpv") {
        return Some(MediaPlayer::MPV);
    }

    // Media Player Classic (MPC-HC, MPC-BE)
    if title_lower.contains("mpc") || title_lower.contains("media player classic") {
        return Some(MediaPlayer::MPC);
    }

    // PotPlayer
    if title_lower.contains("potplayer") || title_lower.contains("pot player") {
        return Some(MediaPlayer::PotPlayer);
    }

    // KMPlayer
    if title_lower.contains("kmplayer") || title_lower.contains("km player") {
        return Some(MediaPlayer::KMPlayer);
    }

    // GOM Player
    if title_lower.contains("gom player") || title_lower.contains("gomplayer") {
        return Some(MediaPlayer::GOM);
    }

    // Windows Media Player
    if title_lower.contains("windows media player") || title_lower.contains("wmp") {
        return Some(MediaPlayer::WMP);
    }

    // Browser-based media (YouTube, Netflix, etc.)
    if title_lower.contains("youtube")
        || title_lower.contains("netflix")
        || title_lower.contains("prime video")
        || title_lower.contains("crunchyroll")
        || title_lower.contains("funimation")
        || title_lower.contains("hidive")
        || title_lower.contains("hianime")
        || title_lower.contains("9anime")
    {
        return Some(MediaPlayer::Browser);
    }

    // Generic detection: Check for common video file extensions in title
    // Many players show the filename in the window title
    let video_extensions = [
        ".mkv", ".mp4", ".avi", ".webm", ".m4v", ".mov", ".wmv", ".flv",
    ];
    for ext in &video_extensions {
        if title_lower.contains(ext) {
            return Some(MediaPlayer::Generic);
        }
    }

    // Not a known media player - ignore
    None
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_vlc_detection() {
        assert_eq!(
            detect_media_player("My Video - VLC media player"),
            Some(MediaPlayer::VLC)
        );
    }

    #[test]
    fn test_browser_detection() {
        assert_eq!(
            detect_media_player("Anime Episode 1 - YouTube - Chrome"),
            Some(MediaPlayer::Browser)
        );
    }

    #[test]
    fn test_non_media_window() {
        assert_eq!(detect_media_player("Visual Studio Code"), None);
        assert_eq!(detect_media_player("File Explorer"), None);
    }
}

#[test]
fn test_chrome_hianime_detection() {
    let title =
        "Chitose Is In The Ramune Bottle Episode 1 English Sub at Hianime - Google Chrome – Suraj";
    let result = detect_media_player(title);
    println!("Detection result for Chrome/Hianime title: {:?}", result);
    assert!(result.is_some(), "Should detect as browser");
    assert_eq!(result, Some(MediaPlayer::Browser));
}
