#!/usr/bin/env node
/**
 * Local account recovery. Runs directly against the SQLite file, so it works
 * even when nobody can sign in.
 *
 * This replaces the retired OWNER_OPEN_ID bootstrap. Self-hosted auth has no
 * SMTP, so there is no "forgot password" email — if the admin password is lost,
 * this is the way back in. Requires shell access to the server, which is the
 * intended trust boundary.
 *
 *   node scripts/admin-account.mjs list
 *   node scripts/admin-account.mjs set-password <email> <new-password>
 *   node scripts/admin-account.mjs promote <email>
 *
 * Reads DB_FILE from .env (same default as the server: ./data/easyeps.db).
 */
import Database from "better-sqlite3";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { scryptSync, randomBytes, timingSafeEqual } from "node:crypto";

// Keep these in lockstep with server/_core/password.ts. Duplicated rather than
// imported because this script runs as plain .mjs with no TS pipeline.
// Note the salt is the hex STRING itself, passed to scrypt as-is — not the
// decoded bytes. Encoding it differently here would silently produce hashes
// the server can never verify.
const N = 32768;
const R = 8;
const P = 1;
const KEYLEN = 64;
const SALT_BYTES = 16;

function hashPassword(password) {
  const salt = randomBytes(SALT_BYTES).toString("hex");
  const hash = scryptSync(password, salt, KEYLEN, { N, r: R, p: P, maxmem: 128 * N * R * 2 });
  return `scrypt$${N}$${R}$${P}$${salt}$${hash.toString("hex")}`;
}

function dbPath() {
  let file = process.env.DB_FILE;
  if (!file && existsSync(".env")) {
    const line = readFileSync(".env", "utf8")
      .split("\n")
      .find(l => l.startsWith("DB_FILE="));
    if (line) file = line.slice("DB_FILE=".length).trim();
  }
  return resolve(file || "./data/easyeps.db");
}

const [cmd, email, password] = process.argv.slice(2);
const path = dbPath();

if (!existsSync(path)) {
  console.error(`No database at ${path}. Start the server once to create it.`);
  process.exit(1);
}

const db = new Database(path);

function list() {
  const rows = db.prepare("SELECT id, email, name, role, lastSignedIn FROM users ORDER BY id").all();
  if (rows.length === 0) {
    console.log("No accounts yet. The first account to register becomes admin.");
    return;
  }
  for (const r of rows) {
    console.log(`#${r.id}  ${r.role.padEnd(5)}  ${r.email ?? "(no email)"}  ${r.name ?? ""}`);
  }
}

function requireUser(addr) {
  if (!addr) {
    console.error("Email required.");
    process.exit(1);
  }
  const row = db.prepare("SELECT id, email FROM users WHERE lower(email) = lower(?)").get(addr);
  if (!row) {
    console.error(`No account with email ${addr}. Run "list" to see accounts.`);
    process.exit(1);
  }
  return row;
}

switch (cmd) {
  case "list":
    list();
    break;

  case "set-password": {
    const user = requireUser(email);
    if (!password || password.length < 8) {
      console.error("Password required, minimum 8 characters.");
      process.exit(1);
    }
    const hash = hashPassword(password);
    db.prepare("UPDATE users SET passwordHash = ?, updatedAt = ? WHERE id = ?").run(
      hash,
      Math.floor(Date.now() / 1000),
      user.id
    );
    // Prove the stored value actually verifies before reporting success, using
    // the same parse the server does. Catches any drift in the two hashers.
    const stored = db.prepare("SELECT passwordHash FROM users WHERE id = ?").get(user.id).passwordHash;
    const [, n, r, p, salt, expected] = stored.split("$");
    const check = scryptSync(password, salt, KEYLEN, {
      N: Number(n),
      r: Number(r),
      p: Number(p),
      maxmem: 128 * Number(n) * Number(r) * 2,
    });
    const ok = timingSafeEqual(check, Buffer.from(expected, "hex"));
    console.log(ok ? `Password updated for ${user.email}.` : "Write failed verification — not updated.");
    process.exit(ok ? 0 : 1);
  }

  case "promote": {
    const user = requireUser(email);
    db.prepare("UPDATE users SET role = 'admin', updatedAt = ? WHERE id = ?").run(
      Math.floor(Date.now() / 1000),
      user.id
    );
    console.log(`${user.email} is now an admin.`);
    break;
  }

  default:
    console.log("Usage:");
    console.log("  node scripts/admin-account.mjs list");
    console.log("  node scripts/admin-account.mjs set-password <email> <new-password>");
    console.log("  node scripts/admin-account.mjs promote <email>");
    process.exit(cmd ? 1 : 0);
}
