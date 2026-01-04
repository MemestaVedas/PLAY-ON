use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use std::time::SystemTime;

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct FileItem {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub size: Option<u64>,
    pub last_modified: Option<u64>,
}

#[tauri::command]
pub fn get_folder_contents(path: String) -> Result<Vec<FileItem>, String> {
    let dir_path = Path::new(&path);
    if !dir_path.exists() {
        return Err("Directory does not exist".to_string());
    }

    let entries = fs::read_dir(dir_path).map_err(|e| e.to_string())?;
    let mut files = Vec::new();

    for entry in entries {
        if let Ok(entry) = entry {
            let path_buf = entry.path();
            let is_dir = path_buf.is_dir();
            let name = entry.file_name().to_string_lossy().to_string();

            // Basic filtering for hidden files
            if name.starts_with('.') {
                continue;
            }

            let metadata = entry.metadata().ok();
            let size = if !is_dir {
                metadata.as_ref().map(|m| m.len())
            } else {
                None
            };

            let last_modified = metadata
                .as_ref()
                .and_then(|m| m.modified().ok())
                .and_then(|t| t.duration_since(SystemTime::UNIX_EPOCH).ok())
                .map(|d| d.as_secs());

            // If it's a file, filter by video extensions
            if !is_dir {
                if let Some(ext) = path_buf.extension() {
                    let ext_str = ext.to_string_lossy().to_lowercase();
                    match ext_str.as_str() {
                        // Video files
                        "mp4" | "mkv" | "avi" | "mov" | "webm" | "flv" | "wmv" |
                        // Manga/Comic files
                        "pdf" | "cbz" | "cbr" => {
                            files.push(FileItem {
                                name,
                                path: path_buf.to_string_lossy().to_string(),
                                is_dir,
                                size,
                                last_modified,
                            });
                        }
                        _ => continue, // Skip other files
                    }
                }
            } else {
                // Always include directories
                files.push(FileItem {
                    name,
                    path: path_buf.to_string_lossy().to_string(),
                    is_dir,
                    size,
                    last_modified,
                });
            }
        }
    }

    // Sort: Directories first, then alphabetical
    files.sort_by(|a, b| {
        if a.is_dir && !b.is_dir {
            std::cmp::Ordering::Less
        } else if !a.is_dir && b.is_dir {
            std::cmp::Ordering::Greater
        } else {
            a.name.to_lowercase().cmp(&b.name.to_lowercase())
        }
    });

    Ok(files)
}
