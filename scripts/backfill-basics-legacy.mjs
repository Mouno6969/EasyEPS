#!/usr/bin/env node
/**
 * Grandfather legacy learners into basicsProgress.completed.
 *
 * Eligibility: any lessonProgress row OR any attempts row (including mock-test-only).
 * Idempotent: skips users already completed; does not overwrite checkpoint unlockSource.
 *
 * Usage:
 *   node scripts/backfill-basics-legacy.mjs
 *   node scripts/backfill-basics-legacy.mjs --dry-run
 *
 * Reads DB_FILE (default ./data/easyeps.db). Safe to re-run.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";

const dryRun = process.argv.includes("--dry-run");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

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

const db = new Database(target);

try {
  // Users with curriculum activity who are not yet Basics-complete
  const list = db
    .prepare(
      `
    SELECT DISTINCT u.userId AS userId
    FROM (
      SELECT userId FROM lessonProgress
      UNION
      SELECT userId FROM attempts
    ) u
    LEFT JOIN basicsProgress bp ON bp.userId = u.userId
    WHERE bp.userId IS NULL OR bp.completed = 0
    ORDER BY u.userId
    `,
    )
    .all();
  console.log(
    `[backfill-basics-legacy] ${dryRun ? "DRY-RUN " : ""}candidates: ${list.length}`,
  );

  let upserted = 0;
  let skipped = 0;

  for (const row of list) {
    const userId = Number(row.userId);
    if (!Number.isFinite(userId)) {
      skipped += 1;
      continue;
    }

    if (dryRun) {
      console.log(`  would grandfather userId=${userId}`);
      upserted += 1;
      continue;
    }

    // Idempotent upsert: only set completed/unlock when not already complete.
    // The WHERE on the DO UPDATE arm means an already-complete row reports zero
    // changes, so re-runs never rewrite unlockSource or completedAt.
    const now = Math.floor(Date.now() / 1000);
    const result = db
      .prepare(
        `
      INSERT INTO basicsProgress
        (userId, modules, completed, checkpointScore, checkpointTotal, completedAt, unlockSource, updatedAt)
      VALUES
        (?, '{}', 1, NULL, NULL, ?, 'legacy-migration', ?)
      ON CONFLICT(userId) DO UPDATE SET
        completedAt = excluded.completedAt,
        unlockSource = 'legacy-migration',
        updatedAt = excluded.updatedAt,
        completed = 1
      WHERE basicsProgress.completed = 0
      `,
      )
      .run(userId, now, now);

    const affected = result?.changes ?? 0;
    if (affected > 0) {
      upserted += 1;
      console.log(`  grandfathered userId=${userId} (changes=${affected})`);
    } else {
      skipped += 1;
    }
  }

  console.log(
    `[backfill-basics-legacy] done. ${dryRun ? "wouldUpsert" : "upserted"}=${upserted} skipped=${skipped}`,
  );
} finally {
  db.close();
}
