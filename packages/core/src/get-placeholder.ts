import { mkdir } from "node:fs/promises";
import path from "node:path";
import {
  getPlaceholderImage,
  type PlaceholderOptions,
} from "./placeholder-image";
import {
  getPlaceholderImageByCacheKey,
  initSqlite,
  insertPlaceholderImages,
  type SqliteDatabase,
} from "./sqlite";
import { Store } from "./store";

export interface GetPlaceholderOptions extends PlaceholderOptions {
  cacheFileDir?: string;
  _enableLogging?: boolean;
}

export const getPlaceholder = async (
  url: string,
  options: GetPlaceholderOptions,
) => {
  let db: SqliteDatabase | null = null;
  if (options.cache ?? true) {
    const cacheFileDir = options.cacheFileDir ?? ".nocojs";
    const cacheDir = path.resolve(cacheFileDir);
    await mkdir(cacheDir, { recursive: true });
    db = initSqlite(path.join(cacheFileDir, "cache.db"));

    const existing = await getPlaceholderImageByCacheKey(
      db,
      Store.getCacheKey(url, options),
    );

    if (existing) {
      db.close();
      if (options._enableLogging) {
        console.log(`[nocojs] Cache hit for ${url}`);
      }

      return {
        placeholder: existing.placeholder,
        width: existing.original_width,
        height: existing.original_height,
      };
    }
  }

  const placeholderImage = await getPlaceholderImage(url, options);

  if (db) {
    await insertPlaceholderImages(db, [
      {
        url,
        placeholder: placeholderImage.placeholder,
        preview_type: options.placeholderType || "normal",
        cache_key: Store.getCacheKey(url, options),
        original_width: placeholderImage.originalWidth,
        original_height: placeholderImage.originalHeight,
      },
    ]);
    db.close();
  }

  return placeholderImage;
};
