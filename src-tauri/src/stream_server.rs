use std::collections::HashMap;
use std::sync::Mutex;
use tokio::net::TcpListener;
use tracing;
use warp::Filter;
// Global state to store the port we are listening on
lazy_static::lazy_static! {
    pub static ref SERVER_PORT: Mutex<u16> = Mutex::new(0);
}

pub async fn start_server() -> u16 {
    // Define the proxy route
    // GET /proxy?url=...
    let proxy_route = warp::path("proxy")
        .and(warp::query::<HashMap<String, String>>())
        .and_then(handle_proxy_request);

    // Cors
    let cors = warp::cors()
        .allow_any_origin()
        .allow_methods(vec!["GET", "POST", "OPTIONS"]);

    let routes = proxy_route.with(cors);

    // Use explicit TcpListener to bind to ephemeral port (Warp 0.4 bind_ephemeral change)
    let listener = TcpListener::bind("0.0.0.0:0").await.unwrap();
    let addr = listener.local_addr().unwrap();
    let port = addr.port();

    println!("[StreamServer] Starting local server on port {}", port);

    // Store the port
    if let Ok(mut p) = SERVER_PORT.lock() {
        *p = port;
    }

    // Spawn the server
    tokio::spawn(async move {
        warp::serve(routes).incoming(tokio_stream::wrappers::TcpListenerStream::new(listener));
    });

    port
}

async fn handle_proxy_request(
    params: HashMap<String, String>,
) -> Result<Box<dyn warp::Reply>, warp::Rejection> {
    let url = params.get("url").cloned().unwrap_or_default();
    if url.is_empty() {
        return Ok(Box::new(warp::reply::with_status(
            "Missing URL".to_string(),
            warp::http::StatusCode::BAD_REQUEST,
        )));
    }

    // Reconstruct headers from params (excluding 'url')
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

    println!("[StreamServer] Proxying: {}", url);

    // Create client
    let client = reqwest::Client::new();
    let res = client.get(&url).headers(headers).send().await;

    match res {
        Ok(response) => {
            let status = response.status();
            let headers = response.headers().clone();

            // Buffer the whole body to Bytes to avoid streaming issues for now
            let bytes = response.bytes().await.map_err(|e| {
                tracing::error!("Error buffering body: {}", e);
                warp::reject::reject()
            })?;

            // Build response
            let mut response_builder = warp::http::Response::builder().status(status);

            if let Some(ct) = headers.get(reqwest::header::CONTENT_TYPE) {
                response_builder = response_builder.header(reqwest::header::CONTENT_TYPE, ct);
            }
            if let Some(cl) = headers.get(reqwest::header::CONTENT_LENGTH) {
                response_builder = response_builder.header(reqwest::header::CONTENT_LENGTH, cl);
            }

            Ok(Box::new(response_builder.body(bytes).unwrap()))
        }
        Err(e) => Ok(Box::new(warp::reply::with_status(
            format!("Error: {}", e),
            warp::http::StatusCode::INTERNAL_SERVER_ERROR,
        ))),
    }
}

pub fn get_server_port() -> u16 {
    *SERVER_PORT.lock().unwrap()
}
