import {
  GetOptimizedImageOptions,
  GetOptimizedImageOutput,
  GetPlaceholderImageResult,
  GetPlaceholderOptions,
  getOptimizedImage,
  getPlaceholder,
  ImageMeta,
  LogLevel,
  PlaceholderImageType,
  type PlaceholderOptions,
  SrcsetImage,
} from "@nocojs/core";

// biome-ignore lint/correctness/noUnusedFunctionParameters: Options used by consumer
const placeholder = (url: string, options?: PlaceholderOptions): string => url;

export {
  placeholder,
  getOptimizedImage,
  GetOptimizedImageOptions,
  GetOptimizedImageOutput,
  getPlaceholder,
  GetPlaceholderImageResult,
  GetPlaceholderOptions,
  ImageMeta,
  LogLevel,
  PlaceholderImageType,
  type PlaceholderOptions,
  SrcsetImage,
};
