# EasyEPS Completion Architecture

## Product goal

EasyEPS is a Bangla-first EPS-TOPIK learning application for Bangladeshi learners preparing to live and work in Korea. Korean and English remain available as supporting languages. The completed product must work as a useful curriculum browser without authentication, while signed-in learners receive durable progress, planning, results, badges, certificates, and AI-tutor capabilities.

## Experience architecture

| Area | Public experience | Signed-in experience | Administrator experience |
|---|---|---|---|
| Curriculum | Browse all 60 chapters by category, search, filter, open lesson content | Same, plus synchronized completion and scores | Edit lesson publication and content metadata |
| Lesson | Objectives, vocabulary, flashcards, TTS, grammar, dialogues, practice | Save section completion, practice results, and chapter exam results | Inspect and update lesson JSON |
| Exams | Chapter exam and generated full mock test with timers and detailed review | Persist attempt history and aggregate statistics | View platform-wide attempt statistics |
| Progress | Local-device progress fallback | Database-backed dashboard, streaks, badges, profile history | View learner statistics and roles |
| Planner | Local study recommendations | Daily goals, target date, calendar items | Not applicable |
| Tutor | Bengali EPS-TOPIK study guidance through a server endpoint | Same with chapter-aware prompts | Model remains server-controlled |
| Certificates | Preview completion requirements | Generate printable course or mock-test certificate when eligible | Verify certificate code |

## Technical decisions

The existing React 19, Tailwind 4, Express, tRPC, Drizzle, MySQL, and Manus OAuth scaffold remains the platform. Lesson JSON files in `content/lessons` are the canonical curriculum source and are imported into the application bundle for public read access. Database lesson rows are used for administration and publication overrides when available.

All learning content routes remain publicly accessible. Authentication is required only for durable cross-device progress, planner records, certificates, and administration. The frontend maintains a local-storage progress snapshot so guests can use every core learning and exam feature.

Korean pronunciation uses the browser Web Speech API and therefore requires no stored audio. The AI tutor calls the platform language-model helper exclusively from the server and never exposes credentials to the browser. It uses a cost-conscious model selected from the live catalog at runtime, preferring `gpt-5-mini` when present.

## Backend modules

The API is divided into curriculum, progress, attempts, planner, profile, tutor, and admin routers. Public curriculum procedures load and validate JSON lessons. Protected procedures write progress, attempts, planner records, badges, and certificates. Administrative procedures enforce `ctx.user.role === "admin"` before content or user-management operations.

Database access remains optional during local tooling. Every helper explicitly handles an unavailable `DATABASE_URL`; public curriculum continues to work from JSON, while protected persistence procedures return a clear availability error rather than crashing.

## Frontend routes

| Route | Purpose |
|---|---|
| `/` | Branded landing page, study summary, category entry points, featured chapters |
| `/curriculum` | Searchable and filterable 60-chapter catalog |
| `/lesson/:chapter` | Lesson objectives, vocabulary, flashcards, grammar, dialogues, practice, chapter exam |
| `/mock-test` | Full-length timed mock-test configuration and runner |
| `/dashboard` | Completion, scores, streaks, weekly activity, recommended next actions |
| `/planner` | Daily goals, target exam date, and scheduled study items |
| `/profile` | Learning history, badges, and certificate access |
| `/tutor` | Bengali AI tutor with suggested study prompts |
| `/admin` | Role-gated content, user, and statistics management |
| `/certificate/:code` | Printable certificate view and verification details |

## Content acceptance criteria

All 60 lesson files must conform to `content/SCHEMA.md`. Each contains 16–22 vocabulary entries, 2–4 grammar patterns with at least two examples, exactly two dialogues of 4–8 lines, exactly 10 practice items with the required activity mix, and exactly 8 EPS questions split into five reading and three listening-style items. Numeric answer indices must be valid, identifiers must be unique within each lesson, titles and categories must match `shared/chapters.ts`, and the manifest must describe every accepted file.

## Quality gates

The project must pass TypeScript checking, production build, automated lesson-schema validation, server procedure tests, and browser verification at desktop and mobile widths. Key interactive flows include curriculum search, lesson navigation, flashcard flipping, Korean speech controls, practice scoring, timed exam submission, local progress restoration, authenticated gating, tutor messaging, planner editing, and administrator authorization.

## Delivery

All changes are committed and pushed to `Mouno6969/EasyEPS`. `CONTINUATION.md`, `content/manifest.json`, and `todo.md` are updated to reflect verified reality rather than planned claims. The final report includes the commit identifier, test results, and run instructions.
