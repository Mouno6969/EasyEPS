import { beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { TrpcContext } from "./_core/context";

/**
 * Registration and login against a real (temporary) SQLite database.
 *
 * `ENV` reads its values once at module load, so each test file run points
 * DB_FILE at a fresh directory before importing the router. Migrations run on
 * first `getDb()`, so no fixture SQL is needed.
 */

process.env.JWT_SECRET = "k".repeat(48);
process.env.DB_FILE = join(mkdtempSync(join(tmpdir(), "easyeps-auth-")), "test.db");

const { appRouter } = await import("./routers");

type CookieCall = { name: string; value: string; options: Record<string, unknown> };

function createContext(): { ctx: TrpcContext; cookies: CookieCall[] } {
  const cookies: CookieCall[] = [];
  const ctx = {
    user: null,
    req: { protocol: "https", headers: {}, socket: { remoteAddress: `10.0.0.${Math.floor(Math.random() * 250) + 1}` } },
    res: {
      cookie(name: string, value: string, options: Record<string, unknown>) {
        cookies.push({ name, value, options });
      },
      clearCookie() {},
    },
  } as unknown as TrpcContext;
  return { ctx, cookies };
}

function caller() {
  const { ctx, cookies } = createContext();
  return { caller: appRouter.createCaller(ctx), cookies, ctx };
}

let seq = 0;
const uniqueEmail = () => `learner${++seq}-${Date.now()}@example.com`;

describe("auth.register", () => {
  it("creates an account, sets a session cookie, and never returns the password hash", async () => {
    const { caller: api, cookies } = caller();
    const email = uniqueEmail();

    const user = await api.auth.register({ email, password: "hunter2hunter2", fullName: "Test Learner" });

    expect(user?.email).toBe(email);
    expect(user?.name).toBe("Test Learner");
    // The row carries a passwordHash; the payload sent to the browser must not.
    // `auth.me` is mirrored into localStorage, so a leak here is a leak on disk.
    expect(user).not.toHaveProperty("passwordHash");
    expect(user).not.toHaveProperty("openId");
    expect(JSON.stringify(user)).not.toContain("scrypt");

    expect(cookies).toHaveLength(1);
    expect(cookies[0]?.options).toMatchObject({ httpOnly: true, sameSite: "lax", path: "/" });
    expect(cookies[0]?.value.split(".")).toHaveLength(3); // a signed JWT
  });

  it("promotes the very first account to admin and everyone after to user", async () => {
    // Needs a database with no users at all, so this test builds its own rather
    // than sharing the file-level one. There is no other path to the first
    // admin role, so this is the check that matters most in this file.
    process.env.DB_FILE = join(mkdtempSync(join(tmpdir(), "easyeps-first-admin-")), "fresh.db");
    vi.resetModules();
    const { appRouter: fresh } = await import("./routers");

    const owner = await fresh.createCaller(createContext().ctx).auth.register({
      email: uniqueEmail(),
      password: "hunter2hunter2",
      fullName: "Owner",
    });
    expect(owner?.role).toBe("admin");

    const learner = await fresh.createCaller(createContext().ctx).auth.register({
      email: uniqueEmail(),
      password: "hunter2hunter2",
      fullName: "Learner",
    });
    expect(learner?.role).toBe("user");

    const third = await fresh.createCaller(createContext().ctx).auth.register({
      email: uniqueEmail(),
      password: "hunter2hunter2",
      fullName: "Third",
    });
    expect(third?.role).toBe("user");
  });

  it("rejects a duplicate email, case-insensitively", async () => {
    const { caller: api } = caller();
    const email = uniqueEmail();
    await api.auth.register({ email, password: "hunter2hunter2", fullName: "First" });

    const { caller: dup } = caller();
    await expect(
      dup.auth.register({ email: email.toUpperCase(), password: "different-pw", fullName: "Second" }),
    ).rejects.toThrow(/already exists/i);
  });

  it("rejects a password shorter than the shared minimum", async () => {
    const { caller: api } = caller();
    await expect(
      api.auth.register({ email: uniqueEmail(), password: "short", fullName: "Test" }),
    ).rejects.toThrow();
  });

  it("rejects a malformed email", async () => {
    const { caller: api } = caller();
    await expect(
      api.auth.register({ email: "not-an-email", password: "hunter2hunter2", fullName: "Test" }),
    ).rejects.toThrow();
  });
});

describe("auth.login", () => {
  it("signs in with the right password and issues a session", async () => {
    const email = uniqueEmail();
    const { caller: reg } = caller();
    await reg.auth.register({ email, password: "hunter2hunter2", fullName: "Login Test" });

    const { caller: api, cookies } = caller();
    const user = await api.auth.login({ email, password: "hunter2hunter2" });

    expect(user?.email).toBe(email);
    expect(user).not.toHaveProperty("passwordHash");
    expect(cookies).toHaveLength(1);
  });

  it("accepts a differently-cased email", async () => {
    const email = uniqueEmail();
    const { caller: reg } = caller();
    await reg.auth.register({ email, password: "hunter2hunter2", fullName: "Case Test" });

    const { caller: api } = caller();
    await expect(api.auth.login({ email: email.toUpperCase(), password: "hunter2hunter2" })).resolves.toBeTruthy();
  });

  it("gives the same error for a wrong password and an unknown email", async () => {
    const email = uniqueEmail();
    const { caller: reg } = caller();
    await reg.auth.register({ email, password: "hunter2hunter2", fullName: "Enum Test" });

    const { caller: wrongPw } = caller();
    const wrongPwErr = await wrongPw.auth.login({ email, password: "not-the-password" }).catch(e => e);

    const { caller: noUser } = caller();
    const noUserErr = await noUser.auth.login({ email: uniqueEmail(), password: "hunter2hunter2" }).catch(e => e);

    // Identical messages: a differing response would let an attacker enumerate
    // which emails have accounts.
    expect(wrongPwErr.message).toBe(noUserErr.message);
    expect(wrongPwErr.message).toMatch(/wrong email or password/i);
  });

  it("does not set a session cookie on a failed login", async () => {
    const { caller: api, cookies } = caller();
    await api.auth.login({ email: uniqueEmail(), password: "hunter2hunter2" }).catch(() => {});
    expect(cookies).toHaveLength(0);
  });
});

describe("auth.me", () => {
  it("returns null when signed out", async () => {
    const { caller: api } = caller();
    await expect(api.auth.me()).resolves.toBeNull();
  });

  it("omits passwordHash and openId for a signed-in user", async () => {
    const { ctx } = createContext();
    const authed = {
      ...ctx,
      user: {
        id: 1,
        openId: "usr_secret",
        email: "me@example.com",
        name: "Me",
        passwordHash: "scrypt$32768$8$1$deadbeef$cafebabe",
        loginMethod: "password",
        role: "user",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      },
    } as unknown as TrpcContext;

    const me = await appRouter.createCaller(authed).auth.me();

    expect(me?.email).toBe("me@example.com");
    expect(me).not.toHaveProperty("passwordHash");
    expect(me).not.toHaveProperty("openId");
    expect(JSON.stringify(me)).not.toContain("scrypt");
    expect(JSON.stringify(me)).not.toContain("usr_secret");
  });
});

describe("auth rate limiting", () => {
  it("throttles repeated attempts from one address", async () => {
    const cookies: CookieCall[] = [];
    // Pin the address so every call lands in the same bucket.
    const ctx = {
      user: null,
      req: { protocol: "https", headers: {}, socket: { remoteAddress: "203.0.113.99" } },
      res: { cookie: (n: string, v: string, o: Record<string, unknown>) => cookies.push({ name: n, value: v, options: o }), clearCookie() {} },
    } as unknown as TrpcContext;
    const api = appRouter.createCaller(ctx);

    const errors: string[] = [];
    for (let i = 0; i < 15; i++) {
      await api.auth.login({ email: `rl${i}@example.com`, password: "hunter2hunter2" }).catch(e => {
        errors.push(e.message);
      });
    }

    expect(errors.some(m => /too many attempts/i.test(m))).toBe(true);
  });
});
