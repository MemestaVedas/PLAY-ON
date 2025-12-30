use winapi::shared::minwindef::{BOOL, LPARAM};
use winapi::shared::windef::HWND;
use winapi::um::winnt::LPWSTR;
use winapi::um::winuser::{
    EnumWindows, GetForegroundWindow, GetWindowTextLengthW, GetWindowTextW, IsWindowVisible,
};

unsafe fn get_foreground_window() -> Option<HWND> {
    let hwnd = GetForegroundWindow();
    if hwnd.is_null() {
        None
    } else {
        Some(hwnd)
    }
}

pub unsafe fn get_window_title(hwnd: HWND) -> Option<String> {
    if IsWindowVisible(hwnd) == 0 {
        return None;
    }

    let length = GetWindowTextLengthW(hwnd);
    if length <= 0 {
        return None;
    }

    let mut buffer: Vec<u16> = vec![0; (length + 1) as usize];

    let written = GetWindowTextW(hwnd, buffer.as_mut_ptr() as LPWSTR, length + 1);

    if written == 0 {
        return None;
    }

    String::from_utf16(&buffer[..written as usize]).ok()
}

pub fn get_active_window_title() -> Option<String> {
    unsafe {
        let hwnd = get_foreground_window()?;
        get_window_title(hwnd)
    }
}

/// Callback for EnumWindows to collect all visible windows
unsafe extern "system" fn enum_windows_callback(hwnd: HWND, lparam: LPARAM) -> BOOL {
    let titles = &mut *(lparam as *mut Vec<String>);
    if let Some(title) = get_window_title(hwnd) {
        titles.push(title);
    }
    1 // Continue enumeration
}

/// Returns titles of all visible windows
pub fn get_all_visible_window_titles() -> Vec<String> {
    let mut titles: Vec<String> = Vec::new();
    unsafe {
        EnumWindows(Some(enum_windows_callback), &mut titles as *mut _ as LPARAM);
    }
    titles
}
