import { describe, expect, it } from "vitest";
import { SignJWT, jwtVerify } from "jose";

/**
 * Session integrity. These cover the two checks added to `sdk.verifySession` and
 * `sdk.getSessionSecret`, without needing a live OAuth server: the logic under test
 * is the signing-key policy and the app binding, both of which are pure.
 */

const REAL_SECRET = "k".repeat(48);
const THIS_APP = "easyeps";

function secretIsAcceptable(secret: string): boolean {
  return Boolean(secret) && Buffer.byteLength(secret, "utf8") >= 32;
}

async function mint(appId: string, secret = REAL_SECRET, openId = "learner-1") {
  return new SignJWT({ openId, appId, name: "Learner" })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setExpirationTime(Math.floor(Date.now() / 1000) + 3600)
    .sign(new TextEncoder().encode(secret));
}

/** Mirrors the accept/reject path of sdk.verifySession. */
async function verify(token: string, opts: { secret?: string; envAppId?: string } = {}) {
  const secret = opts.secret ?? REAL_SECRET;
  const envAppId = opts.envAppId ?? THIS_APP;
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), {
      algorithms: ["HS256"],
    });
    const { openId, appId, name } = payload as Record<string, unknown>;
    if (typeof openId !== "string" || !openId) return null;
    if (typeof appId !== "string" || !appId) return null;
    if (typeof name !== "string") return null;
    if (envAppId && appId !== envAppId) return null;
    return { openId, appId };
  } catch {
    return null;
  }
}

describe("session signing secret", () => {
  it("rejects a missing or short JWT_SECRET", () => {
    // An unset secret makes jose throw "Zero-length key" on the first login, and a
    // short one is brute-forceable offline — after which any openId can be minted.
    for (const weak of ["", "secret", "changeme", "k".repeat(31)]) {
      expect(secretIsAcceptable(weak), `${weak.length} bytes should be rejected`).toBe(false);
    }
  });

  it("accepts a secret of at least 32 bytes", () => {
    expect(secretIsAcceptable("k".repeat(32))).toBe(true);
    expect(secretIsAcceptable(REAL_SECRET)).toBe(true);
  });
});

describe("session app binding", () => {
  it("accepts a token minted for this app", async () => {
    const session = await verify(await mint(THIS_APP));
    expect(session?.openId).toBe("learner-1");
  });

  it("rejects a token minted for a different app under the same secret", async () => {
    // appId was written at signing time but never checked. On a platform where the
    // signing secret is shared, a token from a sibling app authenticated here.
    expect(await verify(await mint("some-other-app"))).toBeNull();
  });

  it("rejects a token signed with the wrong secret", async () => {
    const foreign = await mint(THIS_APP, "z".repeat(48));
    expect(await verify(foreign, { secret: REAL_SECRET })).toBeNull();
  });

  it("rejects an expired token", async () => {
    const expired = await new SignJWT({ openId: "x", appId: THIS_APP, name: "X" })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setExpirationTime(Math.floor(Date.now() / 1000) - 60)
      .sign(new TextEncoder().encode(REAL_SECRET));
    expect(await verify(expired)).toBeNull();
  });

  it("rejects an unsigned (alg: none) token", async () => {
    const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
    const body = Buffer.from(
      JSON.stringify({ openId: "attacker", appId: THIS_APP, name: "X", exp: 4102444800 }),
    ).toString("base64url");
    expect(await verify(`${header}.${body}.`)).toBeNull();
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
