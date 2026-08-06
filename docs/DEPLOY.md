# EasyEPS production deploy checklist

## 1. Hosting options

| Layer | Suggested |
|-------|-----------|
| App (Node) | Railway, Fly.io, Render, or any Node 22 host |
| Database | Local SQLite file — no server to provision |
| Static assets | Served by the same Node process (`pnpm build` + `pnpm start`) |

SQLite lives on disk next to the app, so the host must give you a **persistent
volume**. On platforms with ephemeral filesystems (Heroku-style dynos, most
serverless targets) the database is wiped on every redeploy — point `DB_FILE` at
a mounted volume, or pick a host that keeps disk.

## 2. Environment

Copy `.env.example` and set at minimum:

```bash
NODE_ENV=production
PORT=3000
DB_FILE=/var/lib/easyeps/easyeps.db   # persistent path, NOT inside the repo
JWT_SECRET=<64 hex chars>             # openssl rand -hex 32
XAI_API_KEY=...                       # optional, AI tutor (https://console.x.ai)
# BASICS_GATE_ENABLED=true            # only after backfill (see BASICS_RUNBOOK.md)
```

`JWT_SECRET` is mandatory and must be at least 32 bytes. The server refuses to
mint a session without it: sessions are HS256-signed with this value, and a
short or guessable secret can be brute-forced offline to forge a session for any
account, including an admin. Changing it later signs everyone out.

No OAuth configuration is required. Accounts are local (email + password,
scrypt-hashed), so there is nothing to register with a third-party provider.

## 3. Deploy steps

```bash
pnpm install --frozen-lockfile
pnpm check
pnpm test
pnpm build
pnpm start          # creates DB_FILE and applies migrations on first boot
```

The schema is applied automatically at startup — there is no separate migration
step. `pnpm db:push` is only needed when you change `drizzle/schema.ts` and want
to generate a new migration file.

## 4. After go-live

1. **Register the first account immediately.** The first account to sign up
   becomes admin, so do this before sharing the URL.
2. Smoke: `/`, `/basics`, `/curriculum`, `/mock-test`, `/signin`
3. Guest study → sign in → confirm progress merge toast
4. Issue a test certificate with a complete profile + photo
5. Enable `BASICS_GATE_ENABLED=true` only when ready

## 5. Account recovery

There is no password-reset email (no SMTP configured), so recovery is done from
a shell on the server:

```bash
pnpm account list                                  # show accounts and roles
pnpm account set-password <email> <new-password>   # reset a forgotten password
pnpm account promote <email>                       # grant admin
```

## 6. Backups

The whole database is one file. With the app stopped, copy it; while it is
running, use SQLite's online backup so you do not capture a half-written page:

```bash
sqlite3 "$DB_FILE" ".backup '/backups/easyeps-$(date +%F).db'"
```

WAL mode also produces `-wal` and `-shm` sidecar files. `.backup` handles them
correctly; a plain `cp` of just the `.db` can miss recent commits.

## 7. Preview tunnels

For temporary demos without a deploy:

```bash
pnpm dev
cloudflared tunnel --url http://127.0.0.1:3000
```
