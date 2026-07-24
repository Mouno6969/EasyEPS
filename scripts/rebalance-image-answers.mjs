#!/usr/bin/env node
/**
 * Rebalance answer positions of the newly added image questions (e-img-*)
 * so the correct option is not always in position A. Deterministic mapping.
 * Run: node scripts/rebalance-image-answers.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const lessonDir = path.join(root, "content", "lessons");

/** Deterministic target index per (chapter, id). */
const targets = {
  "21:e-img-1": 2,
  "53:e-img-1": 1,
  "53:e-img-2": 3,
  "53:e-img-3": 0,
  "53:e-img-4": 2,
  "54:e-img-1": 3,
  "54:e-img-2": 0,
  "55:e-img-1": 2,
  "55:e-img-2": 1,
  "56:e-img-1": 3,
  "56:e-img-2": 1,
};

const chapters = [...new Set(Object.keys(targets).map(key => Number(key.split(":")[0])))];
for (const chapter of chapters) {
  const file = path.join(lessonDir, `lesson-${String(chapter).padStart(2, "0")}.json`);
  const lesson = JSON.parse(fs.readFileSync(file, "utf8"));
  let changed = false;
  for (const question of lesson.epsQuestions) {
    const key = `${chapter}:${question.id}`;
    if (!(key in targets)) continue;
    const target = targets[key];
    if (question.answer === target) continue;
    const options = [...question.options];
    const [correct] = options.splice(question.answer, 1);
    options.splice(target, 0, correct);
    question.options = options;
    question.answer = target;
    changed = true;
  }
  if (changed) {
    fs.writeFileSync(file, `${JSON.stringify(lesson, null, 2)}\n`, "utf8");
    console.log(`chapter ${chapter}: rebalanced image-question answers`);
  }
}
console.log("Done.");
