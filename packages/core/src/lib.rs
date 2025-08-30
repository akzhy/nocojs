#![deny(clippy::all)]
#![allow(clippy::uninlined_format_args)]

pub mod log;
pub mod placeholder_image;
pub mod store;
pub mod transform;
pub mod get_placeholder;

use napi_derive::napi;

use crate::transform::{TransformOptions, TransformOutput};

#[cfg_attr(target_arch = "wasm32", napi::tokio::main(flavor = "current_thread"))]
#[cfg_attr(not(target_arch = "wasm32"), napi::tokio::main)]
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
      wrap_with_svg: options.wrap_with_svg,
    },
  )
  .await;

  out.unwrap_or(Some(TransformOutput {
    code,
    sourcemap: None,
    logs: Some(log::collect_logs()),
  }))
}
