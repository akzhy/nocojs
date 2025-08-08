import * as path from 'path';
import { PlaceholderImageOutputKind, transform as rustTransform, LogLevel, Log } from './index.js';

const placeholderTypeToEnum = {
  normal: PlaceholderImageOutputKind.Normal,
  'black-and-white': PlaceholderImageOutputKind.BlackAndWhite,
  'dominant-color': PlaceholderImageOutputKind.DominantColor,
  'average-color': PlaceholderImageOutputKind.AverageColor,
  transparent: PlaceholderImageOutputKind.Transparent,
} as const;

const logLevelTypeToEnum = {
  error: LogLevel.Error,
  info: LogLevel.Info,
  none: LogLevel.None,
  verbose: LogLevel.Verbose,
}

export type PlaceholderType = keyof typeof placeholderTypeToEnum;

export type LogLevelType = keyof typeof logLevelTypeToEnum;

export interface PreviewOptions {
  placeholderType?: PlaceholderType;
  replaceFunctionCall?: boolean;
  cache?: boolean;
  width?: number;
  height?: number;
}

export interface TransformOptions extends PreviewOptions {
  publicDir?: string;
  cacheFileDir?: string;
  logLevel?: LogLevelType;
}

export const transform = async (
  code: string,
  filePath: string,
  options?: TransformOptions,
): Promise<{
  code: string;
  map: string | null;
  logs: Log[];
}> => {
  try {
    const result = await rustTransform(code, filePath, {
      placeholderType: options?.placeholderType
        ? placeholderTypeToEnum[options.placeholderType]
        : PlaceholderImageOutputKind.Normal,
      replaceFunctionCall: options?.replaceFunctionCall ?? true,
      cache: options?.cache ?? true,
      publicDir: options?.publicDir ?? path.join(process.cwd(), 'public'),
      cacheFileDir: options?.cacheFileDir ?? path.join(process.cwd(), '.nocojs'),
      logLevel: options?.logLevel ? logLevelTypeToEnum[options.logLevel] : LogLevel.Error,
      width: options?.width,
      height: options?.height,
    });

    if (!result) {
      console.log(`No result returned for ${filePath}. Returning original code.`);
      return {
        code,
        map: null,
        logs: []
      };
    }

    return {
      code: result.code,
      map: result?.sourcemap ?? null,
      logs: result.logs ?? []
    };
  } catch (error) {
    console.error('Error during transformation:', error);
    return {
      code,
      map: null,
      logs: []
    };
  }
};
