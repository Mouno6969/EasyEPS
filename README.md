# EasyEPS

Bangla-first **EPS-TOPIK** learning app for Bangladeshi learners preparing to live and work in Korea. Korean and English are available as supporting languages.

- **60 chapters** of original curriculum (vocabulary, grammar, dialogues, practice, EPS-style exams)
- **v2 enriched spec per chapter**: 30–35 vocabulary items, 20 practice questions, 16 EPS questions (10 reading / 6 listening)
- **Guest mode**: browse, study, practice, and take mock tests with local progress
- **Signed-in mode**: durable progress, planner, badges, certificates, AI tutor
- **Stack**: React 19 · Tailwind 4 · Express · tRPC · Drizzle · MySQL · Zod · Vitest

## Quick start

```bash
# Requirements: Node 22+, pnpm 10+
pnpm install
cp .env.example .env   # fill in values (see below)

# Dev server (API + Vite)
pnpm dev

# Quality gates
pnpm check             # TypeScript
pnpm test              # Vitest
pnpm build             # production client + server bundle
python3 scripts/audit_runtime_contract.py
```

Open [http://localhost:3000](http://localhost:3000) (port may vary if 3000 is taken).

## Environment variables

See [`.env.example`](.env.example). Minimum for local curriculum browsing:

| Variable | Required for | Notes |
|---|---|---|
| `DATABASE_URL` | Signed-in progress / planner / certs | MySQL connection string. Public curriculum works without it. |
| `JWT_SECRET` | Auth sessions | Long random string |
| `VITE_APP_ID` | Login button | Manus app id |
| `VITE_OAUTH_PORTAL_URL` | Login button | Manus OAuth portal |
| `OAUTH_SERVER_URL` | OAuth callback | Manus OAuth API base |
| `OWNER_OPEN_ID` | First admin | Manus openId promoted to `admin` on first login |
| `XAI_API_KEY` | AI tutor | **SpaceXAI** key from [console.x.ai](https://console.x.ai). Server-side only. |
| `XAI_BASE_URL` | AI tutor (optional) | Default `https://api.x.ai/v1` |
| `XAI_MODEL` | AI tutor (optional) | Default `grok-4.5` |
| `BUILT_IN_FORGE_API_URL` / `BUILT_IN_FORGE_API_KEY` | Storage / legacy | Manus Forge helpers; optional LLM fallback if `XAI_API_KEY` unset |

### AI tutor (SpaceXAI)

EasyEPS uses **SpaceXAI** (xAI Grok) for the Bangla AI tutor:

```bash
export XAI_API_KEY=xai-...   # https://console.x.ai
# optional: XAI_MODEL=grok-4.5
pnpm dev
```

The key is read **only on the server** (`server/_core/llm.ts` → `https://api.x.ai/v1/chat/completions`). Never put it in `VITE_*` client env.

Without OAuth env vars, the app still runs: guests can use the full curriculum and exams; signed-in features show a sign-in gate.

## Main routes

| Route | Access |
|---|---|
| `/` | Landing |
| `/curriculum` | 60-chapter catalog |
| `/lesson/:chapter` | Lesson player (1–60) |
| `/mock-test` | Timed 20/40 question mock |
| `/dashboard`, `/planner`, `/profile`, `/tutor` | Signed-in (local fallback where applicable) |
| `/certificate/:code` | Public certificate verify |
| `/admin` | Admin role only |

## Content

- Canonical lessons: `content/lessons/lesson-01.json` … `lesson-60.json`
- Schema: [`content/SCHEMA.md`](content/SCHEMA.md)
- Manifest: [`content/manifest.json`](content/manifest.json)
- Chapter titles: [`shared/chapters.ts`](shared/chapters.ts)

Do not regenerate existing lessons. Author only missing chapters, validate against the schema, update the manifest, and push.

Optional DB seed (idempotent upsert by chapter):

```bash
pnpm db:push          # apply migrations when DATABASE_URL is set
node scripts/seed-lessons.mjs
```

## Scripts

| Command | Purpose |
|---|---|
| `pnpm dev` | Development server |
| `pnpm build` / `pnpm start` | Production build and run |
| `pnpm check` | `tsc --noEmit` |
| `pnpm test` | Vitest |
| `pnpm db:push` | Generate + migrate Drizzle schema |
| `pnpm format` | Prettier |

## Architecture notes

- Lesson JSON is the **public source of truth** for curriculum reads (validated with Zod on load).
- Progress/attempts/planner/badges/certificates live in MySQL when configured.
- Exam answers are graded **server-side** for authenticated attempt recording (client score is not trusted for badges/certificates).
- Auth currently uses **Manus OAuth**. Self-hosting without Manus requires wiring an alternate identity provider.

## License

MIT
