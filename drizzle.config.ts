import { defineConfig } from "drizzle-kit";

/**
 * Local SQLite file. Mirrors the server default in server/_core/env.ts so
 * `drizzle-kit generate` and the running app agree on one database.
 */
const dbFile = process.env.DB_FILE ?? "./data/easyeps.db";

export default defineConfig({
  schema: "./drizzle/schema.ts",
  out: "./drizzle/sqlite",
  dialect: "sqlite",
  dbCredentials: {
    url: dbFile,
  },
});
