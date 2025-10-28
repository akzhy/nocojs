import { mkdir } from "node:fs/promises";
import path from "node:path";
import MagicString from "magic-string";
import {
  type Argument,
  type ParseResult,
  parseSync,
  Visitor,
} from "oxc-parser";
import { type LogLevel, logger } from "./logger";
import {
  getPlaceholderImage,
  type PlaceholderImageType,
  type PlaceholderOptions,
  shouldWrapWithSvg,
  wrapWithSvg,
} from "./placeholder-image";
import {
  getAllPlaceholderImages,
  initSqlite,
  insertPlaceholderImages,
  type SqliteDatabase,
} from "./sqlite";
import { Store } from "./store";

export interface TransformOptions extends PlaceholderOptions {
  publicDir?: string;
  cacheFileDir?: string;
  logLevel?: LogLevel;
  sourceMapFilePath?: string;
}

export class Transformer {
  options: TransformOptions;

  store: Store = new Store();

  database: SqliteDatabase | null = null;

  constructor(options?: TransformOptions) {
    this.options = {
      cache: true,
      placeholderType: "blurred",
      replaceFunctionCall: true,
      wrapWithSvg: true,
      cacheFileDir: path.join(process.cwd(), ".nocojs"),
      publicDir: path.join(process.cwd(), "public"),
      logLevel: "error",
      width: 12,
      height: undefined,
      ...options,
    };

    logger.setLogLevel(this.options.logLevel ?? "error");
  }

  setOptions(options: TransformOptions) {
    this.options = {
      ...this.options,
      ...options,
    };
  }

  async transform(
    code: string,
    filePath: string,
    transformConfig?: {
      sourcemapFilePath?: string;
    },
  ) {
    if (!code.includes("nocojs/client")) {
      return null;
    }

    const parsedResult = parseSync(filePath, code);

    const placeholderFnName = this.getPlaceholderFnName(parsedResult);
    if (!placeholderFnName) {
      return null;
    }

    const foundCalls = this.visitCallExpressions(parsedResult, {
      previewFnName: placeholderFnName,
    });

    const processed = await Promise.allSettled(
      foundCalls.map(async (call) => {
        try {
          const cached = this.store.getCachedPlaceholder(
            call.url,
            call.options,
          );
          if (cached) {
            logger.debug(`Cache hit for URL: ${call.url}`);

            const placeholder = shouldWrapWithSvg(call.options)
              ? wrapWithSvg(
                  cached.placeholder,
                  cached.originalWidth,
                  cached.originalHeight,
                )
              : cached.placeholder;

            return {
              ...call,
              placeholder,
            };
          }

          const { placeholder, placeholderPng, originalHeight, originalWidth } =
            await getPlaceholderImage(call.url, call.options);

          this.store.insertItem(
            call.url,
            placeholderPng ?? placeholder,
            originalWidth,
            originalHeight,
            call.options,
          );

          return {
            ...call,
            placeholder,
          };
        } catch (error) {
          logger.error(`Error processing image for URL ${call.url}: ${error}`);
          return {
            ...call,
            placeholder: call.originalUrl,
          };
        }
      }),
    );

    const magicString = new MagicString(code);
    for (const item of processed) {
      if (item.status === "fulfilled") {
        magicString.overwrite(
          item.value.start,
          item.value.end,
          `"${item.value.placeholder}"`,
        );
      }
    }

    const map = magicString.generateMap({
      source: filePath,
      file: transformConfig?.sourcemapFilePath || `${filePath}.map`,
      includeContent: true,
    });

    // console.log(magicString.toString());

    return {
      code: magicString.toString(),
      map,
    };
  }

  async preTransform() {
    try {
      await this.initCacheDir();
      this.database = initSqlite(
        // biome-ignore lint/style/noNonNullAssertion: cacheFileDir is created in initCacheDir
        path.join(this.options.cacheFileDir!, "cache.db"),
      );
      const existingItems = await getAllPlaceholderImages(this.database);
      this.store.initStore(
        existingItems.map((item) => ({
          cacheKey: item.cache_key,
          url: item.url,
          placeholder: item.placeholder,
          cache: true,
          dbAction: "none",
          originalHeight: item.original_height,
          originalWidth: item.original_width,
          previewType: item.preview_type as PlaceholderImageType,
        })),
      );
    } catch (error) {
      logger.error(`Error during pre-transform: ${error}`);
    }
  }

  async postTransform(options?: { closeDb?: boolean }) {
    try {
      if (this.database && this.store.hasChanges()) {
        const itemsToSync = this.store.getItemsToSync();
        await insertPlaceholderImages(
          this.database,
          itemsToSync.map((item) => ({
            url: item.url,
            placeholder: item.placeholder,
            cache_key: item.cacheKey,
            preview_type: item.previewType,
            original_width: item.originalWidth,
            original_height: item.originalHeight,
          })),
        );
        this.store.clearItemsToSync();
      }

      if (options?.closeDb ?? true) {
        this.database?.close();
      }
    } catch (error) {
      logger.error(`Error during post-transform: ${error}`);
    }
  }

  async initCacheDir() {
    try {
      if (this.options.cacheFileDir) {
        const cacheDir = path.resolve(this.options.cacheFileDir);
        await mkdir(cacheDir, { recursive: true });
      }
    } catch (error) {
      logger.error(`Error creating cache directory: ${error}`);
    }
  }

  private getPlaceholderFnName(parseResult: ParseResult): string | null {
    for (const importDecl of parseResult.module.staticImports) {
      if (importDecl.moduleRequest.value !== "nocojs/client") {
        continue;
      }

      for (const specifier of importDecl.entries) {
        if (specifier.importName.name === "placeholder") {
          return specifier.localName.value;
        }
      }
    }

    return null;
  }

  private visitCallExpressions(
    parserResult: ParseResult,
    { previewFnName }: { previewFnName: string },
  ) {
    const foundCalls: {
      url: string;
      originalUrl: string;
      start: number;
      end: number;
      options: PlaceholderOptions;
    }[] = [];

    const visitor = new Visitor({
      CallExpression: (node) => {
        if (
          node.callee.type === "Identifier" &&
          node.callee.name === previewFnName
        ) {
          let url = "";
          let originalUrl: null | string = null;
          if (
            node.arguments[0].type === "Literal" &&
            typeof node.arguments[0].value === "string"
          ) {
            url = node.arguments[0].value;
            originalUrl = node.arguments[0].value;

            if (url.startsWith("/") && this.options.publicDir) {
              url = path.join(this.options.publicDir, url);
            }
          }

          if (!originalUrl) {
            return;
          }

          const optionsArg = node.arguments[1];
          const previewOptions = this.extractOptions(optionsArg);

          foundCalls.push({
            url,
            originalUrl,
            start: previewOptions?.replaceFunctionCall
              ? node.start
              : node.arguments[0].start,
            end: previewOptions?.replaceFunctionCall
              ? node.end
              : node.arguments[0].end,
            options: previewOptions,
          });
        }
      },
    });

    visitor.visit(parserResult.program);

    return foundCalls;
  }

  private extractOptions(argument?: Argument): PlaceholderOptions {
    const options: PlaceholderOptions = {
      ...this.options,
    };

    if (!argument) {
      return options;
    }

    if (argument.type === "ObjectExpression") {
      for (const prop of argument.properties) {
        if (prop.type === "Property") {
          let keyName: keyof PlaceholderOptions | null = null;

          if (prop.key.type === "Literal") {
            keyName = prop.key.value as keyof PlaceholderOptions;
          } else if (prop.key.type === "Identifier") {
            keyName = prop.key.name as keyof PlaceholderOptions;
          }

          if (keyName && prop.value.type === "Literal") {
            if (Object.hasOwn(options, keyName)) {
              // @ts-expect-error
              options[keyName] = prop.value.value;
            }
          }
        }
      }
    }

    return options;
  }
}
