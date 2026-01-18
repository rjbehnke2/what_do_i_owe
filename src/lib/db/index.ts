import { drizzle as drizzleBetterSqlite } from "drizzle-orm/better-sqlite3";
import { drizzle as drizzleLibsql } from "drizzle-orm/libsql";
import * as schema from "./schema";

// Use Turso (libSQL) in production, better-sqlite3 locally
const isTurso = !!process.env.TURSO_DATABASE_URL;

type DbInstance = ReturnType<typeof drizzleBetterSqlite<typeof schema>> | ReturnType<typeof drizzleLibsql<typeof schema>>;

function createDb(): DbInstance {
  if (isTurso) {
    // Production: Use Turso (libSQL)
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createClient } = require("@libsql/client");

    const client = createClient({
      url: process.env.TURSO_DATABASE_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });

    return drizzleLibsql(client, { schema });
  } else {
    // Local development: Use better-sqlite3
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Database = require("better-sqlite3");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require("path");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require("fs");

    const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), "data", "app.db");

    // Ensure the data directory exists
    const dataDir = path.dirname(dbPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const sqlite = new Database(dbPath);
    sqlite.pragma("journal_mode = WAL");
    sqlite.pragma("foreign_keys = ON");

    return drizzleBetterSqlite(sqlite, { schema });
  }
}

export const db = createDb();

export * from "./schema";
