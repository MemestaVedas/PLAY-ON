//! macOS Window Detection Module
//!
//! PURPOSE: Detect window titles on macOS using Core Graphics API
//! Provides the same interface as win_name.rs for cross-platform compatibility
//!
//! NOTE: Requires Screen Recording permission to see other app windows
#![cfg(target_os = "macos")]

use core_foundation::base::TCFType;
use core_foundation::dictionary::CFDictionaryRef;
use core_foundation::number::CFNumber;
use core_foundation::string::CFString;
use core_graphics::window::{
    kCGNullWindowID, kCGWindowListExcludeDesktopElements, kCGWindowListOptionOnScreenOnly,
    CGWindowListCopyWindowInfo,
};

/// Get the title of the currently active/frontmost window on macOS
///
/// Uses Core Graphics API to get window information.
/// Falls back to getting any visible window title if frontmost can't be determined.
///
/// # Returns
/// * `Some(String)` - The window title if successfully retrieved
/// * `None` - If no window is active or an error occurred
pub fn get_active_window_title() -> Option<String> {
    let options = kCGWindowListOptionOnScreenOnly | kCGWindowListExcludeDesktopElements;

    let window_list = unsafe { CGWindowListCopyWindowInfo(options, kCGNullWindowID) };

    if window_list.is_null() {
        return None;
    }

    let windows: Vec<CFDictionaryRef> = unsafe {
        let count = core_foundation::array::CFArrayGetCount(window_list as _);
        (0..count)
            .filter_map(|i| {
                let ptr = core_foundation::array::CFArrayGetValueAtIndex(window_list as _, i);
                if ptr.is_null() {
                    None
                } else {
                    Some(ptr as CFDictionaryRef)
                }
            })
            .collect()
    };

    // Find the frontmost window (layer 0, on screen)
    // Windows are ordered front to back, so first valid window with a name is usually frontmost
    for dict in windows.iter() {
        if let Some(title) = get_window_name(*dict) {
            if !title.is_empty() && title != "Notification Center" && title != "Control Center" {
                // Check if this window belongs to a normal app (layer 0)
                if let Some(layer) = get_window_layer(*dict) {
                    if layer == 0 {
                        // Clean up
                        unsafe {
                            core_foundation::base::CFRelease(window_list as _);
                        }
                        return Some(title);
                    }
                }
            }
        }
    }

    // Fallback: return the first window with any name
    for dict in windows.iter() {
        if let Some(title) = get_window_name(*dict) {
            if !title.is_empty() && title != "Notification Center" && title != "Control Center" {
                // Clean up
                unsafe {
                    core_foundation::base::CFRelease(window_list as _);
                }
                return Some(title);
            }
        }
    }

    // Clean up
    unsafe {
        core_foundation::base::CFRelease(window_list as _);
    }

    None
}

/// Get titles of all visible windows from common media players and browsers
///
/// Uses Core Graphics API to enumerate all visible windows and filter
/// by owner application name.
///
/// # Returns
/// * `Vec<String>` - List of window titles from media player/browser applications
pub fn get_all_visible_window_titles() -> Vec<String> {
    let mut titles = Vec::new();

    // Apps we're interested in
    let target_apps: Vec<&str> = vec![
        // Media players
        "VLC",
        "IINA",
        "mpv",
        "QuickTime Player",
        "Elmedia Player",
        "Infuse",
        // Browsers
        "Safari",
        "Google Chrome",
        "Firefox",
        "Arc",
        "Brave Browser",
        "Microsoft Edge",
        "Opera",
        "Vivaldi",
        "zen",
        "Zen Browser",
        "Zen",
    ];

    let options = kCGWindowListOptionOnScreenOnly | kCGWindowListExcludeDesktopElements;

    let window_list = unsafe { CGWindowListCopyWindowInfo(options, kCGNullWindowID) };

    if window_list.is_null() {
        return titles;
    }

    let windows: Vec<CFDictionaryRef> = unsafe {
        let count = core_foundation::array::CFArrayGetCount(window_list as _);
        (0..count)
            .filter_map(|i| {
                let ptr = core_foundation::array::CFArrayGetValueAtIndex(window_list as _, i);
                if ptr.is_null() {
                    None
                } else {
                    Some(ptr as CFDictionaryRef)
                }
            })
            .collect()
    };

    for dict in windows.iter() {
        if let Some(owner) = get_window_owner_name(*dict) {
            // Check if this is one of our target apps
            let is_target = target_apps
                .iter()
                .any(|app| owner.to_lowercase().contains(&app.to_lowercase()));

            if is_target {
                if let Some(title) = get_window_name(*dict) {
                    if !title.is_empty() {
                        titles.push(title);
                    }
                }
            }
        }
    }

    // Clean up
    unsafe {
        core_foundation::base::CFRelease(window_list as _);
    }

    titles
}

/// Extract window name from a Core Foundation dictionary
fn get_window_name(dict: CFDictionaryRef) -> Option<String> {
    unsafe {
        let key = CFString::new("kCGWindowName");
        let mut value: *const std::ffi::c_void = std::ptr::null();

        if core_foundation::dictionary::CFDictionaryGetValueIfPresent(
            dict,
            key.as_concrete_TypeRef() as *const _,
            &mut value,
        ) != 0
            && !value.is_null()
        {
            let cf_string = CFString::wrap_under_get_rule(value as _);
            Some(cf_string.to_string())
        } else {
            None
        }
    }
}

/// Extract window owner (application) name from a Core Foundation dictionary
fn get_window_owner_name(dict: CFDictionaryRef) -> Option<String> {
    unsafe {
        let key = CFString::new("kCGWindowOwnerName");
        let mut value: *const std::ffi::c_void = std::ptr::null();

        if core_foundation::dictionary::CFDictionaryGetValueIfPresent(
            dict,
            key.as_concrete_TypeRef() as *const _,
            &mut value,
        ) != 0
            && !value.is_null()
        {
            let cf_string = CFString::wrap_under_get_rule(value as _);
            Some(cf_string.to_string())
        } else {
            None
        }
    }
}

/// Extract window layer from a Core Foundation dictionary
fn get_window_layer(dict: CFDictionaryRef) -> Option<i32> {
    unsafe {
        let key = CFString::new("kCGWindowLayer");
        let mut value: *const std::ffi::c_void = std::ptr::null();

        if core_foundation::dictionary::CFDictionaryGetValueIfPresent(
            dict,
            key.as_concrete_TypeRef() as *const _,
            &mut value,
        ) != 0
            && !value.is_null()
        {
            let cf_num = CFNumber::wrap_under_get_rule(value as _);
            cf_num.to_i32()
        } else {
            None
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_active_window_title() {
        // This test will return Some if there's a visible window
        let title = get_active_window_title();
        println!("Active window title: {:?}", title);
        // We can't assert much since it depends on what's on screen
    }

    #[test]
    fn test_get_all_visible_window_titles() {
        let titles = get_all_visible_window_titles();
        println!("Visible window titles: {:?}", titles);
        // We can't assert specific values since it depends on running apps
    }
}
