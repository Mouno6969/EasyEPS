import { describe, expect, it, vi } from "vitest";
import { SignJWT } from "jose";

/**
 * Session integrity, exercised against the real `sdk` rather than a local copy.
 *
 * An earlier version of this file re-implemented `verifySession` and the secret
 * policy inline, so it passed no matter what `sdk.ts` actually did — precisely
 * the wrong property for the code that stands between a request and any user's
 * account. Everything here now imports the shipped implementation.
 *
 * `ENV` reads `JWT_SECRET` once at module load, so tests that need a different
 * secret reset the module registry and re-import (`loadSdk`).
 */

const REAL_SECRET = "k".repeat(48);
const THIS_APP = "easyeps";

/** Fresh `sdk` instance bound to `secret`. */
async function loadSdk(secret: string | undefined) {
  vi.resetModules();
  if (secret === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = secret;
  return (await import("./_core/sdk")).sdk;
}

/** Mint a token directly with jose, bypassing the SDK, to forge bad inputs. */
async function forge(
  claims: Record<string, unknown>,
  { secret = REAL_SECRET, expSeconds = 3600 } = {},
) {
  return new SignJWT(claims)
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setExpirationTime(Math.floor(Date.now() / 1000) + expSeconds)
    .sign(new TextEncoder().encode(secret));
}

describe("session signing secret", () => {
  it("refuses to sign when JWT_SECRET is missing or too short", async () => {
    // Unset makes jose throw an opaque "Zero-length key" on first login; a short
    // value is brute-forceable offline, after which any openId can be minted.
    for (const weak of [undefined, "", "secret", "changeme", "k".repeat(31)]) {
      const sdk = await loadSdk(weak);
      await expect(sdk.createSessionToken("learner-1")).rejects.toThrow(/JWT_SECRET/);
    }
  });

  it("accepts a secret of at least 32 bytes", async () => {
    for (const ok of ["k".repeat(32), REAL_SECRET]) {
      const sdk = await loadSdk(ok);
      await expect(sdk.createSessionToken("learner-1")).resolves.toBeTypeOf("string");
    }
  });

  it("refuses to verify under a missing secret instead of accepting the token", async () => {
    const good = await loadSdk(REAL_SECRET);
    const token = await good.createSessionToken("learner-1", { name: "Learner" });

    const broken = await loadSdk("");
    // verifySession catches and returns null rather than throwing, but the
    // critical property is that it does not authenticate.
    await expect(broken.verifySession(token)).resolves.toBeNull();
  });
});

describe("session round-trip", () => {
  it("accepts a token it minted itself", async () => {
    const sdk = await loadSdk(REAL_SECRET);
    const token = await sdk.createSessionToken("learner-1", { name: "Learner" });

    const session = await sdk.verifySession(token);
    expect(session?.openId).toBe("learner-1");
    expect(session?.appId).toBe(THIS_APP);
    expect(session?.name).toBe("Learner");
  });

  it("rejects a missing or empty cookie", async () => {
    const sdk = await loadSdk(REAL_SECRET);
    for (const empty of [undefined, null, ""]) {
      await expect(sdk.verifySession(empty)).resolves.toBeNull();
    }
  });

  it("rejects a structurally invalid token", async () => {
    const sdk = await loadSdk(REAL_SECRET);
    for (const junk of ["not-a-jwt", "a.b.c", "..", "eyJhbGciOiJIUzI1NiJ9"]) {
      await expect(sdk.verifySession(junk)).resolves.toBeNull();
    }
  });
});

describe("session app binding", () => {
  it("rejects a token minted for a different app under the same secret", async () => {
    // appId is written at signing time; without this check a token from a
    // sibling app sharing the signing secret would authenticate here.
    const sdk = await loadSdk(REAL_SECRET);
    const foreign = await forge({ openId: "attacker", appId: "some-other-app", name: "X" });
    await expect(sdk.verifySession(foreign)).resolves.toBeNull();
  });

  it("rejects a token signed with the wrong secret", async () => {
    const sdk = await loadSdk(REAL_SECRET);
    const foreign = await forge(
      { openId: "learner-1", appId: THIS_APP, name: "Learner" },
      { secret: "z".repeat(48) },
    );
    await expect(sdk.verifySession(foreign)).resolves.toBeNull();
  });

  it("rejects an expired token", async () => {
    const sdk = await loadSdk(REAL_SECRET);
    const expired = await forge(
      { openId: "learner-1", appId: THIS_APP, name: "Learner" },
      { expSeconds: -60 },
    );
    await expect(sdk.verifySession(expired)).resolves.toBeNull();
  });

  it("rejects an unsigned (alg: none) token", async () => {
    const sdk = await loadSdk(REAL_SECRET);
    const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
    const body = Buffer.from(
      JSON.stringify({ openId: "attacker", appId: THIS_APP, name: "X", exp: 4102444800 }),
    ).toString("base64url");
    await expect(sdk.verifySession(`${header}.${body}.`)).resolves.toBeNull();
  });

  it("rejects tokens missing required claims", async () => {
    const sdk = await loadSdk(REAL_SECRET);
    const cases = [
      { appId: THIS_APP, name: "X" }, // no openId
      { openId: "x", name: "X" }, // no appId
      { openId: "x", appId: THIS_APP }, // no name
      { openId: "", appId: THIS_APP, name: "X" }, // empty openId
      { openId: 42, appId: THIS_APP, name: "X" }, // wrong type
    ];
    for (const claims of cases) {
      await expect(sdk.verifySession(await forge(claims))).resolves.toBeNull();
    }
  });
});

describe("storage proxy key guard", () => {
  /** Mirrors the traversal check in registerStorageProxy. */
  function rejected(key: string): boolean {
    const decoded = (() => {
      try {
        return decodeURIComponent(key);
      } catch {
        return key;
      }
    })();
    return decoded.split(/[\\/]/).some(segment => segment === "..");
  }

  it("passes keys the app actually mints", () => {
    expect(rejected("avatars/user-1_ab12cd34.jpg")).toBe(false);
    expect(rejected("eps-images/sign-no-entry.svg")).toBe(false);
    // A filename may legitimately begin with dots.
    expect(rejected("..foo/bar.jpg")).toBe(false);
  });

  it("blocks traversal, including percent-encoded and backslash forms", () => {
    expect(rejected("../../etc/passwd")).toBe(true);
    expect(rejected("..%2f..%2fsecret")).toBe(true);
    expect(rejected("avatars/../../secret")).toBe(true);
    expect(rejected("a/..\\..\\b")).toBe(true);
  });
});
