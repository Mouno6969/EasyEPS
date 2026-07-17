#!/usr/bin/env node
/**
 * Idempotent upsert of content/lessons/*.json into the `lessons` table.
 * Requires DATABASE_URL. Safe to re-run.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const lessonDir = path.join(root, "content", "lessons");

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is required");
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

const connection = await mysql.createConnection(databaseUrl);
let upserted = 0;

try {
  for (const file of files) {
    const raw = JSON.parse(fs.readFileSync(path.join(lessonDir, file), "utf8"));
    const chapter = Number(raw.chapter);
    await connection.execute(
      `INSERT INTO lessons
        (chapter, slug, titleKo, titleBn, titleEn, category, level, content, published)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, true)
       ON DUPLICATE KEY UPDATE
         slug = VALUES(slug),
         titleKo = VALUES(titleKo),
         titleBn = VALUES(titleBn),
         titleEn = VALUES(titleEn),
         category = VALUES(category),
         level = VALUES(level),
         content = VALUES(content),
         published = VALUES(published)`,
      [
        chapter,
        raw.slug,
        raw.title.ko,
        raw.title.bn,
        raw.title.en,
        raw.category,
        raw.level ?? "beginner",
        JSON.stringify(raw),
      ],
    );
    upserted += 1;
  }
  console.log(`Seeded ${upserted} lessons into database`);
} finally {
  await connection.end();
}
