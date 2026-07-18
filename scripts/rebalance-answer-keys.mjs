#!/usr/bin/env node
/**
 * Rebalance multiple-choice answer keys across A–D for practice + EPS questions.
 * Preserves correct option text by rotating options array and updating answer index.
 * Matching questions are skipped.
 *
 * Usage: node scripts/rebalance-answer-keys.mjs [--dry-run]
 */
import fs from "node:fs";
import path from "node:path";

const dryRun = process.argv.includes("--dry-run");
const dir = path.join(process.cwd(), "content/lessons");
const files = fs.readdirSync(dir).filter(f => f.endsWith(".json")).sort();

/** Deterministic shuffle from chapter + question id for stable rewrites. */
function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rebalanceQuestion(q, chapter) {
  if (!Array.isArray(q.options) || q.options.length < 2) return false;
  if (typeof q.answer !== "number") return false;
  if (q.type === "matching") return false;

  const n = q.options.length;
  const correctText = q.options[q.answer];
  if (correctText === undefined) return false;

  // Desired target letter: round-robin by hashed id for even distribution
  const seed = hashSeed(`${chapter}:${q.id}`);
  const rng = mulberry32(seed);
  const targetIndex = seed % n;

  // Shuffle options with rng
  const options = [...q.options];
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }

  // Move correct text to targetIndex
  const cur = options.indexOf(correctText);
  if (cur === -1) return false;
  if (cur !== targetIndex) {
    [options[cur], options[targetIndex]] = [options[targetIndex], options[cur]];
  }

  q.options = options;
  q.answer = targetIndex;
  return true;
}

const dist = { 0: 0, 1: 0, 2: 0, 3: 0 };
let changed = 0;

for (const file of files) {
  const full = path.join(dir, file);
  const lesson = JSON.parse(fs.readFileSync(full, "utf8"));
  let fileChanged = false;
  for (const list of [lesson.practice, lesson.epsQuestions]) {
    if (!Array.isArray(list)) continue;
    for (const q of list) {
      if (rebalanceQuestion(q, lesson.chapter)) {
        fileChanged = true;
        changed++;
      }
      if (typeof q.answer === "number" && q.type !== "matching") {
        dist[q.answer] = (dist[q.answer] || 0) + 1;
      }
    }
  }
  if (fileChanged && !dryRun) {
    fs.writeFileSync(full, JSON.stringify(lesson, null, 2) + "\n");
  }
}

const total = Object.values(dist).reduce((a, b) => a + b, 0);
console.log(dryRun ? "DRY RUN" : "WRITTEN");
console.log("questions rebalanced:", changed);
console.log("new distribution:", dist);
console.log(
  "percent:",
  Object.fromEntries(Object.entries(dist).map(([k, v]) => [k, ((100 * v) / total).toFixed(1) + "%"])),
);
