// Migration script that supports both local SQLite and Turso

const isTurso = !!process.env.TURSO_DATABASE_URL;

const migrationSQL = `
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    name TEXT,
    default_account_id TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS account_access (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    created_at INTEGER NOT NULL,
    UNIQUE(user_id, account_id)
  );

  CREATE TABLE IF NOT EXISTS access_codes (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    created_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL,
    used_at INTEGER,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS purchases (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    amount REAL NOT NULL,
    amount_remaining REAL NOT NULL,
    description TEXT NOT NULL,
    date INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    amount REAL NOT NULL,
    date INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_accounts_owner ON accounts(owner_id);
  CREATE INDEX IF NOT EXISTS idx_account_access_user ON account_access(user_id);
  CREATE INDEX IF NOT EXISTS idx_account_access_account ON account_access(account_id);
  CREATE INDEX IF NOT EXISTS idx_purchases_account ON purchases(account_id);
  CREATE INDEX IF NOT EXISTS idx_purchases_date ON purchases(date);
  CREATE INDEX IF NOT EXISTS idx_payments_account ON payments(account_id);
  CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(date);
`;

async function migrate() {
  if (isTurso) {
    // Production: Use Turso (libSQL)
    const { createClient } = await import("@libsql/client");

    const client = createClient({
      url: process.env.TURSO_DATABASE_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });

    // Execute migration SQL statements one by one
    const statements = migrationSQL
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    for (const statement of statements) {
      await client.execute(statement);
    }

    // Check if default_account_id column exists and add if not
    const tableInfo = await client.execute("PRAGMA table_info(users)");
    const hasDefaultAccountId = tableInfo.rows.some(
      (row) => row.name === "default_account_id"
    );
    if (!hasDefaultAccountId) {
      await client.execute("ALTER TABLE users ADD COLUMN default_account_id TEXT");
      console.log("Added default_account_id column to users table");
    }

    console.log("Turso database migrated successfully!");
  } else {
    // Local development: Use better-sqlite3
    const Database = (await import("better-sqlite3")).default;
    const path = await import("path");
    const fs = await import("fs");

    const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), "data", "app.db");

    // Ensure the data directory exists
    const dataDir = path.dirname(dbPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const sqlite = new Database(dbPath);
    sqlite.pragma("journal_mode = WAL");
    sqlite.pragma("foreign_keys = ON");

    sqlite.exec(migrationSQL);

    // Check if default_account_id column exists and add if not
    const userColumns = sqlite.prepare("PRAGMA table_info(users)").all() as { name: string }[];
    const hasDefaultAccountId = userColumns.some((col) => col.name === "default_account_id");
    if (!hasDefaultAccountId) {
      sqlite.exec("ALTER TABLE users ADD COLUMN default_account_id TEXT");
      console.log("Added default_account_id column to users table");
    }

    console.log("Local database migrated successfully!");
    sqlite.close();
  }
}

migrate().catch(console.error);
