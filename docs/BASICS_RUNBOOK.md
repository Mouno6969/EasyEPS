# Hangul Basics — deploy & gate runbook

Short ops checklist for shipping the Basics track and the curriculum write-gate.

## Prerequisites

- Migration `drizzle/0006_basics_progress.sql` applied (`basicsProgress` table).
- App deploy includes Basics APIs, hub UI, checkpoint submit, and client write-gates.
- `BASICS_GATE_ENABLED` defaults to **off** unless set to the string `true`.

## Deploy order (production / staging)

1. **Apply migration** `0006_basics_progress` (or full drizzle migrate).
2. **Deploy app** with `BASICS_GATE_ENABLED` **unset** or any value other than `true`.
3. **Backfill grandfather** (idempotent; dry-run first):

   ```bash
   DATABASE_URL=... node scripts/backfill-basics-legacy.mjs --dry-run
   DATABASE_URL=... node scripts/backfill-basics-legacy.mjs
   ```

   Eligibility: any `lessonProgress` row **or** any `attempts` row (including mock-test-only).
   Sets `basicsProgress.completed = true`, `unlockSource = legacy-migration` when not already complete.

4. **Smoke (flag still off)**  
   - New user can `progress.save` / chapter attempts.  
   - Checkpoint path still works (`basics.submitCheckpoint`).  
   - Admin stats include `basicsCompleted`.

5. **Staging gate on** — set `BASICS_GATE_ENABLED=true`, restart:  
   - Incomplete user without legacy activity → `progress.save` / practice & chapter-exam `attempts.record` → `PRECONDITION_FAILED` (`basics-required: ...`).  
   - `attempts.record` with `kind: mock-test` still allowed.  
   - Admin bypasses.  
   - Pass checkpoint → writes allowed.  
   - Legacy user (missed by backfill) is grandfathered on first gated write.

6. **Production flag on** after staging sign-off.

## Rollback

- Set `BASICS_GATE_ENABLED` to unset / `false` and restart. No DB down-migration.
- Client reads `basics.gateStatus.gateEnabled` and treats everyone as completed when flag is off.

## Related

- Design: [basics-track-design.md](./basics-track-design.md)
- Env: `server/_core/env.ts` → `basicsGateEnabled`
- Assert: `server/basicsGate.ts` → `assertBasicsComplete` (wired on `progress.save` and practice / chapter-exam `attempts.record`)
