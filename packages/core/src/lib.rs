#![deny(clippy::all)]

pub mod placeholder_image;
pub mod transform;
pub mod store;

use std::time::Instant;

use napi_derive::napi;

use crate::transform::{TransformOptions, TransformOutput};

#[tokio::main]
#[napi]
pub async fn transform(options: TransformOptions) -> Option<TransformOutput> {
  let instant = Instant::now();
  let out = transform::transform(transform::TransformOptions {
    code: options.code,
    file_path: options.file_path,
    placeholder_type: options.placeholder_type,
    replace_function_call: options.replace_function_call,
    cache: options.cache,
    public_dir: options.public_dir,
    cache_file_dir: options.cache_file_dir,
  })
  .await;
  println!("Transformation took {:?}", instant.elapsed());
  out
}
