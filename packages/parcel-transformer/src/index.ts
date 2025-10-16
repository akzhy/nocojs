import { Transformer as NocoTransformer, TransformOptions } from "@nocojs/core";
import { Transformer } from "@parcel/plugin";
import SourceMapImport from "@parcel/source-map";
import path from "path";
import picomatch from "picomatch";

const SourceMap = (SourceMapImport as any).default ?? SourceMapImport;

export interface ParcelNocoOptions
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

const transformer = new NocoTransformer();

/**
 * Parcel transformer for nocojs image optimization
 */
export default new Transformer({
  async loadConfig({ config, options }) {
    const projectRoot = options.projectRoot ?? process.cwd();
    const defaultOptions: Required<
      Pick<
        ParcelNocoOptions,
        "include" | "exclude" | "publicDir" | "cacheFileDir"
      >
    > = {
      include: ["**/*.{js,jsx,ts,tsx,vue,svelte}"],
      exclude: ["**/node_modules/**"],
      publicDir: path.resolve(projectRoot, "public"),
      cacheFileDir: path.resolve(projectRoot, ".nocojs"),
    };

    const packageJson = (await config.getPackage()) as Record<
      string,
      any
    > | null;

    const pluginOptions =
      packageJson?.["@nocojs/parcel-transformer"] ??
      ({} as ParcelNocoOptions | undefined);

    await transformer.preTransform();

    transformer.setOptions({
      ...defaultOptions,
      ...pluginOptions,
    });

    return { ...defaultOptions, ...pluginOptions };
  },
  async transform({ asset, config: loadedConfig, logger, options }) {
    const filePath = asset.filePath;
    const config = loadedConfig as ParcelNocoOptions;

    if (
      !shouldProcessFile(
        filePath,
        config.include ?? ["**/*.{js,jsx,ts,tsx,vue,svelte}"],
        config.exclude ?? ["**/node_modules/**"]
      )
    ) {
      return [asset];
    }

    try {
      // Get the source code from the asset
      const code = await asset.getCode();

      // Transform the code using nocojs
      const result = await transformer.transform(code, asset.filePath);

      await transformer.postTransform({ closeDb: false });

      if (!result) {
        return [asset];
      }

      // Update the asset with the transformed code
      asset.setCode(result.code);
      if (result.map) {
        const sourcemap = new SourceMap(options.projectRoot);
        sourcemap.addVLQMap(result.map);
        asset.setMap(sourcemap);
      }

      return [asset];
    } catch (error) {
      logger.error({
        message: `Error during nocojs transformation: ${
          error instanceof Error ? error.message : String(error)
        }`,
        origin: "@nocojs/parcel-transformer",
      });

      // Return the original asset if transformation fails
      return [asset];
    }
  },
});

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
