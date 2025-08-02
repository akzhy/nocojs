use base64::{engine::general_purpose, Engine as _};
use bytes::Bytes;
use fast_image_resize::{self as fir, images::Image};
use image::{GrayImage, ImageBuffer, ImageEncoder, ImageReader, RgbImage, Rgba};
use napi_derive::napi;
use reqwest::Client;
use std::fmt;
use std::{collections::HashMap, io::Cursor, time::Instant};

use crate::transform::PreviewOptions;

#[napi]
#[derive(Debug, Clone, PartialEq)]
pub enum PlaceholderImageOutputKind {
  Normal,
  BlackAndWhite,
  DominantColor,
  AverageColor,
  Transparent,
}

impl fmt::Display for PlaceholderImageOutputKind {
  fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
    let s = match self {
      PlaceholderImageOutputKind::Normal => "normal",
      PlaceholderImageOutputKind::BlackAndWhite => "black_and_white",
      PlaceholderImageOutputKind::DominantColor => "dominant_color",
      PlaceholderImageOutputKind::AverageColor => "average_color",
      PlaceholderImageOutputKind::Transparent => "transparent",
    };
    write!(f, "{}", s)
  }
}

pub struct ProcessImageOutput {
  pub base64_str: String,
  pub width: u32,
  pub height: u32,
}

enum DynamicImageWrapper {
  Rgb(RgbImage),
  Luma(GrayImage),
}

impl DynamicImageWrapper {
  fn dimensions(&self) -> (u32, u32) {
    match self {
      DynamicImageWrapper::Rgb(img) => img.dimensions(),
      DynamicImageWrapper::Luma(img) => img.dimensions(),
    }
  }

  fn into_raw(self) -> Vec<u8> {
    match self {
      DynamicImageWrapper::Rgb(img) => img.into_raw(),
      DynamicImageWrapper::Luma(img) => img.into_raw(),
    }
  }
}

pub async fn download_and_process_image(
  client: &Client,
  url: &str,
  options: &PreviewOptions,
) -> Result<ProcessImageOutput, Box<dyn std::error::Error>> {
  let download_time = Instant::now();
  println!("Downloading image from: {}", url);
  let bytes = client.get(url).send().await?.bytes().await?;
  println!("Image downloaded in: {:?} seconds", download_time.elapsed());
  process_image(&bytes, url, options).await
}

pub async fn process_image(
  bytes: &Bytes,
  url: &str,
  options: &PreviewOptions,
) -> Result<ProcessImageOutput, Box<dyn std::error::Error>> {
  println!("Processing image: {}", url);
  let image_processing_time = Instant::now();
  let img = ImageReader::new(Cursor::new(bytes))
    .with_guessed_format()?
    .decode()?;

  let img_rgb = {
    match options.output_kind {
      PlaceholderImageOutputKind::Normal => DynamicImageWrapper::Rgb(img.to_rgb8()),
      PlaceholderImageOutputKind::BlackAndWhite => DynamicImageWrapper::Luma(img.to_luma8()),
      PlaceholderImageOutputKind::DominantColor => DynamicImageWrapper::Rgb(img.to_rgb8()),
      PlaceholderImageOutputKind::AverageColor => DynamicImageWrapper::Rgb(img.to_rgb8()),
      PlaceholderImageOutputKind::Transparent => DynamicImageWrapper::Rgb(img.to_rgb8()),
    }
  };

  let pixel_type = match options.output_kind {
    PlaceholderImageOutputKind::Normal
    | PlaceholderImageOutputKind::DominantColor
    | PlaceholderImageOutputKind::AverageColor
    | PlaceholderImageOutputKind::Transparent => fir::PixelType::U8x3,
    PlaceholderImageOutputKind::BlackAndWhite => fir::PixelType::U8,
  };

  let color_type = match options.output_kind {
    PlaceholderImageOutputKind::Normal
    | PlaceholderImageOutputKind::DominantColor
    | PlaceholderImageOutputKind::AverageColor
    | PlaceholderImageOutputKind::Transparent => image::ExtendedColorType::Rgb8,
    PlaceholderImageOutputKind::BlackAndWhite => image::ExtendedColorType::L8,
  };

  let (width, height) = img_rgb.dimensions();
  let aspect_ratio = height as f32 / width as f32;
  let (new_width, new_height) = {
    if options.width.is_some() && options.height.is_some() {
      (options.width.unwrap(), options.height.unwrap())
    } else if options.width.is_some() {
      let new_width = options.width.unwrap();
      let new_height = (new_width as f32 * aspect_ratio) as u32;
      (new_width, new_height)
    } else if options.height.is_some() {
      let new_height = options.height.unwrap();
      let new_width = (new_height as f32 / aspect_ratio) as u32;
      (new_width, new_height)
    } else {
      let new_width = 16; // Default width
      let new_height = (new_width as f32 * aspect_ratio) as u32;
      (new_width, new_height)
    }
  };

  let src_image = fir::images::Image::from_vec_u8(
    std::num::NonZeroU32::new(width).unwrap().into(),
    std::num::NonZeroU32::new(height).unwrap().into(),
    img_rgb.into_raw(),
    pixel_type,
  )?;

  let mut dst_image = fir::images::Image::new(
    std::num::NonZeroU32::new(new_width).unwrap().into(),
    std::num::NonZeroU32::new(new_height).unwrap().into(),
    pixel_type,
  );

  let mut resizer = fir::Resizer::new();
  resizer.resize(
    &src_image,
    &mut dst_image,
    &fir::ResizeOptions {
      algorithm: fir::ResizeAlg::Nearest,
      ..fir::ResizeOptions::default()
    },
  )?;

  // Step 5: Encode resized image as PNG
  let mut png_bytes = Vec::new();
  image::codecs::png::PngEncoder::new(&mut png_bytes).write_image(
    &dst_image.buffer(),
    dst_image.width(),
    dst_image.height(),
    color_type,
  )?;

  let base64_str = {
    println!("Encoding image to base64 {:?}", options.output_kind);
    match options.output_kind {
      PlaceholderImageOutputKind::Normal | PlaceholderImageOutputKind::BlackAndWhite => {
        format!(
          "data:image/png;base64,{}",
          general_purpose::STANDARD.encode(&png_bytes)
        )
      }
      PlaceholderImageOutputKind::AverageColor | PlaceholderImageOutputKind::DominantColor => {
        let color_type = if options.output_kind == PlaceholderImageOutputKind::AverageColor {
          ColorType::Average
        } else {
          ColorType::Dominant
        };
        let color = get_color_from_image(&dst_image, color_type).unwrap();
        create_base64_rectangle(new_width, new_height, (color.0, color.1, color.2, 255)).unwrap()
      }
      PlaceholderImageOutputKind::Transparent => {
        create_base64_rectangle(new_width, new_height, (0, 0, 0, 0)).unwrap()
      }
    }
  };

  println!(
    "Image processed in: {:?} seconds",
    image_processing_time.elapsed()
  );

  Ok(ProcessImageOutput {
    base64_str,
    width: new_width,
    height: new_height,
  })
}

#[derive(PartialEq)]
enum ColorType {
  Dominant,
  Average,
}

fn get_color_from_image(
  image: &Image,
  color_type: ColorType,
) -> Result<(u8, u8, u8), Box<dyn std::error::Error>> {
  let mut color_count = HashMap::new();
  let buf = image.buffer();
  let stride = 3; // Assuming U8x3 (RGB)

  for chunk in buf.chunks_exact(stride) {
    if let [r, g, b] = chunk {
      let rgb = (*r, *g, *b);
      *color_count.entry(rgb).or_insert(0) += 1;
    }
  }

  if color_type == ColorType::Average {
    // Calculate average color
    let total_pixels = buf.len() / stride;
    let (r_sum, g_sum, b_sum) =
      color_count
        .iter()
        .fold((0, 0, 0), |(r_acc, g_acc, b_acc), (&(r, g, b), count)| {
          (
            r_acc + r as u32 * count,
            g_acc + g as u32 * count,
            b_acc + b as u32 * count,
          )
        });

    let avg_r = (r_sum / total_pixels as u32) as u8;
    let avg_g = (g_sum / total_pixels as u32) as u8;
    let avg_b = (b_sum / total_pixels as u32) as u8;

    return Ok((avg_r, avg_g, avg_b));
  }
  // Find the color with the highest frequency
  let dominant = color_count
    .into_iter()
    .max_by_key(|entry| entry.1)
    .unwrap()
    .0;
  Ok((dominant.0, dominant.1, dominant.2))
}

fn create_base64_rectangle(
  width: u32,
  height: u32,
  color: (u8, u8, u8, u8),
) -> Result<String, Box<dyn std::error::Error>> {
  // Parse color like "#FF0000" or "FF0000"
  let (r, g, b, a) = color;

  // Create the image buffer filled with the color
  let pixel = Rgba([r, g, b, a]);
  let img: ImageBuffer<Rgba<u8>, Vec<u8>> = ImageBuffer::from_fn(width, height, |_x, _y| pixel);

  // Encode to PNG in-memory
  let mut buffer = Cursor::new(Vec::new());
  img.write_to(&mut buffer, image::ImageFormat::Png)?;

  // Encode to base64
  let base64_string = general_purpose::STANDARD.encode(buffer.get_ref());
  Ok(format!("data:image/png;base64,{}", base64_string))
}
