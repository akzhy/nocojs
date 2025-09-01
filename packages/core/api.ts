import * as path from 'path';
import {
  PlaceholderImageOutputKind,
  transform as rustTransform,
  getPlaceholder as rustGetPlaceholder,
  LogLevel,
  Log,
  GetPlaceholderOptions as RustGetPlaceholderOptions,
} from './index';

const placeholderTypeToEnum = {
  normal: PlaceholderImageOutputKind.Normal,
  blurred: PlaceholderImageOutputKind.Blurred,
  grayscale: PlaceholderImageOutputKind.Grayscale,
  'dominant-color': PlaceholderImageOutputKind.DominantColor,
  'average-color': PlaceholderImageOutputKind.AverageColor,
  transparent: PlaceholderImageOutputKind.Transparent,
} as const;

const logLevelTypeToEnum = {
  error: LogLevel.Error,
  info: LogLevel.Info,
  none: LogLevel.None,
  verbose: LogLevel.Verbose,
};

export type PlaceholderType = keyof typeof placeholderTypeToEnum;

export type LogLevelType = keyof typeof logLevelTypeToEnum;

export interface PreviewOptions {
  placeholderType?: PlaceholderType;
  replaceFunctionCall?: boolean;
  cache?: boolean;
  width?: number;
  height?: number;
  wrapWithSvg?: boolean;
}

export interface TransformOptions extends PreviewOptions {
  publicDir?: string;
  cacheFileDir?: string;
  logLevel?: LogLevelType;
  sourcemapFilePath?: string;
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
      sourcemapFilePath: options?.sourcemapFilePath,
      wrapWithSvg: options?.wrapWithSvg ?? true,
    });

    if (!result) {
      return {
        code,
        map: null,
        logs: [],
      };
    }

    return {
      code: result.code,
      map: result?.sourcemap ?? null,
      logs: result.logs ?? [],
    };
  } catch (error) {
    console.error(`[nocojs] Error during transformation: ${error} file: ${filePath}`);
    return {
      code,
      map: null,
      logs: [],
    };
  }
};

export interface GetPlaceholderOptions extends Omit<RustGetPlaceholderOptions, 'placeholderType'> {
  placeholderType?: PlaceholderType;
}

export const getPlaceholder = async (url: string, options?: GetPlaceholderOptions) => {
  return rustGetPlaceholder(url, {
    ...options,
    placeholderType: options?.placeholderType
      ? placeholderTypeToEnum[options.placeholderType]
      : PlaceholderImageOutputKind.Normal,
  });
};
