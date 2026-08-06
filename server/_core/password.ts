import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt) as (
  password: string | Buffer,
  salt: string | Buffer,
  keylen: number,
  options: { N: number; r: number; p: number; maxmem: number },
) => Promise<Buffer>;

/**
 * scrypt cost parameters. N=2^15 keeps a single hash around ~100ms on this
 * hardware — slow enough to make offline guessing expensive, fast enough that a
 * login request is not noticeably delayed. `maxmem` must be raised explicitly
 * because node's 32MB default rejects N this large (128 * N * r ≈ 32MB).
 */
const N = 32768;
const R = 8;
const P = 1;
const MAXMEM = 128 * N * R * 2;
const KEYLEN = 64;
const SALT_BYTES = 16;

/** Stored format: scrypt$N$r$p$salt$hash — self-describing so cost can be raised later. */
const PREFIX = "scrypt";

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES).toString("hex");
  const derived = await scryptAsync(password, salt, KEYLEN, { N, r: R, p: P, maxmem: MAXMEM });
  return `${PREFIX}$${N}$${R}$${P}$${salt}$${derived.toString("hex")}`;
}

/**
 * Constant-time verification. Returns false rather than throwing on malformed
 * input so a corrupt row cannot 500 the login endpoint — the caller reports the
 * same generic failure either way.
 */
export async function verifyPassword(password: string, stored: string | null | undefined): Promise<boolean> {
  if (!stored) return false;

  const parts = stored.split("$");
  if (parts.length !== 6) return false;

  const [scheme, nRaw, rRaw, pRaw, salt, expectedHex] = parts;
  if (scheme !== PREFIX) return false;

  const n = Number(nRaw);
  const r = Number(rRaw);
  const p = Number(pRaw);
  if (!Number.isInteger(n) || !Number.isInteger(r) || !Number.isInteger(p)) return false;
  if (n <= 0 || r <= 0 || p <= 0) return false;

  let expected: Buffer;
  try {
    expected = Buffer.from(expectedHex, "hex");
  } catch {
    return false;
  }
  if (expected.length === 0) return false;

  try {
    const derived = await scryptAsync(password, salt, expected.length, {
      N: n,
      r,
      p,
      maxmem: 128 * n * r * 2,
    });
    // Lengths are equal by construction above, but timingSafeEqual throws if
    // they ever differ, so guard rather than let it escape as a 500.
    if (derived.length !== expected.length) return false;
    return timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

/**
 * Internal user identifier, e.g. `usr_9f2c...`. Sessions are signed against this
 * rather than the email so changing an email never invalidates a session or
 * orphans progress rows keyed on the user.
 */
export function generateOpenId(): string {
  return `usr_${randomBytes(16).toString("hex")}`;
}
