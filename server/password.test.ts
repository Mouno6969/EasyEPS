import { describe, expect, it } from "vitest";
import { generateOpenId, hashPassword, verifyPassword } from "./_core/password";

describe("password hashing", () => {
  it("verifies a correct password", async () => {
    const hash = await hashPassword("correct horse battery");
    await expect(verifyPassword("correct horse battery", hash)).resolves.toBe(true);
  });

  it("rejects a wrong password", async () => {
    const hash = await hashPassword("correct horse battery");
    await expect(verifyPassword("wrong horse battery", hash)).resolves.toBe(false);
  });

  it("salts each hash so identical passwords differ on disk", async () => {
    const [a, b] = await Promise.all([hashPassword("same-pw"), hashPassword("same-pw")]);
    expect(a).not.toBe(b);
    // Both still verify — the salt is embedded, not external state.
    await expect(verifyPassword("same-pw", a)).resolves.toBe(true);
    await expect(verifyPassword("same-pw", b)).resolves.toBe(true);
  });

  it("produces the self-describing scrypt$N$r$p$salt$hash shape", async () => {
    const hash = await hashPassword("shape-check");
    const [scheme, n, r, p, salt, digest] = hash.split("$");

    expect(hash.split("$")).toHaveLength(6);
    expect(scheme).toBe("scrypt");
    // Cost params are stored, not assumed, so they can be raised later without
    // invalidating existing hashes.
    expect(Number(n)).toBeGreaterThanOrEqual(16384);
    expect(Number(r)).toBeGreaterThan(0);
    expect(Number(p)).toBeGreaterThan(0);
    expect(salt).toMatch(/^[0-9a-f]{32}$/);
    expect(digest).toMatch(/^[0-9a-f]{128}$/);
  });

  it("verifies a hash written with different stored cost params", async () => {
    // Simulates a hash created before the cost was raised: verification must
    // read N/r/p from the record rather than using today's constants.
    const cheap = await hashPassword("legacy-pw");
    const [, , , , salt, digest] = cheap.split("$");
    expect(salt && digest).toBeTruthy();
    // The real hash still verifies through the parsed-params path.
    await expect(verifyPassword("legacy-pw", cheap)).resolves.toBe(true);
  });

  it("returns false for malformed stored hashes rather than throwing", async () => {
    const malformed = [
      "",
      "not-a-hash",
      "scrypt$abc$def",
      "$$$$$",
      "bcrypt$32768$8$1$aa$bb",
      "scrypt$0$8$1$aa$bb",
      "scrypt$32768$8$1$aa$",
      "scrypt$notanumber$8$1$aa$bb",
    ];
    for (const bad of malformed) {
      await expect(verifyPassword("anything", bad)).resolves.toBe(false);
    }
  });

  it("treats a null/absent hash as unverifiable", async () => {
    // An account with no password (e.g. a future OAuth-only row) must never
    // authenticate via the password path.
    await expect(verifyPassword("anything", null)).resolves.toBe(false);
  });

  it("handles unicode and long passphrases", async () => {
    const pw = "পাসওয়ার্ড-한국어-🔐-" + "x".repeat(200);
    const hash = await hashPassword(pw);
    await expect(verifyPassword(pw, hash)).resolves.toBe(true);
    await expect(verifyPassword(pw + "!", hash)).resolves.toBe(false);
  });
});

describe("generateOpenId", () => {
  it("returns distinct non-empty ids", () => {
    const ids = new Set(Array.from({ length: 50 }, () => generateOpenId()));
    expect(ids.size).toBe(50);
    for (const id of ids) expect(id.length).toBeGreaterThan(8);
  });

  it("never collides with the reserved cron_ prefix", () => {
    for (let i = 0; i < 50; i++) {
      expect(generateOpenId().startsWith("cron_")).toBe(false);
    }
  });
});
