use lazy_static::lazy_static;
use local_ip_address::local_ip;
use rust_cast::{channels::receiver::CastDeviceApp, CastDevice};
use std::str::FromStr;
use std::sync::Mutex;
use std::time::Duration;

// Constants
const APP_ID: &str = "CC1AD845";

// Store the Device IP and session info globally
lazy_static::lazy_static! {
    static ref CAST_DEVICE_IP: Mutex<String> = Mutex::new(String::new());
    static ref CURRENT_TRANSPORT_ID: Mutex<String> = Mutex::new(String::new());
    static ref CURRENT_SESSION_ID: Mutex<String> = Mutex::new(String::new());
}

#[tauri::command]
pub async fn cast_discover() -> Result<Vec<String>, String> {
    println!("[Casting] Starting discovery...");
    // Using mdns-sd for discovery as reliable alternative
    let mdns = mdns_sd::ServiceDaemon::new().map_err(|e| format!("{:?}", e))?;
    let receiver = mdns
        .browse("_googlecast._tcp.local.")
        .map_err(|e| format!("{:?}", e))?;

    let mut devices = Vec::new();
    let start = std::time::Instant::now();

    // Browse for 2 seconds
    while start.elapsed() < Duration::from_secs(2) {
        if let Ok(event) = receiver.recv_timeout(Duration::from_millis(100)) {
            match event {
                mdns_sd::ServiceEvent::ServiceResolved(info) => {
                    println!(
                        "[Casting] Found device: {} at {:?}",
                        info.get_fullname(),
                        info.get_addresses()
                    );
                    // Helper: Extract friendly name if possible, else Hostname
                    let name = info.get_hostname().trim_end_matches('.').to_string();
                    if !devices.contains(&name) {
                        devices.push(name);
                    }
                }
                _ => {}
            }
        }
    }

    Ok(devices)
}

// Helper to get IP from name using mDNS (quick lookup)
fn resolve_device_ip(name: &str) -> Option<String> {
    let mdns = mdns_sd::ServiceDaemon::new().ok()?;
    let receiver = mdns.browse("_googlecast._tcp.local.").ok()?;

    let start = std::time::Instant::now();
    while start.elapsed() < Duration::from_secs(2) {
        if let Ok(event) = receiver.recv_timeout(Duration::from_millis(100)) {
            if let mdns_sd::ServiceEvent::ServiceResolved(info) = event {
                let hostname = info.get_hostname().trim_end_matches('.');
                if hostname == name || info.get_fullname().contains(name) {
                    if let Some(ip) = info.get_addresses().iter().next() {
                        return Some(ip.to_string());
                    }
                }
            }
        }
    }
    None
}

#[tauri::command]
pub async fn cast_load_media(
    device_name: String,
    url: String,
    _content_type: String,
) -> Result<String, String> {
    println!("[Casting] Resolving IP for {}", device_name);
    let device_ip = resolve_device_ip(&device_name).ok_or("Device not found")?;

    println!("[Casting] Connecting to {}:8009", device_ip);

    // Connect using new API
    let device = CastDevice::connect_without_host_verification(&device_ip, 8009)
        .map_err(|e| format!("{:?}", e))?;

    device
        .connection
        .connect("sender-0")
        .map_err(|e| format!("{:?}", e))?;
    device.heartbeat.ping().map_err(|e| format!("{:?}", e))?;

    // Launch App
    let app_arg = CastDeviceApp::from_str(APP_ID).unwrap();
    let app = device
        .receiver
        .launch_app(&app_arg)
        .map_err(|e| format!("{:?}", e))?;

    let transport_id = app.transport_id.clone();
    let session_id = app.session_id.clone();

    device
        .connection
        .connect(&transport_id)
        .map_err(|e| format!("{:?}", e))?;

    // Prepare Media
    let internal_ip = local_ip().map_err(|e| e.to_string())?;
    let port = crate::stream_server::get_server_port();
    let target_proxy_url = format!(
        "http://{}:{}/proxy?url={}",
        internal_ip,
        port,
        urlencoding::encode(&url)
    );

    // Create Media Object
    let media = rust_cast::channels::media::Media {
        content_id: target_proxy_url,
        stream_type: rust_cast::channels::media::StreamType::Buffered,
        content_type: _content_type,
        metadata: None,
        duration: None,
    };

    device
        .media
        .load(&transport_id, &session_id, &media)
        .map_err(|e| format!("{:?}", e))?;

    // Store device IP and app id
    {
        let mut global_ip = CAST_DEVICE_IP.lock().unwrap();
        *global_ip = device_ip;

        let mut global_transport = CURRENT_TRANSPORT_ID.lock().unwrap();
        *global_transport = transport_id;

        let mut global_session = CURRENT_SESSION_ID.lock().unwrap();
        *global_session = session_id;
    }

    Ok("Media Loaded".to_string())
}

#[tauri::command]
pub async fn cast_control(action: String) -> Result<String, String> {
    let (device_ip, session_id): (String, String) = {
        let lock_ip = CAST_DEVICE_IP.lock().map_err(|_| "Lock error")?;
        let lock_session = CURRENT_SESSION_ID.lock().map_err(|_| "Lock error")?;
        (lock_ip.clone(), lock_session.clone())
    };

    if device_ip.is_empty() {
        return Err("No active cast connection".to_string());
    }

    let device = CastDevice::connect_without_host_verification(&device_ip, 8009)
        .map_err(|e| format!("{:?}", e))?;

    // We might need to ensure we are connected.
    // device.connection.connect("sender-0")?;

    match action.as_str() {
        "stop" => {
            device
                .receiver
                .stop_app(&session_id)
                .map_err(|e| format!("{:?}", e))?;
        }
        _ => return Err("Control partially implemented - state loss".to_string()),
    }

    Ok(format!("Executed {}", action))
}
