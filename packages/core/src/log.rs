use console::style;
use napi_derive::napi;
use std::sync::atomic::{AtomicU8, Ordering};
use std::fmt::Display;

#[napi]
#[derive(Debug, Clone, Copy)]
pub enum LogLevel {
  None = 0,
  Error = 1,
  Info = 2,
  Verbose = 3,
}

static LOG_LEVEL: AtomicU8 = AtomicU8::new(LogLevel::Info as u8);

pub fn set_log_level(level: LogLevel) {
  LOG_LEVEL.store(level as u8, Ordering::Relaxed);
}

pub fn get_log_level() -> u8 {
  LOG_LEVEL.load(Ordering::Relaxed)
}

pub fn create_log<T: Display>(message: T, level: LogLevel) {
  let current = get_log_level();

  if level as u8 <= current {
    println!("{}{}", style(" nocojs ").bg(console::Color::Cyan).white(), message);
  }
}

pub fn style_error<T: Display>(message: T) -> String {
  let out = format!("{} {}", style(" error ").bg(console::Color::Red).white(), style(message.to_string()).red());
  out
}

pub fn style_info<T: Display>(message: T) -> String {
  let out = format!("{} {}", style(" info ").bg(console::Color::Blue).white(), message.to_string());
  out
}
