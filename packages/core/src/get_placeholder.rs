use napi_derive::napi;
use std::{path::PathBuf, time::Duration};

use bytes::Bytes;
use once_cell::sync::Lazy;
use reqwest::Client;
use rusqlite::{params, Connection};
use url::Url;

use crate::{
  log::{create_log, style_error, LogLevel},
  placeholder_image::{process_image, PlaceholderImageOutputKind},
  store::Store,
  transform::{init_cache_dir, setup_sqlite, PreviewOptions, RUSQLITE_FILE_NAME},
};

#[napi(object)]
pub struct GetPlaceholderOptions {
  pub preview_options: PreviewOptions,
  pub cache_file_dir: Option<String>,
  pub public_dir: Option<String>,
}

#[napi(object)]
pub struct GetPlaceholderOutput {
  pub placeholder: String,
}

static HTTP_CLIENT: Lazy<Client> = Lazy::new(|| {
  Client::builder()
    .timeout(Duration::from_secs(10))
    .build()
    .unwrap()
});

pub async fn get_placeholder(
  url: String,
  options: GetPlaceholderOptions,
) -> Result<GetPlaceholderOutput, Box<dyn std::error::Error>> {
  let cache_dir = init_cache_dir(
    &options
      .cache_file_dir
      .clone()
      .unwrap_or(".nocojs".to_string()),
  )
  .unwrap_or("".to_string());

  let db_filepath = PathBuf::from(&cache_dir).join(RUSQLITE_FILE_NAME);
  let conn = Connection::open(&db_filepath).unwrap();

  let _ = setup_sqlite(&conn);

  if let Some(placeholder) = check_cache(url.clone(), &options.preview_options, &conn) {
    return Ok(GetPlaceholderOutput { placeholder });
  }

  let bytes = get_bytes(url.clone(), &options).await.unwrap();

  match process_image(&bytes, &url, &options.preview_options).await {
    Ok(out) => {
      let cache_key = Store::create_cache_key(&options.preview_options);
      let to_insert = (
        url.clone(),
        out.base64_str.clone(),
        PlaceholderImageOutputKind::get_string_name(&options.preview_options.output_kind.clone()),
        cache_key.clone(),
        out.original_width,
        out.original_height,
      );

      conn.execute(
        "INSERT INTO images (url, placeholder, preview_type, cache_key, original_width, original_height) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![
          to_insert.0,
          to_insert.1,
          to_insert.2,
          to_insert.3,
          to_insert.4,
          to_insert.5
        ],
      )?;

      Ok(GetPlaceholderOutput {
        placeholder: out.base64_str,
      })
    }
    Err(e) => {
      create_log(
        format!("Failed to process image {}. Error: {}", url, e),
        LogLevel::Error,
      );
      Err("Failed to process image".into())
    }
  }
}

fn check_cache(url: String, preview_options: &PreviewOptions, conn: &Connection) -> Option<String> {
  let cache_key = Store::create_cache_key(preview_options);
  let sql = "SELECT id, placeholder FROM images WHERE url = ? AND cache_key = ?";
  let params = params![url, cache_key];
  conn.query_row(sql, params, |row| row.get(1)).ok()
}

async fn get_bytes(
  url: String,
  options: &GetPlaceholderOptions,
) -> Result<Bytes, Box<dyn std::error::Error>> {
  let url_parse = Url::parse(&url);

  if url_parse.is_err() {
    // Assumes the URL is a relative path to an image in the public directory
    let public_dir = options.public_dir.clone().unwrap_or("public".to_string());
    let relative_url = url.strip_prefix("/").unwrap_or(&url);
    let image_path = PathBuf::from(public_dir.clone()).join(relative_url);

    if !image_path.exists() {
      return Err("Image not found".into());
    }

    let file_read = std::fs::read(image_path.as_path());
    if file_read.is_err() {
      create_log(
        style_error(format!(
          "Failed to read image from public directory: {:?} {:?}",
          image_path, public_dir
        )),
        LogLevel::Error,
      );
      return Err("Failed to read image from public directory".into());
    }
    let bytes = Bytes::from(file_read.unwrap());
    return Ok(bytes);
  } else {
    let bytes = HTTP_CLIENT.get(url).send().await?.bytes().await?;
    return Ok(bytes);
  }
}
