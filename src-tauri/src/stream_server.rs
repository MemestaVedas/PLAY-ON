use std::collections::HashMap;
use std::sync::Mutex;
use warp::Filter;

lazy_static::lazy_static! {
    pub static ref SERVER_PORT: Mutex<u16> = Mutex::new(0);
}

pub async fn start_server() -> u16 {
    let proxy_route = warp::path("proxy")
        .and(warp::query::<HashMap<String, String>>())
        .and(warp::header::optional::<String>("range"))
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

    tokio::spawn(warp::serve(routes).bind(addr));
    tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;

    port
}

async fn handle_proxy_request(
    params: HashMap<String, String>,
    range_header: Option<String>,
) -> Result<warp::http::Response<Vec<u8>>, warp::Rejection> {
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
            if let Ok(header_name) = reqwest::header::HeaderName::from_bytes(key.as_bytes()) {
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

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(300))
        .build()
        .unwrap_or_else(|_| reqwest::Client::new());

    let res = client.get(&url).headers(headers).send().await;

    match res {
        Ok(response) => {
            let status = response.status();
            let response_headers = response.headers().clone();

            println!("[StreamServer] Response status: {}", status);

            // Get bytes from the response
            let bytes = response.bytes().await.map_err(|e| {
                tracing::error!("Failed to get bytes: {}", e);
                warp::reject::reject()
            })?;

            let mut builder = warp::http::Response::builder().status(status);

            if let Some(ct) = response_headers.get(reqwest::header::CONTENT_TYPE) {
                builder = builder.header(reqwest::header::CONTENT_TYPE, ct);
            }
            if let Some(cl) = response_headers.get(reqwest::header::CONTENT_LENGTH) {
                builder = builder.header(reqwest::header::CONTENT_LENGTH, cl);
            }
            if let Some(cr) = response_headers.get(reqwest::header::CONTENT_RANGE) {
                builder = builder.header(reqwest::header::CONTENT_RANGE, cr);
            }
            if let Some(ar) = response_headers.get(reqwest::header::ACCEPT_RANGES) {
                builder = builder.header(reqwest::header::ACCEPT_RANGES, ar);
            } else {
                builder = builder.header("Accept-Ranges", "bytes");
            }

            Ok(builder.body(bytes.to_vec()).unwrap())
        }
        Err(e) => {
            tracing::error!("Proxy request failed: {}", e);
            Ok(warp::http::Response::builder()
                .status(warp::http::StatusCode::INTERNAL_SERVER_ERROR)
                .body(format!("Error: {}", Xe).into_bytes())
                .unwrap())
        }
    }
}

pub fn get_server_port() -> u16 {
    *SERVER_PORT.lock().unwrap()
}
