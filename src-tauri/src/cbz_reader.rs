use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};
/**
 * CBZ File Reader
 *
 * Handles reading CBZ (Comic Book Zip) files.
 * CBZ files are just ZIP archives containing images.
 */
use std::fs::File;
use std::io::Read;
use zip::ZipArchive;

/// Information about pages in a CBZ file
#[derive(serde::Serialize)]
pub struct CbzInfo {
    /// Total number of pages
    pub page_count: usize,
    /// List of page file names (sorted)
    pub pages: Vec<String>,
}

/// Get information about a CBZ file (page count and page names)
#[tauri::command]
pub fn get_cbz_info(path: String) -> Result<CbzInfo, String> {
    let file = File::open(&path).map_err(|e| format!("Failed to open file: {}", e))?;
    let mut archive = ZipArchive::new(file).map_err(|e| format!("Failed to read ZIP: {}", e))?;

    let mut pages: Vec<String> = Vec::new();

    for i in 0..archive.len() {
        let file = archive
            .by_index(i)
            .map_err(|e| format!("Failed to read entry: {}", e))?;
        let name = file.name().to_string();

        // Only include image files
        let lower = name.to_lowercase();
        if lower.ends_with(".jpg")
            || lower.ends_with(".jpeg")
            || lower.ends_with(".png")
            || lower.ends_with(".gif")
            || lower.ends_with(".webp")
        {
            // Skip if it's a macOS metadata file
            if !name.contains("__MACOSX") && !name.starts_with("._") {
                pages.push(name);
            }
        }
    }

    // Sort pages naturally (page1, page2, page10 instead of page1, page10, page2)
    pages.sort_by(|a, b| natord::compare(&a.to_lowercase(), &b.to_lowercase()));

    Ok(CbzInfo {
        page_count: pages.len(),
        pages,
    })
}

/// Get a specific page from a CBZ file as base64
#[tauri::command]
pub fn get_cbz_page(path: String, page_name: String) -> Result<String, String> {
    let file = File::open(&path).map_err(|e| format!("Failed to open file: {}", e))?;
    let mut archive = ZipArchive::new(file).map_err(|e| format!("Failed to read ZIP: {}", e))?;

    let mut entry = archive
        .by_name(&page_name)
        .map_err(|e| format!("Page not found: {}", e))?;

    let mut buffer = Vec::new();
    entry
        .read_to_end(&mut buffer)
        .map_err(|e| format!("Failed to read page: {}", e))?;

    // Determine MIME type from filename
    let lower = page_name.to_lowercase();
    let mime = if lower.ends_with(".png") {
        "image/png"
    } else if lower.ends_with(".gif") {
        "image/gif"
    } else if lower.ends_with(".webp") {
        "image/webp"
    } else {
        "image/jpeg"
    };

    // Return as data URL
    let base64_data = BASE64.encode(&buffer);
    Ok(format!("data:{};base64,{}", mime, base64_data))
}

/// Check if a file is a valid CBZ (ZIP archive)
#[tauri::command]
pub fn is_valid_cbz(path: String) -> bool {
    if let Ok(file) = File::open(&path) {
        ZipArchive::new(file).is_ok()
    } else {
        false
    }
}
/// Read a specific page from a CBZ file as raw bytes and mime type
/// Used by the custom protocol handler
pub fn read_cbz_page_bytes(path: &str, page_name: &str) -> Result<(Vec<u8>, String), String> {
    let file = File::open(path).map_err(|e| format!("Failed to open file: {}", e))?;
    let mut archive = ZipArchive::new(file).map_err(|e| format!("Failed to read ZIP: {}", e))?;

    let mut entry = archive
        .by_name(page_name)
        .map_err(|e| format!("Page not found: {}", e))?;

    let mut buffer = Vec::new();
    entry
        .read_to_end(&mut buffer)
        .map_err(|e| format!("Failed to read page: {}", e))?;

    // Determine MIME type from filename
    let lower = page_name.to_lowercase();
    let mime = if lower.ends_with(".png") {
        "image/png"
    } else if lower.ends_with(".gif") {
        "image/gif"
    } else if lower.ends_with(".webp") {
        "image/webp"
    } else {
        "image/jpeg"
    };

    Ok((buffer, mime.to_string()))
}
