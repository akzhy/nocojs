import DatabaseConstructor, {
  type Database as SqliteDatabase,
} from "better-sqlite3";
import { logger } from "./logger";

export type { SqliteDatabase };

export const initSqlite = (dbPath: string): SqliteDatabase => {
  const db = new DatabaseConstructor(dbPath);

  try {
    db.exec(
      /*sql*/
      `CREATE TABLE IF NOT EXISTS placeholder_images (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        url     TEXT NOT NULL,
        placeholder   TEXT NOT NULL,
        preview_type TEXT DEFAULT 'normal',
        cache_key TEXT NOT NULL,
        original_width INTEGER NOT NULL,
        original_height INTEGER NOT NULL,
        UNIQUE(cache_key)
      )`,
    );
  } catch (error) {
    logger.error(
      `Error creating placeholder_images table: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  try {
    db.exec(
      /*sql*/
      `CREATE TABLE IF NOT EXISTS metadata (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )`,
    );
  } catch (error) {
    logger.error(
      `Error creating metadata table: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  return db;
};

interface PlaceholderImageRow {
  url: string;
  placeholder: string;
  preview_type: string;
  cache_key: string;
  original_width: number;
  original_height: number;
}

export const insertPlaceholderImages = async (
  db: SqliteDatabase,
  items: PlaceholderImageRow[],
): Promise<void> => {
  if (items.length === 0) {
    return;
  }

  const stmt = db.prepare(
    /*sql*/
    `INSERT INTO placeholder_images (url, placeholder, preview_type, cache_key, original_width, original_height)
    VALUES (?, ?, ?, ?, ?, ?)`,
  );

  for (const item of items) {
    try {
      stmt.run(
        item.url,
        item.placeholder,
        item.preview_type,
        item.cache_key,
        item.original_width,
        item.original_height,
      );
    } catch (error) {
      logger.error(
        `Error inserting placeholder image for URL ${item.url}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
};

export const getAllPlaceholderImages = async (
  db: SqliteDatabase,
): Promise<PlaceholderImageRow[]> => {
  const stmt = db.prepare(
    /*sql*/
    `SELECT url, placeholder, preview_type, cache_key, original_width, original_height
    FROM placeholder_images`,
  );

  return stmt.all() as PlaceholderImageRow[];
};

export const getPlaceholderImageByCacheKey = async (
  db: SqliteDatabase,
  cacheKey: string,
): Promise<PlaceholderImageRow | null> => {
  const stmt = db.prepare(
    /*sql*/
    `SELECT url, placeholder, preview_type, cache_key, original_width, original_height
    FROM placeholder_images
    WHERE cache_key = ?`,
  );

  const row = stmt.get(cacheKey) as PlaceholderImageRow | undefined;
  return row ?? null;
};
