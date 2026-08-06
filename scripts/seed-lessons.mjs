#!/usr/bin/env node
/**
 * Idempotent upsert of content/lessons/*.json into the `lessons` table.
 * Safe to re-run.
 *
 * Reads DB_FILE (default ./data/easyeps.db), matching the server.
 *
 * Note this table is optional: curriculum reads are served from the JSON files
 * on disk via server/content.ts, not from here.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const lessonDir = path.join(root, "content", "lessons");

function dbPath() {
  let file = process.env.DB_FILE;
  if (!file) {
    const envFile = path.join(root, ".env");
    if (fs.existsSync(envFile)) {
      const line = fs
        .readFileSync(envFile, "utf8")
        .split("\n")
        .find(l => l.startsWith("DB_FILE="));
      if (line) file = line.slice("DB_FILE=".length).trim();
    }
  }
  return path.resolve(root, file || "./data/easyeps.db");
}

const target = dbPath();
if (!fs.existsSync(target)) {
  console.error(`No database at ${target}. Start the server once to create it.`);
  process.exit(1);
}

const files = fs
  .readdirSync(lessonDir)
  .filter(name => /^lesson-\d{2}\.json$/.test(name))
  .sort();

if (files.length === 0) {
  console.error("No lesson files found");
  process.exit(1);
}

const db = new Database(target);
let upserted = 0;

try {
  const stmt = db.prepare(
    `INSERT INTO lessons
       (chapter, slug, titleKo, titleBn, titleEn, category, level, content, published, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
     ON CONFLICT(chapter) DO UPDATE SET
       slug = excluded.slug,
       titleKo = excluded.titleKo,
       titleBn = excluded.titleBn,
       titleEn = excluded.titleEn,
       category = excluded.category,
       level = excluded.level,
       content = excluded.content,
       published = excluded.published,
       updatedAt = excluded.updatedAt`,
  );

  // One transaction: a partial seed would leave the table straddling two
  // content versions.
  const seedAll = db.transaction(() => {
    const now = Math.floor(Date.now() / 1000);
    for (const file of files) {
      const raw = JSON.parse(fs.readFileSync(path.join(lessonDir, file), "utf8"));
      stmt.run(
        Number(raw.chapter),
        raw.slug,
        raw.title.ko,
        raw.title.bn,
        raw.title.en,
        raw.category,
        raw.level ?? "beginner",
        JSON.stringify(raw),
        now,
      );
      upserted += 1;
    }
  });

  seedAll();
  console.log(`Seeded ${upserted} lessons into ${target}`);
} finally {
  db.close();
}
