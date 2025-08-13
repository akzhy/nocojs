#![deny(clippy::all)]

pub mod log;
pub mod placeholder_image;
pub mod store;
pub mod transform;

use napi_derive::napi;

use crate::transform::{TransformOptions, TransformOutput};

#[tokio::main]
#[napi]
pub async fn transform(
  code: String,
  file_path: String,
  options: TransformOptions,
) -> Option<TransformOutput> {
  let out = transform::transform(
    code.clone(),
    file_path,
    transform::TransformOptions {
      placeholder_type: options.placeholder_type,
      replace_function_call: options.replace_function_call,
      cache: options.cache,
      public_dir: options.public_dir,
      cache_file_dir: options.cache_file_dir,
      log_level: options.log_level,
      width: options.width,
      height: options.height,
      sourcemap_file_path: options.sourcemap_file_path,
    },
  )
  .await;

  out.unwrap_or(Some(TransformOutput {
    code: code,
    sourcemap: None,
    logs: Some(log::collect_logs()),
  }))
}
