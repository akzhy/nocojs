import { Database, RunResult, verbose } from "sqlite3";
const sqlite3 = verbose();

export const initSqlite = (dbPath: string): Database => {
  const db = sqlite3.cached.Database(dbPath);

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
      }
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
      }
    );
  });

  return db;
};
