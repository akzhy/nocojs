use console::style;
use napi_derive::napi;
use once_cell::sync::Lazy;
use std::sync::atomic::{AtomicU8, Ordering};
use std::fmt::Display;
use std::sync::Mutex;

#[derive(Clone)]
#[napi(object)]
pub struct Log {
  pub message: String,
  pub level: LogLevel,
}

pub static LOGS: Lazy<Mutex<Vec<Log>>> = Lazy::new(|| Mutex::new(Vec::new()));


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

pub fn collect_logs() -> Vec<Log> {
  LOGS.lock().unwrap().clone()
}

pub fn create_log<T: Display>(message: T, level: LogLevel) {
  let current = get_log_level();

  if level as u8 <= current {
    let log = Log {
      message: message.to_string(),
      level,
    };
    LOGS.lock().unwrap().push(log);
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
