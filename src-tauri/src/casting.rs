use local_ip_address::local_ip;
use rust_cast::{CastDevice, channels::receiver::CastDeviceApp};
use std::collections::HashMap;
use std::str::FromStr;
use std::sync::Mutex;
use std::time::Duration;

const APP_ID: &str = "CC1AD845";

// Store connection info to recreate device when needed
lazy_static::lazy_static! {
    static ref CAST_DEVICE_IP: Mutex<String> = Mutex::new(String::new());
    static ref CURRENT_TRANSPORT_ID: Mutex<String> = Mutex::new(String::new());
    static ref CURRENT_SESSION_ID: Mutex<String> = Mutex::new(String::new());
}

#[derive(serde::Serialize, Clone, PartialEq, Eq)]
pub struct CastDeviceInfo {
    pub name: String,
    pub ip: String,
}

#[derive(serde::Deserialize, serde::Serialize, Clone, Debug)]
pub struct SubtitleTrack {
    pub url: String,
    pub language: String,
    pub label: String,
}

#[tauri::command]
pub async fn cast_discover() -> Result<Vec<CastDeviceInfo>, String> {
    println!("[Casting] Starting discovery...");
    let mdns = mdns_sd::ServiceDaemon::new().map_err(|e| format!("{:?}", e))?;
    let receiver = mdns
        .browse("_googlecast._tcp.local.")
        .map_err(|e| format!("{:?}", e))?;

    let mut devices = Vec::new();
    let start = std::time::Instant::now();

    while start.elapsed() < Duration::from_secs(2) {
        if let Ok(event) = receiver.recv_timeout(Duration::from_millis(100)) {
            match event {
                mdns_sd::ServiceEvent::ServiceResolved(info) => {
                    println!(
                        "[Casting] Found device: {} at {:?}",
                        info.get_fullname(),
                        info.get_addresses()
                    );

                    let name = info
                        .get_property_val_str("fn")
                        .unwrap_or_else(|| info.get_fullname())
                        .to_string();

                    if let Some(ip) = info.get_addresses().iter().find(|ip| ip.is_ipv4()) {
                        let device_info = CastDeviceInfo {
                            name,
                            ip: ip.to_string(),
                        };

                        // We check uniqueness by IP because friendly names might change or be identical
                        if !devices
                            .iter()
                            .any(|d: &CastDeviceInfo| d.ip == device_info.ip)
                        {
                            devices.push(device_info);
                        }
                    }
                }
                _ => {}
            }
        }
    }

    Ok(devices)
}

#[tauri::command]
pub async fn cast_load_media(
    device_ip: String,
    url: String,
    content_type: String,
    headers: Option<HashMap<String, String>>,
    subtitles: Option<Vec<SubtitleTrack>>,
) -> Result<String, String> {
    // Run the casting logic in a blocking task since rust_cast is synchronous and !Send
    tauri::async_runtime::spawn_blocking(move || {
        println!(
            "[Casting] command received: load_media for device={}, url={}, type={}",
            device_ip, url, content_type
        );

        let mut last_error = String::new();

        // Retry the entire flow (Connect -> Launch -> Load) to handle flaky connections
        for attempt in 1..=3 {
            println!(
                "[Casting] Attempt {}/3: Connecting to {}:8009",
                attempt, device_ip
            );

            // Inner closure to allow using ? for flow control
            let result = (|| -> Result<String, String> {
                let device = CastDevice::connect_without_host_verification(&device_ip, 8009)
                    .map_err(|e| format!("Connect failed: {:?}", e))?;

                // Established TCP/TLS connection
                device
                    .connection
                    .connect("receiver-0")
                    .map_err(|e| format!("Connect receiver-0 failed: {:?}", e))?;

                // Send a heartbeat immediately to keep the connection alive
                device
                    .heartbeat
                    .ping()
                    .map_err(|e| format!("Heartbeat ping failed: {:?}", e))?;

                // Get status to ensure we can talk (wakes up device) and check if app is running
                println!("[Casting] Checking receiver status...");
                let status = device
                    .receiver
                    .get_status()
                    .map_err(|e| format!("Get status failed: {:?}", e))?;

                let app_id = APP_ID;
                let mut transport_id = String::new();
                let mut session_id = String::new();
                let mut app_found = false;

                // Check if our app is already running
                // Check if our app is already running
                for app in status.applications {
                    if app.app_id == app_id {
                        println!("[Casting] App {} is already running!", app_id);
                        transport_id = app.transport_id;
                        session_id = app.session_id;
                        app_found = true;
                        break;
                    }
                }

                if !app_found {
                    println!("[Casting] App not running, launching...");
                    let app_arg = CastDeviceApp::from_str(app_id).unwrap();
                    let app = device
                        .receiver
                        .launch_app(&app_arg)
                        .map_err(|e| format!("Launch app failed: {:?}", e))?;

                    transport_id = app.transport_id;
                    session_id = app.session_id;
                }

                println!(
                    "[Casting] Connected to App - transport: {}, session: {}",
                    transport_id, session_id
                );

                // Connect to the transport (app)
                device
                    .connection
                    .connect(&transport_id)
                    .map_err(|e| format!("Connect transport failed: {:?}", e))?;

                std::thread::sleep(Duration::from_millis(100));

                // Prepare Media
                let internal_ip = local_ip().map_err(|e| e.to_string())?;
                let port = crate::stream_server::get_server_port();

                println!("[Casting] Internal IP: {}, Port: {}", internal_ip, port);

                if port == 0 {
                    return Err("Stream server not started. Port is 0.".to_string());
                }

                let ext = if content_type.contains("x-mpegURL") || content_type.contains("mpegurl")
                {
                    "stream.m3u8"
                } else {
                    "stream.mp4"
                };

                let mut target_proxy_url = format!(
                    "http://{}:{}/proxy/{}?url={}",
                    internal_ip,
                    port,
                    ext,
                    urlencoding::encode(&url)
                );

                // Append headers to proxy URL
                if let Some(h) = &headers {
                    for (k, v) in h {
                        target_proxy_url.push_str(&format!(
                            "&{}={}",
                            urlencoding::encode(&k),
                            urlencoding::encode(&v)
                        ));
                    }
                }

                println!("[Casting] Proxy URL: {}", target_proxy_url);

                let mut tracks = Vec::new();
                let mut active_track_ids = Vec::new();
                
                if let Some(subs) = &subtitles {
                    for (i, sub) in subs.iter().enumerate() {
                        let track_id = (i + 1) as u16;
                        tracks.push(rust_cast::channels::media::Track {
                            track_id,
                            typ: "TEXT".to_string(),
                            track_content_id: Some(sub.url.clone()),
                            track_content_type: Some("text/vtt".to_string()),
                            name: Some(sub.label.clone()),
                            language: Some(sub.language.clone()),
                            subtype: Some("SUBTITLES".to_string()),
                        });
                        if sub.language.to_lowercase() == "en" || sub.language.to_lowercase() == "english" {
                            active_track_ids.push(track_id);
                        }
                    }
                }
                
                // If no english sub is found, just activate the first one
                if active_track_ids.is_empty() && !tracks.is_empty() {
                    active_track_ids.push(tracks[0].track_id);
                }

                let media = rust_cast::channels::media::Media {
                    content_id: target_proxy_url.clone(),
                    stream_type: rust_cast::channels::media::StreamType::Buffered,
                    content_type: content_type.clone(),
                    metadata: None,
                    duration: None,
                    tracks: if tracks.is_empty() { None } else { Some(tracks) },
                };

                let load_options = rust_cast::channels::media::LoadOptions {
                    active_track_ids: if active_track_ids.is_empty() { None } else { Some(active_track_ids) },
                    ..Default::default()
                };

                device
                    .media
                    .load_with_opts(&transport_id, &session_id, &media, load_options)
                    .map_err(|e| format!("Load media failed: {:?}", e))?;

                println!("[Casting] Media load command sent successfully");

                // Store device IP and session info
                {
                    let mut global_ip = CAST_DEVICE_IP.lock().unwrap();
                    *global_ip = device_ip.clone();

                    let mut global_transport = CURRENT_TRANSPORT_ID.lock().unwrap();
                    *global_transport = transport_id;

                    let mut global_session = CURRENT_SESSION_ID.lock().unwrap();
                    *global_session = session_id;
                }

                Ok(target_proxy_url)
            })();

            match result {
                Ok(msg) => {
                    // Success! Keep connection alive briefly then return
                    println!("[Casting] Keeping connection alive for initial fetch...");
                    std::thread::sleep(Duration::from_secs(3));
                    return Ok(msg);
                }
                Err(e) => {
                    println!("[Casting] Attempt {} failed: {}", attempt, e);
                    last_error = e;
                    // Wait before retry
                    std::thread::sleep(Duration::from_millis(1000));
                }
            }
        }

        Err(format!(
            "Failed after 3 attempts. Last error: {}",
            last_error
        ))
    })
    .await
    .map_err(|e| format!("Task failed: {}", e))?
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

    match action.as_str() {
        "stop" => {
            device
                .receiver
                .stop_app(&session_id)
                .map_err(|e| format!("{:?}", e))?;
        }
        _ => return Err("Control partially implemented".to_string()),
    }

    Ok(format!("Executed {}", action))
}
