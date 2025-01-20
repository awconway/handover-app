import { drizzle } from "drizzle-orm/better-sqlite3"
import { migrate } from "drizzle-orm/better-sqlite3/migrator"
import Database from "better-sqlite3"
import * as path from "node:path";

const betterSqlite = new Database(
  path.resolve("drizzle.db")
);
export const db = drizzle(betterSqlite);

// Automatically run migrations on startup
void migrate(db, {
  migrationsFolder: "app/drizzle/migrations",
})

