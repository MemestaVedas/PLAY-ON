use futures::stream::{self, StreamExt};
use reqwest::Client;
use std::fs::File;
use std::io::Write;
use std::path::Path;
use zip::write::FileOptions;

/// Maximum concurrent downloads
const MAX_CONCURRENT_DOWNLOADS: usize = 6;

/// Result of downloading a single page
struct PageDownload {
    index: usize,
    extension: String,
    bytes: Vec<u8>,
}

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

    // Build client with connection pool for better performance
    let client = Client::builder()
        .pool_max_idle_per_host(MAX_CONCURRENT_DOWNLOADS)
        .build()
        .map_err(|e| format!("Failed to build HTTP client: {}", e))?;

    println!(
        "[Downloader] Starting parallel download of {} pages (max {} concurrent)",
        urls.len(),
        MAX_CONCURRENT_DOWNLOADS
    );

    // Download all pages in parallel with limited concurrency
    let urls_with_index: Vec<(usize, String)> = urls.into_iter().enumerate().collect();

    let download_results: Vec<Result<PageDownload, String>> = stream::iter(urls_with_index)
        .map(|(i, url)| {
            let client = client.clone();
            async move {
                // Fetch image with proper headers
                let response = client
                    .get(&url)
                    .header("Referer", "https://weebcentral.com")
                    .header(
                        "User-Agent",
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                    )
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

                Ok(PageDownload {
                    index: i,
                    extension: ext.to_string(),
                    bytes: bytes.to_vec(),
                })
            }
        })
        .buffer_unordered(MAX_CONCURRENT_DOWNLOADS)
        .collect()
        .await;

    // Check for errors and collect successful downloads
    let mut pages: Vec<PageDownload> = Vec::with_capacity(download_results.len());
    for result in download_results {
        match result {
            Ok(page) => pages.push(page),
            Err(e) => return Err(e),
        }
    }

    // Sort pages by index to maintain correct order in CBZ
    pages.sort_by_key(|p| p.index);

    println!("[Downloader] All pages downloaded, creating CBZ...");

    // Create the CBZ file
    let file = File::create(&cbz_path).map_err(|e| format!("Failed to create CBZ file: {}", e))?;
    let mut zip = zip::ZipWriter::new(file);

    // ZIP options: Stored (no compression) is faster for already compressed images
    let options = FileOptions::default()
        .compression_method(zip::CompressionMethod::Stored)
        .unix_permissions(0o755);

    // Write all pages to zip
    for page in pages {
        let file_name = format!("{:03}.{}", page.index + 1, page.extension);
        zip.start_file(file_name, options)
            .map_err(|e| format!("Zip error: {}", e))?;
        zip.write_all(&page.bytes)
            .map_err(|e| format!("Zip write error: {}", e))?;
    }

    zip.finish()
        .map_err(|e| format!("Failed to finalize zip: {}", e))?;

    println!(
        "[Downloader] CBZ created successfully: {}",
        cbz_path.display()
    );

    Ok(cbz_path.to_string_lossy().to_string())
}
