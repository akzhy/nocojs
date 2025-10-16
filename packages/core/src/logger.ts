export type LogType = "none" | "info" | "warn" | "error" | "debug";
const logLevels: Record<LogType, number> = {
  none: 0,
  error: 1,
  warn: 2,
  info: 3,
  debug: 4,
};

class Logger {
  logLevel = logLevels.error;

  constructor(logLevel: LogType) {
    this.logLevel = logLevels[logLevel];
  }

  setLogLevel(level: LogType) {
    this.logLevel = logLevels[level];
  }

  static colors = {
    reset: "\x1b[0m",
    fg: {
      red: "\x1b[31m",
      yellow: "\x1b[33m",
      blue: "\x1b[34m",
      white: "\x1b[37m",
    },
    bg: {
      red: "\x1b[41m",
      yellow: "\x1b[43m",
      blue: "\x1b[44m",
    },
  };

  error(msg: string) {
    if (this.logLevel < 1) return;
    console.log(
      `${Logger.colors.bg.red}${Logger.colors.fg.white}[nocojs/Error]${Logger.colors.reset} ${Logger.colors.fg.red}${msg}${Logger.colors.reset}`
    );
  }

  warn(msg: string) {
    if (this.logLevel < 2) return;
    console.log(
      `${Logger.colors.bg.yellow}${Logger.colors.fg.white}[nocojs/Warning]${Logger.colors.reset} ${msg}${Logger.colors.reset}`
    );
  }

  info(msg: string) {
    if (this.logLevel < 3) return;
    console.log(
      `${Logger.colors.bg.blue}${Logger.colors.fg.white}[nocojs/Info]${Logger.colors.reset} ${msg}${Logger.colors.reset}`
    );
  }

  debug(msg: string) {
    if (this.logLevel < 4) return;
    console.log(
      `${Logger.colors.bg.blue}${Logger.colors.fg.white}[nocojs/Debug]${Logger.colors.reset} ${msg}${Logger.colors.reset}`
    );
  }
}

export const logger = new Logger('error');
