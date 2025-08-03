import * as path from 'path';
import { PlaceholderImageOutputKind, transform as rustTransform } from './index.js';

const placeholderTypeToEnum = {
  normal: PlaceholderImageOutputKind.Normal,
  'black-and-white': PlaceholderImageOutputKind.BlackAndWhite,
  'dominant-color': PlaceholderImageOutputKind.DominantColor,
  'average-color': PlaceholderImageOutputKind.AverageColor,
  transparent: PlaceholderImageOutputKind.Transparent,
} as const;

export type PlaceholderType = keyof typeof placeholderTypeToEnum;

export interface PreviewOptions {
  placeholderType?: PlaceholderType;
  replaceFunctionCall?: boolean;
  cache?: boolean;
}

export interface TransformOptions extends PreviewOptions {
  publicDir?: string;
  cacheFileDir?: string;
}

export const transform = async (
  code: string,
  filePath: string,
  options?: TransformOptions,
): Promise<{
  code: string;
  map: string | null;
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
    });

    if (!result) {
      console.log(`No result returned for ${filePath}. Returning original code.`);
      return {
        code,
        map: null,
      };
    }

    return {
      code: result.code,
      map: result?.sourcemap ?? null,
    };
  } catch (error) {
    console.error('Error during transformation:', error);
    return {
      code,
      map: null,
    };
  }
};
