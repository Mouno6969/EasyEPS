#!/usr/bin/env node
/**
 * Grandfather legacy learners into basicsProgress.completed.
 *
 * Eligibility: any lessonProgress row OR any attempts row (including mock-test-only).
 * Idempotent: skips users already completed; does not overwrite checkpoint unlockSource.
 *
 * Usage:
 *   DATABASE_URL=... node scripts/backfill-basics-legacy.mjs
 *   DATABASE_URL=... node scripts/backfill-basics-legacy.mjs --dry-run
 *
 * Requires DATABASE_URL. Safe to re-run.
 */
import mysql from "mysql2/promise";

const dryRun = process.argv.includes("--dry-run");
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const connection = await mysql.createConnection(databaseUrl);

try {
  // Users with curriculum activity who are not yet Basics-complete
  const [candidates] = await connection.query(
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
  );

  const list = Array.isArray(candidates) ? candidates : [];
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

    // Idempotent upsert: only set completed/unlock when not already complete
    const [result] = await connection.execute(
      `
      INSERT INTO basicsProgress
        (userId, modules, completed, checkpointScore, checkpointTotal, completedAt, unlockSource, updatedAt)
      VALUES
        (?, CAST('{}' AS JSON), 1, NULL, NULL, NOW(), 'legacy-migration', NOW())
      ON DUPLICATE KEY UPDATE
        completedAt = IF(completed = 0, NOW(), completedAt),
        unlockSource = IF(completed = 0, 'legacy-migration', unlockSource),
        updatedAt = IF(completed = 0, NOW(), updatedAt),
        completed = IF(completed = 0, 1, completed)
      `,
      [userId],
    );

    const affected = result?.affectedRows ?? 0;
    // MySQL: insert = 1, update that changed row = 2, no-change = 0
    if (affected > 0) {
      upserted += 1;
      console.log(`  grandfathered userId=${userId} (affectedRows=${affected})`);
    } else {
      skipped += 1;
    }
  }

  console.log(
    `[backfill-basics-legacy] done. ${dryRun ? "wouldUpsert" : "upserted"}=${upserted} skipped=${skipped}`,
  );
} finally {
  await connection.end();
}
