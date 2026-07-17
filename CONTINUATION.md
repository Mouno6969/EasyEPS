# EasyEPS — Continuation Guide for Future Sessions

This repository is the durable cache for the EasyEPS project. **Do not regenerate or re-download anything that already exists here.**

## Where things live

| Artifact | Location | Notes |
|---|---|---|
| Lesson content (curriculum) | `content/lessons/lesson-01.json` … `lesson-60.json` | One file per chapter, schema in `content/SCHEMA.md` |
| Content manifest | `content/manifest.json` | Records which chapters are complete + validation counts |
| Lesson schema spec | `content/SCHEMA.md` | Canonical schema every lesson follows |
| Chapter list | `shared/chapters.ts` | All 60 chapter titles (ko/bn/en) and categories |
| Web application | entire repo | React 19 + Tailwind 4 + Express + tRPC + Drizzle (MySQL) |
| Feature tracker | `todo.md` | Checked items are done |

## How to resume

1. Clone this repo and read `content/manifest.json`.
2. Only author lessons whose chapter numbers are **missing** from the manifest — never regenerate existing ones.
3. New lessons must validate against `content/SCHEMA.md` (10 practice questions, 8 EPS questions, 16–22 vocabulary items each).
4. After authoring, update `content/manifest.json` and push to GitHub immediately.
5. Seed the database from `content/lessons/` using `scripts/seed-lessons.mjs` (idempotent upsert by chapter).

## Key decisions already made

- Curriculum content is **original authored content** (not copied from the official textbook) covering the standard 60 EPS-TOPIK textbook topics.
- No official textbook PDFs are stored in this repo (license); they are not required to resume.
- Audio is generated dynamically via speech-synthesis integration — no pre-recorded audio files anywhere.
- Interface: Bangla default, Korean/English secondary. Design: sacred geometry, cream bg + golden line art + navy headlines.
