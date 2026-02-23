use std::collections::HashMap;
use std::sync::Mutex;
use warp::Filter;

lazy_static::lazy_static! {
    pub static ref SERVER_PORT: Mutex<u16> = Mutex::new(0);
}

pub async fn start_server() -> u16 {
    let proxy_route = warp::path!("proxy" / String)
        .and(warp::query::<HashMap<String, String>>())
        .and(warp::header::optional::<String>("range"))
        .and(warp::host::optional())
        .map(|_filename: String, queries, range, host| (queries, range, host))
        .untuple_one()
        .and_then(handle_proxy_request);

    let cors = warp::cors()
        .allow_any_origin()
        .allow_methods(vec!["GET", "POST", "OPTIONS", "HEAD"])
        .allow_headers(vec![
            "Range",
            "Content-Type",
            "Origin",
            "Accept",
            "Authorization",
            "User-Agent",
            "Referer",
            "Accept-Encoding",
            "Accept-Language",
            "Cache-Control",
            "Connection",
            "Host",
            "Pragma",
        ])
        .expose_headers(vec![
            "Content-Range",
            "Content-Length",
            "Accept-Ranges",
            "Content-Type",
        ]);

    let routes = proxy_route.with(cors);

    // Find a free port manually
    let listener = std::net::TcpListener::bind("0.0.0.0:0").expect("Failed to bind");
    let port = listener.local_addr().unwrap().port();
    drop(listener);

    let addr = ([0, 0, 0, 0], port);

    println!("[StreamServer] Starting local server on port {}", port);

    if let Ok(mut p) = SERVER_PORT.lock() {
        *p = port;
    }

    tokio::spawn(warp::serve(routes).run(addr));
    tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;

    port
}

#[tauri::command]
pub async fn get_proxy_status() -> Result<String, String> {
    let port = if let Ok(p) = SERVER_PORT.lock() {
        *p
    } else {
        0
    };

    if port == 0 {
        return Err("Proxy server not started".to_string());
    }

    let ip = local_ip_address::local_ip()
        .map(|ip| ip.to_string())
        .unwrap_or_else(|_| "Unknown".to_string());

    Ok(format!("{}:{}", ip, port))
}

async fn handle_proxy_request(
    params: HashMap<String, String>,
    range_header: Option<String>,
    authority: Option<warp::host::Authority>,
) -> Result<warp::http::Response<Vec<u8>>, warp::Rejection> {
    println!(
        "[StreamServer] Received proxy request: authority={:?}, params={:?}",
        authority, params
    );
    let url = params.get("url").cloned().unwrap_or_default();
    if url.is_empty() {
        return Ok(warp::http::Response::builder()
            .status(warp::http::StatusCode::BAD_REQUEST)
            .body(b"Missing URL".to_vec())
            .unwrap());
    }

    let mut headers = reqwest::header::HeaderMap::new();
    for (key, value) in &params {
        if key != "url" {
            let lower_key = key.to_lowercase();
            if let Ok(header_name) = reqwest::header::HeaderName::from_bytes(lower_key.as_bytes()) {
                if let Ok(header_value) = reqwest::header::HeaderValue::from_str(value) {
                    headers.insert(header_name, header_value);
                }
            }
        }
    }

    if let Some(range) = range_header {
        println!("[StreamServer] Forwarding Range header: {}", range);
        if let Ok(val) = reqwest::header::HeaderValue::from_str(&range) {
            headers.insert(reqwest::header::RANGE, val);
        }
    }

    println!("[StreamServer] Proxying: {}", url);

    let max_retries = 3;
    let mut attempt = 0;
    let mut force_refresh = false;

    let url_obj_res = reqwest::Url::parse(&url);

    loop {
        attempt += 1;

        let mut client_builder =
            reqwest::Client::builder().timeout(std::time::Duration::from_secs(300));

        if let Ok(url_obj) = &url_obj_res {
            if let Some(host) = url_obj.host_str() {
                if let Some(ip) = crate::resolve_host(host, force_refresh).await {
                    let port = url_obj.port_or_known_default().unwrap_or(443);
                    let addr = std::net::SocketAddr::new(ip, port);
                    client_builder = client_builder.resolve(host, addr);
                }
            }
        }

        let client = client_builder
            .build()
            .unwrap_or_else(|_| reqwest::Client::new());

        let res = client.get(&url).headers(headers.clone()).send().await;

        match res {
            Ok(response) => {
                let status = response.status();

                if status.is_server_error() && attempt < max_retries {
                    println!(
                        "[StreamServer] Server error {}, retrying (attempt {}/{})",
                        status, attempt, max_retries
                    );
                    force_refresh = true;
                    tokio::time::sleep(tokio::time::Duration::from_millis(1000 * attempt)).await;
                    continue;
                }

                let response_headers = response.headers().clone();

                println!("[StreamServer] Response status: {}", status);

                // Get bytes from the response
                let bytes = match response.bytes().await {
                    Ok(b) => b,
                    Err(e) if attempt < max_retries => {
                        println!(
                            "[StreamServer] Failed to get bytes: {}, retrying (attempt {}/{})",
                            e, attempt, max_retries
                        );
                        force_refresh = true;
                        tokio::time::sleep(tokio::time::Duration::from_millis(1000 * attempt))
                            .await;
                        continue;
                    }
                    Err(e) => {
                        tracing::error!("Failed to get bytes: {}", e);
                        return Err(warp::reject::reject());
                    }
                };

                let mut bytes_vec = bytes.to_vec();
                let mut is_m3u8 = url.contains(".m3u8");

                if let Some(ct) = response_headers.get(reqwest::header::CONTENT_TYPE) {
                    let ct_str = ct.to_str().unwrap_or("");
                    if ct_str.contains("mpegurl") || ct_str.contains("m3u8") {
                        is_m3u8 = true;
                    }
                }

                if is_m3u8 {
                    if let Ok(text) = String::from_utf8(bytes_vec.clone()) {
                        if let Ok(base_url) = reqwest::Url::parse(&url) {
                            let mut rewritten = String::new();
                            let host_str = if let Some(auth) = &authority {
                                format!("http://{}", auth)
                            } else {
                                let internal_ip = local_ip_address::local_ip()
                                    .map(|ip| ip.to_string())
                                    .unwrap_or_else(|_| "127.0.0.1".to_string());
                                let port = get_server_port();
                                format!("http://{}:{}", internal_ip, port)
                            };
                            println!("[StreamServer] Using host_str for rewrite: {}", host_str);

                            let uri_re = regex::Regex::new(r#"URI="([^"]+)""#).unwrap();

                            for line in text.lines() {
                                let trimmed = line.trim();
                                if trimmed.is_empty() {
                                    continue;
                                }
                                if trimmed.starts_with('#') {
                                    if trimmed.contains("URI=\"") {
                                        let rewritten_line = uri_re.replace_all(
                                            trimmed,
                                            |caps: &regex::Captures| {
                                                let original_uri = &caps[1];
                                                let abs_url = if original_uri.starts_with("http") {
                                                    original_uri.to_string()
                                                } else if let Ok(joined) =
                                                    base_url.join(original_uri)
                                                {
                                                    joined.to_string()
                                                } else {
                                                    original_uri.to_string()
                                                };

                                                let ext = if abs_url.contains(".m3u8") {
                                                    "stream.m3u8"
                                                } else {
                                                    "stream.ts"
                                                };

                                                let mut new_params = params.clone();
                                                new_params.insert("url".to_string(), abs_url);

                                                let mut query = String::new();
                                                for (k, v) in &new_params {
                                                    if !query.is_empty() {
                                                        query.push('&');
                                                    }
                                                    query.push_str(&format!(
                                                        "{}={}",
                                                        urlencoding::encode(k),
                                                        urlencoding::encode(v)
                                                    ));
                                                }
                                                format!(
                                                    "URI=\"{}/proxy/{}?{}\"",
                                                    host_str, ext, query
                                                )
                                            },
                                        );
                                        rewritten.push_str(&rewritten_line);
                                        rewritten.push('\n');
                                    } else {
                                        rewritten.push_str(trimmed);
                                        rewritten.push('\n');
                                    }
                                } else {
                                    let abs_url = if trimmed.starts_with("http") {
                                        trimmed.to_string()
                                    } else if let Ok(joined) = base_url.join(trimmed) {
                                        joined.to_string()
                                    } else {
                                        trimmed.to_string()
                                    };

                                    let ext = if abs_url.contains(".m3u8") {
                                        "stream.m3u8"
                                    } else {
                                        "stream.ts"
                                    };

                                    let mut new_params = params.clone();
                                    new_params.insert("url".to_string(), abs_url);

                                    let mut query = String::new();
                                    for (k, v) in &new_params {
                                        if !query.is_empty() {
                                            query.push('&');
                                        }
                                        query.push_str(&format!(
                                            "{}={}",
                                            urlencoding::encode(k),
                                            urlencoding::encode(v)
                                        ));
                                    }

                                    let rewrite_url =
                                        format!("{}/proxy/{}?{}", host_str, ext, query);
                                    rewritten.push_str(&rewrite_url);
                                    rewritten.push('\n');
                                }
                            }
                            bytes_vec = rewritten.into_bytes();
                        }
                    }
                }

                let mut builder = warp::http::Response::builder().status(status);

                if is_m3u8 {
                    builder =
                        builder.header(reqwest::header::CONTENT_TYPE, "application/x-mpegURL");
                } else if let Some(ct) = response_headers.get(reqwest::header::CONTENT_TYPE) {
                    builder = builder.header(reqwest::header::CONTENT_TYPE, ct);
                }

                // Always use the actual length of the byte vector because reqwest transparently decompresses
                builder =
                    builder.header(reqwest::header::CONTENT_LENGTH, bytes_vec.len().to_string());

                if let Some(cr) = response_headers.get(reqwest::header::CONTENT_RANGE) {
                    builder = builder.header(reqwest::header::CONTENT_RANGE, cr);
                }
                if let Some(ar) = response_headers.get(reqwest::header::ACCEPT_RANGES) {
                    builder = builder.header(reqwest::header::ACCEPT_RANGES, ar);
                } else {
                    builder = builder.header("Accept-Ranges", "bytes");
                }

                return Ok(builder.body(bytes_vec).unwrap());
            }
            Err(e) if attempt < max_retries => {
                println!(
                    "[StreamServer] Proxy request failed: {}, retrying (attempt {}/{})",
                    e, attempt, max_retries
                );
                force_refresh = true;
                tokio::time::sleep(tokio::time::Duration::from_millis(1000 * attempt)).await;
                continue;
            }
            Err(e) => {
                tracing::error!("Proxy request failed: {}", e);
                return Ok(warp::http::Response::builder()
                    .status(warp::http::StatusCode::INTERNAL_SERVER_ERROR)
                    .body(format!("Error: {}", e).into_bytes())
                    .unwrap());
            }
        }
    }
}

pub fn get_server_port() -> u16 {
    *SERVER_PORT.lock().unwrap()
}
