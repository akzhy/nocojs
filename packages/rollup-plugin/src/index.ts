import { Plugin } from "rollup";
import { Transformer, TransformOptions } from "@nocojs/core";
import path from "path";
import picomatch from "picomatch";

export interface RollupNocoOptions
  extends Omit<TransformOptions, "publicDir" | "cacheFileDir"> {
  /**
   * Public directory for static assets
   * @default 'public'
   */
  publicDir?: string;

  /**
   * Cache directory for nocojs
   * @default '.nocojs'
   */
  cacheFileDir?: string;

  /**
   * File patterns to include (supports glob patterns)
   * @default ['**\/*.{js,jsx,ts,tsx,vue,svelte}']
   */
  include?: string[];

  /**
   * File patterns to exclude (supports glob patterns)
   * @default ['**\/node_modules\/**']
   */
  exclude?: string[];
}

/**
 * Default options for the Rollup nocojs plugin
 */
const defaultOptions: Required<
  Pick<RollupNocoOptions, "include" | "exclude" | "publicDir" | "cacheFileDir">
> = {
  include: ["**/*.{js,jsx,ts,tsx,vue,svelte}"],
  exclude: ["**/node_modules/**"],
  publicDir: "public",
  cacheFileDir: ".nocojs",
};

/**
 * Check if a file should be processed based on include/exclude patterns
 */
function shouldProcessFile(
  id: string,
  include: string[],
  exclude: string[]
): boolean {
  // Create matchers for include and exclude patterns
  const isIncluded = picomatch(include);
  const isExcluded = picomatch(exclude);

  // Check if file matches include patterns
  if (!isIncluded(id)) {
    return false;
  }

  // Check if file matches exclude patterns
  if (isExcluded(id)) {
    return false;
  }

  return true;
}

/**
 * Rollup plugin for nocojs image optimization
 *
 * @param options - Plugin configuration options
 * @returns Rollup plugin instance
 */
async function rollupNocoPlugin(options: RollupNocoOptions = {}): Promise<Plugin> {
  const {
    include = defaultOptions.include,
    exclude = defaultOptions.exclude,
    publicDir = defaultOptions.publicDir,
    cacheFileDir = defaultOptions.cacheFileDir,
    ...transformOptions
  } = options;

  const resolvedPublicDir = path.resolve(publicDir);
  const resolvedCacheDir = path.resolve(cacheFileDir);

  const nocoTransformer = new Transformer({
    publicDir: resolvedPublicDir,
    cacheFileDir: resolvedCacheDir,
    ...transformOptions,
  });

  await nocoTransformer.preTransform();

  return {
    name: "@nocojs/rollup-plugin",

    async buildStart() {
      await nocoTransformer.preTransform();
    },

    async transform(code: string, id: string) {
      // Skip processing if file doesn't match include/exclude patterns
      if (!shouldProcessFile(id, include, exclude)) {
        return null;
      }

      try {
        const result = await nocoTransformer.transform(code, id);

        await nocoTransformer.postTransform({ closeDb: false });

        if (!result) {
          return null;
        }

        return {
          code: result.code,
          map: result.map,
        };
      } catch (error) {
        // Log the error and return the original code to prevent build failures
        console.error(`[@nocojs/rollup-plugin] Error processing ${id}:`, error);
        return null;
      }
    },
    async buildEnd() {
      await nocoTransformer.postTransform({ closeDb: true });
    }
  };
}

export { rollupNocoPlugin };
