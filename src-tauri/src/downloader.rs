use reqwest::Client;
use std::fs::File;
use std::io::Write;
use std::path::Path;
use zip::write::FileOptions;

pub async fn download_chapter_to_cbz(
    chapter_title: String,
    manga_title: String,
    urls: Vec<String>,
    download_dir: String,
) -> Result<String, String> {
    // Basic sanitization
    let sanitize = |s: &str| -> String {
        s.replace(['/', '\\', '?', '*', ':', '"', '<', '>', '|'], "_")
            .trim()
            .to_string()
    };

    let sanitized_manga = sanitize(&manga_title);
    let sanitized_chapter = sanitize(&chapter_title);

    let base_path = Path::new(&download_dir);
    if !base_path.exists() {
        return Err(format!(
            "Download directory does not exist: {}",
            download_dir
        ));
    }

    // Create manga directory if it doesn't exist
    let manga_dir = base_path.join(&sanitized_manga);
    if !manga_dir.exists() {
        std::fs::create_dir_all(&manga_dir)
            .map_err(|e| format!("Failed to create manga directory: {}", e))?;
    }

    let cbz_path = manga_dir.join(format!("{}.cbz", sanitized_chapter));

    // Create the file
    let file = File::create(&cbz_path).map_err(|e| format!("Failed to create CBZ file: {}", e))?;
    let mut zip = zip::ZipWriter::new(file);

    // ZIP options: Stored (no compression) is faster for already compressed images (JPG/PNG)
    // and standard for CBZ
    let options = FileOptions::default()
        .compression_method(zip::CompressionMethod::Stored)
        .unix_permissions(0o755);

    let client = Client::new();

    for (i, url) in urls.iter().enumerate() {
        // Fetch image
        // Use the image URL itself as referer if not provided, usually works for basic hotlink protection
        let response = client.get(url)
            .header("Referer", "https://weebcentral.com") // TODO: Make this dynamic if needed
            .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
            .send()
            .await
            .map_err(|e| format!("Failed to fetch page {}: {}", i + 1, e))?;

        if !response.status().is_success() {
            return Err(format!(
                "Failed to fetch page {}: HTTP {}",
                i + 1,
                response.status()
            ));
        }

        let bytes = response
            .bytes()
            .await
            .map_err(|e| format!("Failed to read bytes for page {}: {}", i + 1, e))?;

        // Determine extension (default to jpg if unknown)
        let ext = if url.to_lowercase().contains(".png") {
            "png"
        } else if url.to_lowercase().contains(".webp") {
            "webp"
        } else {
            "jpg"
        };

        let file_name = format!("{:03}.{}", i + 1, ext);

        zip.start_file(file_name, options)
            .map_err(|e| format!("Zip error: {}", e))?;
        zip.write_all(&bytes)
            .map_err(|e| format!("Zip write error: {}", e))?;
    }

    zip.finish()
        .map_err(|e| format!("Failed to finalize zip: {}", e))?;

    Ok(cbz_path.to_string_lossy().to_string())
}
