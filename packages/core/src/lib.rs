#![deny(clippy::all)]

pub mod placeholder_image;
pub mod transform;

use napi_derive::napi;

use crate::transform::{TransformOptions, TransformOutput};

#[tokio::main]
#[napi]
pub async fn transform(options: TransformOptions) -> Option<TransformOutput> {
  transform::transform(transform::TransformOptions {
    code: options.code,
    file_path: options.file_path,
    placeholder_image_kind: options.placeholder_image_kind,
    replace_function_call: options.replace_function_call,
    cache: options.cache,
    public_dir: options.public_dir,
    cache_file_dir: options.cache_file_dir,
  })
  .await
}
