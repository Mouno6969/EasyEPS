# EasyEPS production deploy checklist

## 1. Hosting options

| Layer | Suggested |
|-------|-----------|
| App (Node) | Railway, Fly.io, Render, or any Node 22 host |
| MySQL | PlanetScale, Railway MySQL, or managed RDS |
| Static assets | Served by the same Node process (`pnpm build` + `pnpm start`) |

## 2. Environment

Copy `.env.example` and set at minimum:

```bash
NODE_ENV=production
PORT=3000
DATABASE_URL=mysql://...
JWT_SECRET=<long random>
VITE_APP_ID=...
VITE_OAUTH_PORTAL_URL=...
OAUTH_SERVER_URL=...
OWNER_OPEN_ID=...
XAI_API_KEY=...              # SpaceXAI / xAI tutor (https://console.x.ai)
# XAI_MODEL=grok-4.5
# XAI_BASE_URL=https://api.x.ai/v1
# Optional legacy storage/forge:
# BUILT_IN_FORGE_API_URL=...
# BUILT_IN_FORGE_API_KEY=...
# BASICS_GATE_ENABLED=true   # only after backfill (see BASICS_RUNBOOK.md)
```

## 3. Deploy steps

```bash
pnpm install --frozen-lockfile
pnpm check
pnpm test
pnpm build
pnpm db:push          # or apply drizzle SQL migrations
node scripts/seed-lessons.mjs   # optional if lessons stored in DB
node scripts/backfill-basics-legacy.mjs
pnpm start
```

## 4. After go-live

1. Smoke: `/`, `/basics`, `/curriculum`, `/mock-test`, OAuth login  
2. Guest study → sign in → confirm progress merge toast  
3. Issue a test certificate with complete profile + photo  
4. Enable `BASICS_GATE_ENABLED=true` only when ready  

## 5. Preview tunnels

For temporary demos without deploy:

```bash
pnpm dev
cloudflared tunnel --url http://127.0.0.1:3000
```
