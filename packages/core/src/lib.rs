#![deny(clippy::all)]

pub mod transform;
pub mod placeholder_image;

use napi_derive::napi;

use crate::transform::TransformOutput;

#[napi]
pub fn plus_100(input: u32) -> u32 {
  input + 100
}

// #[napi]
// pub fn transform(code: String, file_path: String) -> Option<TransformOutput> {
//   transform::transform(transform::TransformOptions { code, file_path })
// }
