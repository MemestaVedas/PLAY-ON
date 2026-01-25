use local_ip_address::local_ip;
use rust_cast::{channels::receiver::CastDeviceApp, CastDevice};
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

#[tauri::command]
pub async fn cast_discover() -> Result<Vec<String>, String> {
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

use std::net::ToSocketAddrs;

fn resolve_device_ip(name: &str) -> Option<String> {
    println!("[Casting] Resolving IP for: {}", name);

    if let Ok(mut addrs) = (name, 8009).to_socket_addrs() {
        if let Some(addr) = addrs.find(|a| a.is_ipv4()) {
            println!("[Casting] Resolved via OS (exact): {}", addr.ip());
            return Some(addr.ip().to_string());
        }
    }

    if !name.ends_with(".local") {
        let name_local = format!("{}.local", name);
        if let Ok(mut addrs) = (name_local.as_str(), 8009).to_socket_addrs() {
            if let Some(addr) = addrs.find(|a| a.is_ipv4()) {
                println!("[Casting] Resolved via OS (.local): {}", addr.ip());
                return Some(addr.ip().to_string());
            }
        }
    }

    println!("[Casting] OS resolution failed, trying manual mDNS discovery...");
    let mdns = mdns_sd::ServiceDaemon::new().ok()?;
    let receiver = mdns.browse("_googlecast._tcp.local.").ok()?;

    let start = std::time::Instant::now();
    while start.elapsed() < Duration::from_secs(3) {
        if let Ok(event) = receiver.recv_timeout(Duration::from_millis(100)) {
            if let mdns_sd::ServiceEvent::ServiceResolved(info) = event {
                let hostname = info.get_hostname().trim_end_matches('.');
                if hostname == name || info.get_fullname().contains(name) || name.contains(hostname)
                {
                    for ip in info.get_addresses() {
                        if ip.is_ipv4() {
                            println!("[Casting] Resolved via mDNS browse: {}", ip);
                            return Some(ip.to_string());
                        }
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
    content_type: String,
    headers: Option<HashMap<String, String>>,
) -> Result<String, String> {
    // Run the casting logic in a blocking task since rust_cast is synchronous and !Send
    tauri::async_runtime::spawn_blocking(move || {
        println!(
            "[Casting] command received: load_media for device={}, url={}, type={}",
            device_name, url, content_type
        );

        let device_ip = resolve_device_ip(&device_name).ok_or("Device not found")?;

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
                    .connect("sender-0")
                    .map_err(|e| format!("Connect sender-0 failed: {:?}", e))?;

                // Give the device plenty of time to set up the session before we ask for status
                std::thread::sleep(Duration::from_millis(1000));

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

                if port == 0 {
                    return Err("Stream server not started. Port is 0.".to_string());
                }

                let mut target_proxy_url = format!(
                    "http://{}:{}/proxy?url={}",
                    internal_ip,
                    port,
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

                // Create Media Object
                let media = rust_cast::channels::media::Media {
                    content_id: target_proxy_url,
                    stream_type: rust_cast::channels::media::StreamType::Buffered,
                    content_type: content_type.clone(),
                    metadata: None,
                    duration: None,
                };

                device
                    .media
                    .load(&transport_id, &session_id, &media)
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

                Ok("Media Loaded".to_string())
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
