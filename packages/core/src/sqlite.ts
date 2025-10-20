import { type Database, type RunResult, verbose } from "sqlite3";
import { logger } from "./logger";

const sqlite3 = verbose();

export const initSqlite = (dbPath: string): Database => {
  const db = new sqlite3.Database(dbPath);

  db.serialize(() => {
    db.run(
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
      (_: RunResult, err: Error) => {
        if (err) {
          console.error("Error creating placeholder_images table", err);
        }
      },
    );

    db.run(
      /*sql*/
      `CREATE TABLE IF NOT EXISTS metadata (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )`,
      (_: RunResult, err: Error) => {
        if (err) {
          console.error("Error creating metadata table", err);
        }
      },
    );
  });

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

export const insertPlaceholderImages = (
  db: Database,
  items: PlaceholderImageRow[],
): Promise<void> => {
  return new Promise((resolve, reject) => {
    const stmt = db.prepare(
      /*sql*/
      `INSERT INTO placeholder_images (url, placeholder, preview_type, cache_key, original_width, original_height)
      VALUES (?, ?, ?, ?, ?, ?)`,
      (err) => {
        if (err) {
          reject(err);
          return;
        }
      },
    );

    for (const item of items) {
      stmt.run(
        item.url,
        item.placeholder,
        item.preview_type,
        item.cache_key,
        item.original_width,
        item.original_height,
        (err: Error) => {
          if (err) {
            logger.error(
              `Error inserting placeholder image for URL ${item.url}: ${err.message}`,
            );
          }
        },
      );
    }

    stmt.finalize((err) => {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });
};

export const getAllPlaceholderImages = (
  db: Database,
): Promise<PlaceholderImageRow[]> => {
  return new Promise((resolve, reject) => {
    db.all(
      /*sql*/
      `SELECT url, placeholder, preview_type, cache_key, original_width, original_height
      FROM placeholder_images`,
      (err, rows) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(rows as PlaceholderImageRow[]);
      },
    );
  });
};

export const getPlaceholderImageByCacheKey = (
  db: Database,
  cacheKey: string,
): Promise<PlaceholderImageRow | null> => {
  return new Promise((resolve, reject) => {
    db.get(
      /*sql*/
      `SELECT url, placeholder, preview_type, cache_key, original_width, original_height
      FROM placeholder_images
      WHERE cache_key = ?`,
      [cacheKey],
      (err, row) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(row as PlaceholderImageRow | null);
      },
    );
  });
};
