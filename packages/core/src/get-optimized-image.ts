import { access, mkdir } from "fs/promises";
import path from "path";
import type { Sharp } from "sharp";
import { getPlaceholder, GetPlaceholderOptions } from "./get-placeholder";
import { getSharpInstance } from "./image";

export interface GetOptimizedImageOptions {
  outputDir: string;
  widths?: number[];
  baseUrl?: string;
  formats?: string[];
  quality?: number;
  namingPattern?: string;
  placeholderOptions?: GetPlaceholderOptions | null;
  cache?: boolean;
}

export interface SrcsetImage {
  width: number;
  height: number;
  src: string;
  filePath: string;
  format: string;
}

export interface ImageMeta {
  width: number;
  height: number;
  format: string;
}

export interface GetOptimizedImageOutput {
  srcset: string[];
  images: SrcsetImage[];
  placeholder: string | null;
  isError: boolean;
  meta: ImageMeta;
}

export const getOptimizedImage = async (
  url: string,
  options: GetOptimizedImageOptions
): Promise<GetOptimizedImageOutput> => {
  const defaults = {
    formats: [] as string[],
    quality: 80,
    namingPattern: "{name}-{width}w.{format}",
    cache: true,
  };

  const {
    outputDir,
    widths = [320, 640, 960, 1280, 1920],
    baseUrl,
    formats = defaults.formats,
    quality = defaults.quality,
    namingPattern = defaults.namingPattern,
    placeholderOptions = {
      placeholderType: "blurred",
    },
    cache = defaults.cache,
  } = options;

  let placeholder: string | null = null;
  let meta: ImageMeta = {
    width: 0,
    height: 0,
    format: "",
  };

  try {
    if (!outputDir) {
      throw new Error("[nocojs] outputDir is required");
    }

    if (!Array.isArray(widths) || widths.length === 0) {
      throw new Error("[nocojs] At least one width must be provided");
    }

    const sharpInstance = await getSharpInstance(url);
    const metadata = await sharpInstance.metadata();

    if (!metadata.width || !metadata.height) {
      throw new Error("Unable to read image dimensions");
    }

    const originalWidth = metadata.width;
    const originalHeight = metadata.height;
    const originalFormat = metadata.format;

    meta = {
      width: originalWidth,
      height: originalHeight,
      format: originalFormat,
    };

    const derivedFormats = formats.length > 0 ? formats : [originalFormat];

    const validWidths = Array.from(new Set(widths))
      .map((width) => Math.round(width))
      .filter((width) => width > 0);

    if (validWidths.length === 0) {
      throw new Error("No valid widths provided");
    }

    const effectiveWidths = Array.from(
      new Set(
        validWidths
          .map((width) => Math.min(width, originalWidth))
          .filter((width) => width > 0)
      )
    ).sort((a, b) => a - b);

    if (effectiveWidths.length === 0) {
      effectiveWidths.push(originalWidth);
    }

    await mkdir(outputDir, { recursive: true });

    const nameParts = getNameParts(url);
    const srcsetMap = new Map<string, string[]>();
    const images: SrcsetImage[] = [];

    for (const format of derivedFormats) {
      const rendererFormat = normalizeFormatForSharp(format);

      for (const width of effectiveWidths) {
        const height = Math.round((originalHeight / originalWidth) * width);

        const fileName = buildFileName(namingPattern, {
          name: nameParts.name,
          width,
          height,
          format,
          originalFormat,
        });

        const filePath = path.join(outputDir, fileName);
        const alreadyExists = cache ? await fileExists(filePath) : false;

        if (!alreadyExists) {
          const pipeline = sharpInstance.clone().resize(width);
          applyFormat(pipeline, rendererFormat, quality);
          await pipeline.toFile(filePath);
        }

        const src = resolveSrc(baseUrl, fileName);

        images.push({
          width,
          height,
          src,
          filePath,
          format,
        });

        const entries = srcsetMap.get(format) ?? [];
        entries.push(`${src} ${width}w`);
        srcsetMap.set(format, entries);
      }
    }

    if (placeholderOptions) {
      try {
        const placeholderResult = await getPlaceholder(url, placeholderOptions);
        placeholder = placeholderResult.placeholder;
      } catch {
        placeholder = null;
      }
    }

    return {
      srcset: Array.from(srcsetMap.values()).map((entries) =>
        entries.join(", ")
      ),
      images,
      placeholder,
      isError: false,
      meta,
    };
  } catch {
    return {
      srcset: [],
      images: [],
      placeholder,
      isError: true,
      meta,
    };
  }
};

const fileExists = async (filePath: string): Promise<boolean> => {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
};

const getNameParts = (input: string) => {
  const fallback = {
    name: "image",
  };

  try {
    const url = new URL(input);
    const parsed = path.parse(url.pathname);
    return {
      name: parsed.name || fallback.name,
    };
  } catch {
    const parsed = path.parse(input);
    return {
      name: parsed.name || fallback.name,
    };
  }
};

const buildFileName = (
  pattern: string,
  params: {
    name: string;
    width: number;
    height: number;
    format: string;
    originalFormat: string;
  }
) => {
  let fileName = pattern
    .replace(/{name}/g, params.name)
    .replace(/{width}/g, String(params.width))
    .replace(/{height}/g, String(params.height))
    .replace(/{format}/g, params.format)
    .replace(/{ext}/g, params.format)
    .replace(/{originalFormat}/g, params.originalFormat);

  if (!path.extname(fileName)) {
    fileName = `${fileName}.${params.format}`;
  }

  return fileName.replace(/[\\]/g, "/");
};

const normalizeFormatForSharp = (format: string): string => {
  if (format === "jpg") {
    return "jpeg";
  }
  return format;
};

const applyFormat = (sharpInstance: Sharp, format: string, quality: number) => {
  const qualityOptions = Number.isFinite(quality) ? { quality } : undefined;

  switch (format) {
    case "jpeg":
      sharpInstance.jpeg(qualityOptions);
      break;
    case "png":
      sharpInstance.png();
      break;
    case "webp":
      sharpInstance.webp(qualityOptions);
      break;
    case "avif":
      sharpInstance.avif(qualityOptions);
      break;
    case "gif":
      sharpInstance.gif();
      break;
    default:
      sharpInstance.toFormat(format as any, qualityOptions);
      break;
  }
};

const resolveSrc = (baseUrl: string | undefined, fileName: string) => {
  const normalizedFileName = fileName.replace(/\\/g, "/");

  if (!baseUrl) {
    return normalizedFileName;
  }

  const trimmedBase = baseUrl.replace(/\/+$/, "");
  const trimmedFile = normalizedFileName.replace(/^\/+/, "");

  return `${trimmedBase}/${trimmedFile}`;
};
