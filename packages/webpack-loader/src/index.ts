import { Transformer, TransformOptions } from "@nocojs/core";
import path from "path";
import { LoaderContext } from "webpack";

export interface NocoLoaderOptions
  extends Omit<TransformOptions, "publicDir" | "cacheFileDir"> {
  /**
   * Public directory path for static assets
   * Defaults to 'public' relative to webpack context
   */
  publicDir?: string;

  /**
   * Cache directory for nocojs transformations
   * Defaults to '.nocojs' relative to webpack context
   */
  cacheFileDir?: string;
}

let transformer: Transformer | null = null;

/**
 * Webpack loader for @nocojs/core transformations
 */
export default async function nocoLoader(
  this: LoaderContext<NocoLoaderOptions>,
  source: string,
  sourceMap: string
) {
  const callback = this.async();

  if (!callback) {
    console.error("nocojs-loader requires async support");
    return;
  }

  const options = this.getOptions() || {};

  const context = this.rootContext || process.cwd();
  const publicDir = options.publicDir
    ? path.resolve(context, options.publicDir)
    : path.join(context, "public");
  const cacheFileDir = options.cacheFileDir
    ? path.resolve(context, options.cacheFileDir)
    : path.join(context, ".nocojs");

  if (!transformer) {
    transformer = new Transformer({
      ...options,
      publicDir,
      cacheFileDir,
    });
    await transformer.preTransform();
  }

  let fileName = this.resourcePath;
  let sourcemapFilePath = fileName;

  if (fileName.endsWith(".vue") || fileName.endsWith(".svelte")) {
    const fileNameExtension = fileName.split(".").pop()!;
    sourcemapFilePath =
      fileName.slice(0, -(fileNameExtension.length + 1)) +
      `.${fileNameExtension}`;
    fileName = `${fileName}.ts`;
  }

  try {
    const transformResult = await transformer.transform(source, fileName, {
      sourcemapFilePath,
    });

    if (!transformResult) {
      return callback(null, source, sourceMap);
    }

    callback(null, transformResult.code, transformResult.map);
  } catch (error) {
    console.error(error);
    return callback(error as Error, source, sourceMap);
  }
}
