use avif_decode::{Decoder, Image as AvifImage};
use base64::{engine::general_purpose, Engine as _};
use bytes::Bytes;
use fast_image_resize::{self as fir, images::Image};
use image::{
  DynamicImage, GrayImage, ImageBuffer, ImageEncoder, ImageFormat, ImageReader, RgbImage, Rgba,
};
use napi_derive::napi;
use reqwest::Client;
use std::{collections::HashMap, io::Cursor, time::Instant};

use crate::{
  log::{create_log, style_info, LogLevel},
  transform::PreviewOptions,
};

#[napi]
#[derive(Debug, Clone, PartialEq)]
pub enum PlaceholderImageOutputKind {
  Normal,
  Blurred,
  Grayscale,
  DominantColor,
  AverageColor,
  Transparent,
}

impl PlaceholderImageOutputKind {
  pub fn get_string_name(&self) -> String {
    match self {
      PlaceholderImageOutputKind::Normal => "normal".to_string(),
      PlaceholderImageOutputKind::Blurred => "blurred".to_string(),
      PlaceholderImageOutputKind::Grayscale => "grayscale".to_string(),
      PlaceholderImageOutputKind::DominantColor => "dominant-color".to_string(),
      PlaceholderImageOutputKind::AverageColor => "average-color".to_string(),
      PlaceholderImageOutputKind::Transparent => "transparent".to_string(),
    }
  }

  pub fn from_string(s: &str) -> PlaceholderImageOutputKind {
    match s {
      "normal" => PlaceholderImageOutputKind::Normal,
      "blurred" => PlaceholderImageOutputKind::Blurred,
      "grayscale" => PlaceholderImageOutputKind::Grayscale,
      "dominant-color" => PlaceholderImageOutputKind::DominantColor,
      "average-color" => PlaceholderImageOutputKind::AverageColor,
      "transparent" => PlaceholderImageOutputKind::Transparent,
      _ => PlaceholderImageOutputKind::Normal,
    }
  }
}

pub struct ProcessImageOutput {
  pub base64_str: String,
  pub width: u32,
  pub height: u32,
  pub original_width: u32,
  pub original_height: u32,
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

/// Downloads an image from the given URL and processes it according to the specified options.
pub async fn download_and_process_image(
  client: &Client,
  url: &str,
  options: &PreviewOptions,
) -> Result<ProcessImageOutput, Box<dyn std::error::Error>> {
  let download_time = Instant::now();
  create_log(
    style_info(format!("Downloading image from {url}")),
    LogLevel::Info,
  );

  let bytes = client.get(url).send().await?.bytes().await?;
  let elapsed = download_time.elapsed();

  create_log(
    style_info(format!("Downloaded image from {url} in {elapsed:?}")),
    LogLevel::Info,
  );

  process_image(&bytes, url, options).await
}

/// Processes the image bytes and returns a base64 encoded string of the processed image.
/// The processing includes resizing, converting to the specified output kind,
/// and encoding as PNG.
pub async fn process_image(
  bytes: &Bytes,
  url: &str,
  options: &PreviewOptions,
) -> Result<ProcessImageOutput, Box<dyn std::error::Error>> {
  let process_time = Instant::now();
  let img = ImageReader::new(Cursor::new(bytes)).with_guessed_format()?;

  let img_format = img
    .format()
    .ok_or_else(|| Box::<dyn std::error::Error>::from("Could not determine image format"))?;

  let img = if img_format == ImageFormat::Avif {
    process_avif_image(&bytes).map_err(|e| {
      create_log(
        style_info(format!(
          "Failed to process AVIF image from {url}: {e}"
        )),
        LogLevel::Error,
      );
      e
    })?
  } else {
    match img.decode() {
      Ok(decoded) => decoded,
      Err(e) => {
        create_log(
          style_info(format!("Failed to decode image from {url}: {e}")),
          LogLevel::Error,
        );
        return Err(Box::<dyn std::error::Error>::from("Failed to resolve image"));
      }
    }
  };

  let img_rgb = {
    match options.output_kind {
      PlaceholderImageOutputKind::Normal => DynamicImageWrapper::Rgb(img.to_rgb8()),
      PlaceholderImageOutputKind::Blurred => DynamicImageWrapper::Rgb(img.to_rgb8()),
      PlaceholderImageOutputKind::Grayscale => DynamicImageWrapper::Luma(img.to_luma8()),
      PlaceholderImageOutputKind::DominantColor => DynamicImageWrapper::Rgb(img.to_rgb8()),
      PlaceholderImageOutputKind::AverageColor => DynamicImageWrapper::Rgb(img.to_rgb8()),
      PlaceholderImageOutputKind::Transparent => DynamicImageWrapper::Rgb(img.to_rgb8()),
    }
  };

  let pixel_type = match options.output_kind {
    PlaceholderImageOutputKind::Normal
    | PlaceholderImageOutputKind::Blurred
    | PlaceholderImageOutputKind::DominantColor
    | PlaceholderImageOutputKind::AverageColor
    | PlaceholderImageOutputKind::Transparent => fir::PixelType::U8x3,
    PlaceholderImageOutputKind::Grayscale => fir::PixelType::U8,
  };

  let color_type = match options.output_kind {
    PlaceholderImageOutputKind::Normal
    | PlaceholderImageOutputKind::Blurred
    | PlaceholderImageOutputKind::DominantColor
    | PlaceholderImageOutputKind::AverageColor
    | PlaceholderImageOutputKind::Transparent => image::ExtendedColorType::Rgb8,
    PlaceholderImageOutputKind::Grayscale => image::ExtendedColorType::L8,
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
    dst_image.buffer(),
    dst_image.width(),
    dst_image.height(),
    color_type,
  )?;

  let base64_str = {
    match options.output_kind {
      PlaceholderImageOutputKind::Normal | PlaceholderImageOutputKind::Grayscale => {
        let png_data = format!(
          "data:image/png;base64,{}",
          general_purpose::STANDARD.encode(&png_bytes)
        );

        png_data
      }
      PlaceholderImageOutputKind::Blurred => {
        let data_src = general_purpose::STANDARD.encode(&png_bytes);
        create_blurred_preview_url(&data_src, width, height)
      }
      PlaceholderImageOutputKind::AverageColor | PlaceholderImageOutputKind::DominantColor => {
        let color_type = if options.output_kind == PlaceholderImageOutputKind::AverageColor {
          ColorType::Average
        } else {
          ColorType::Dominant
        };
        let color = get_color_from_image(&dst_image, color_type)?;

        create_base64_rectangle(new_width, new_height, (color.0, color.1, color.2, 255))?
      }
      PlaceholderImageOutputKind::Transparent => {
        create_base64_rectangle(new_width, new_height, (0, 0, 0, 0))?
      }
    }
  };

  let elapsed = process_time.elapsed();
  create_log(
    style_info(format!("Processed image {url} in {elapsed:?}")),
    LogLevel::Info,
  );

  Ok(ProcessImageOutput {
    base64_str,
    width: new_width,
    height: new_height,
    original_width: width,
    original_height: height,
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
  let (r, g, b, a) = color;

  // Create the image buffer filled with the color
  let pixel = Rgba([r, g, b, a]);
  let img: ImageBuffer<Rgba<u8>, Vec<u8>> = ImageBuffer::from_fn(width, height, |_x, _y| pixel);

  // Encode to PNG in-memory
  let mut buffer = Cursor::new(Vec::new());
  img.write_to(&mut buffer, image::ImageFormat::Png)?;

  let base64_string = general_purpose::STANDARD.encode(buffer.get_ref());
  Ok(format!("data:image/png;base64,{}", base64_string))
}

fn create_blurred_preview_url(data_src: &str, width: u32, height: u32) -> String {
  let svg = format!(
    r#"<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 {w} {h}' width='{w}' height='{h}'><filter id='b' color-interpolation-filters='sRGB'><feGaussianBlur stdDeviation='{d}'/><feColorMatrix values='1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 100 -1' result='s'/><feFlood x='0' y='0' width='100%' height='100%'/><feComposite operator='out' in='s'/><feComposite in2='SourceGraphic'/><feGaussianBlur stdDeviation='{d}'/></filter><image width='100%' height='100%' x='0' y='0' preserveAspectRatio='none' style='filter: url(#b);' href='data:image/png;base64,___DATA___'/></svg>"#,
    w = width,
    h = height,
    d = (width as f32 * 0.05).round()
  );

  let formatted = format!("data:image/svg+xml,{}", urlencoding::encode(&svg));
  formatted.replace("___DATA___", data_src)
}

pub fn wrap_with_svg(data_src: String, width: u32, height: u32) -> String {
  let svg = format!(
    r#"<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 {w} {h}' width='{w}' height='{h}'><image width='100%' height='100%' x='0' y='0' preserveAspectRatio='none' href='___DATA___'/></svg>"#,
    w = width,
    h = height
  );
  let formatted = format!("data:image/svg+xml,{}", urlencoding::encode(&svg));

  formatted.replace("___DATA___", &data_src)
}

fn process_avif_image(bytes: &Bytes) -> Result<DynamicImage, Box<dyn std::error::Error>> {
  let decoder = Decoder::from_avif(bytes)?;
  return match decoder.to_image()? {
    AvifImage::Rgb8(image) => {
      let (buf, width, height) = image.into_contiguous_buf();
      let flat_buf: Vec<u8> = buf.iter().flat_map(|rgb| [rgb.r, rgb.g, rgb.b]).collect();

      let dynamic = DynamicImage::ImageRgb8(
        image::RgbImage::from_raw(width as u32, height as u32, flat_buf).unwrap(),
      );

      Ok(dynamic)
    }
    AvifImage::Rgb16(image) => {
      let (buf, width, height) = image.into_contiguous_buf();
      let flat_buf: Vec<u16> = buf.iter().flat_map(|rgb| [rgb.r, rgb.g, rgb.b]).collect();

      let dynamic = DynamicImage::ImageRgb16(
        image::ImageBuffer::<image::Rgb<u16>, Vec<u16>>::from_raw(
          width as u32,
          height as u32,
          flat_buf,
        )
        .unwrap(),
      );

      Ok(dynamic)
    }
    AvifImage::Rgba8(image) => {
      let (buf, width, height) = image.into_contiguous_buf();
      let flat_buf: Vec<u8> = buf
        .iter()
        .flat_map(|rgba| [rgba.r, rgba.g, rgba.b, rgba.a])
        .collect();

      let dynamic = DynamicImage::ImageRgba8(
        image::RgbaImage::from_raw(width as u32, height as u32, flat_buf).unwrap(),
      );

      Ok(dynamic)
    }
    AvifImage::Rgba16(image) => {
      let (buf, width, height) = image.into_contiguous_buf();
      let flat_buf: Vec<u16> = buf
        .iter()
        .flat_map(|rgba| [rgba.r, rgba.g, rgba.b, rgba.a])
        .collect();

      let dynamic = DynamicImage::ImageRgba16(
        image::ImageBuffer::<image::Rgba<u16>, Vec<u16>>::from_raw(
          width as u32,
          height as u32,
          flat_buf,
        )
        .unwrap(),
      );

      Ok(dynamic)
    }
    AvifImage::Gray8(image) => {
      let (buf, width, height) = image.into_contiguous_buf();
      let flat_buf: Vec<u8> = buf.iter().flat_map(|color| [color.value()]).collect();

      let dynamic = DynamicImage::ImageLuma8(
        image::GrayImage::from_raw(width as u32, height as u32, flat_buf).unwrap(),
      );

      Ok(dynamic)
    }
    AvifImage::Gray16(image) => {
      let (buf, width, height) = image.into_contiguous_buf();
      let flat_buf: Vec<u16> = buf.iter().flat_map(|color| [color.value()]).collect();

      let dynamic = DynamicImage::ImageLuma16(
        image::ImageBuffer::<image::Luma<u16>, Vec<u16>>::from_raw(
          width as u32,
          height as u32,
          flat_buf,
        )
        .unwrap(),
      );

      Ok(dynamic)
    }
  };
}
