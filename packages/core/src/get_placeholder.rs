use napi_derive::napi;
use std::{path::PathBuf, time::Duration};

use bytes::Bytes;
use once_cell::sync::Lazy;
use reqwest::Client;
use rusqlite::{params, Connection};
use url::Url;

use crate::{
  log::{self, collect_logs, create_log, style_error, LogLevel},
  placeholder_image::{process_image, wrap_with_svg, PlaceholderImageOutputKind},
  store::Store,
  transform::{init_cache_dir, setup_sqlite, PreviewOptions, RUSQLITE_FILE_NAME},
};

#[napi(object)]
pub struct GetPlaceholderOptions {
  pub width: Option<u32>,
  pub height: Option<u32>,
  pub output_kind: Option<PlaceholderImageOutputKind>,
  pub cache_file_dir: Option<String>,
  pub cache: Option<bool>,
  pub wrap_with_svg: Option<bool>,
}

#[napi(object)]
pub struct GetPlaceholderOutput {
  pub placeholder: String,
  pub logs: Vec<log::Log>,
  pub is_error: bool,
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

  let preview_options = PreviewOptions {
    width: options.width,
    height: options.height,
    output_kind: options
      .output_kind
      .clone()
      .unwrap_or(PlaceholderImageOutputKind::Normal),
    cache: options.cache.unwrap_or(true),
    wrap_with_svg: options.wrap_with_svg.unwrap_or(true),
    replace_function_call: false,
  };

  let db_filepath = PathBuf::from(&cache_dir).join(RUSQLITE_FILE_NAME);
  let conn = Connection::open(&db_filepath).unwrap();

  let _ = setup_sqlite(&conn);

  if let Ok((placeholder, original_width, original_height)) =
    check_cache(url.clone(), &preview_options, &conn)
  {
    create_log(format!("Cache hit for {}", url), LogLevel::Info);

    return Ok(GetPlaceholderOutput {
      placeholder: if preview_options.wrap_with_svg {
        wrap_with_svg(placeholder, original_width, original_height)
      } else {
        placeholder
      },
      logs: collect_logs(),
      is_error: false,
    });
  }

  let bytes = get_bytes(url.clone()).await?;

  match process_image(&bytes, &url, &preview_options).await {
    Ok(out) => {
      if !preview_options.cache {
        return Ok(GetPlaceholderOutput {
          placeholder: {
            if preview_options.wrap_with_svg {
              wrap_with_svg(out.base64_str, out.original_width, out.original_height)
            } else {
              out.base64_str
            }
          },
          logs: collect_logs(),
          is_error: false,
        });
      }

      let cache_key = Store::create_cache_key(&preview_options);
      let to_insert = (
        url.clone(),
        out.base64_str.clone(),
        PlaceholderImageOutputKind::get_string_name(&preview_options.output_kind.clone()),
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
        placeholder: if preview_options.wrap_with_svg {
          wrap_with_svg(out.base64_str, out.original_width, out.original_height)
        } else {
          out.base64_str
        },
        logs: collect_logs(),
        is_error: false,
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

fn check_cache(
  url: String,
  preview_options: &PreviewOptions,
  conn: &Connection,
) -> Result<(String, u32, u32), Box<dyn std::error::Error>> {
  let cache_key = Store::create_cache_key(preview_options);
  let sql = "SELECT id, placeholder, original_width, original_height FROM images WHERE url = ? AND cache_key = ?";
  let params = params![url, cache_key];
  let result = conn.query_row(sql, params, |row| {
    let placeholder: String = row.get(1)?;
    let original_width: u32 = row.get(2)?;
    let original_height: u32 = row.get(3)?;
    Ok((placeholder, original_width, original_height))
  })?;

  Ok(result)
}

async fn get_bytes(url: String) -> Result<Bytes, Box<dyn std::error::Error>> {
  let url_parse = Url::parse(&url);

  if url_parse.is_err() {
    let image_path = PathBuf::from(url);

    if !image_path.exists() {
      return Err("Image not found".into());
    }

    let file_read = std::fs::read(image_path.as_path());
    if file_read.is_err() {
      create_log(
        style_error(format!("Failed to read image from path: {:?}", image_path)),
        LogLevel::Error,
      );
      return Err("Failed to read image from path".into());
    }
    let bytes = Bytes::from(file_read.unwrap());
    Ok(bytes)
  } else {
    let bytes = HTTP_CLIENT.get(url).send().await?.bytes().await?;
    Ok(bytes)
  }
}
