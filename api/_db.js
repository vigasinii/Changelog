import { createClient } from "@libsql/client";

let _client = null;

export function getDb() {
  if (_client) return _client;
  _client = createClient({
    url: process.env.TURSO_URL || "file:./changelog.db",
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
  return _client;
}

export async function initDb() {
  const db = getDb();

  await db.execute(`
    CREATE TABLE IF NOT EXISTS projects (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT NOT NULL,
      slug       TEXT NOT NULL UNIQUE,
      description TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS entries (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id  INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      version     TEXT NOT NULL,
      title       TEXT NOT NULL,
      body        TEXT NOT NULL,
      type        TEXT NOT NULL DEFAULT 'minor',
      published   INTEGER NOT NULL DEFAULT 0,
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      published_at TEXT DEFAULT NULL
    )
  `);
}
