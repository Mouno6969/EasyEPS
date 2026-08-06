/**
 * SpaceXAI (xAI) is the default LLM provider for chat/tutor.
 * Env uses real xAI names: XAI_API_KEY + https://api.x.ai/v1 — not SPACEXAI_*.
 * Optional BUILT_IN_FORGE_* remains for storage/legacy Manus helpers only.
 */
export const ENV = {
  /**
   * Binds a signed session to this app. Previously the Manus OAuth client id;
   * now a fixed constant, since auth is self-hosted. Kept because
   * `sdk.verifySession` rejects tokens whose `appId` does not match, which
   * stops a token minted elsewhere under a shared secret from authenticating.
   */
  appId: "easyeps",
  cookieSecret: process.env.JWT_SECRET ?? "",
  /** Path to the local SQLite database file. Created on first boot. */
  dbFile: process.env.DB_FILE ?? "./data/easyeps.db",
  isProduction: process.env.NODE_ENV === "production",
  /** Preferred LLM key (SpaceXAI / xAI). */
  xaiApiKey: process.env.XAI_API_KEY ?? "",
  /** OpenAI-compatible base, default SpaceXAI endpoint. */
  xaiBaseUrl: (process.env.XAI_BASE_URL ?? "https://api.x.ai/v1").replace(/\/$/, ""),
  /** Default chat model. Override with XAI_MODEL. */
  xaiModel: process.env.XAI_MODEL ?? "grok-4.5",
  /** Legacy Manus Forge URL/key (storage, maps, optional LLM fallback). */
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? process.env.OPENAI_API_KEY ?? "",
  /**
   * When true, signed-in users must complete Hangul Basics before curriculum
   * progress writes and practice / chapter-exam attempts. Default false until
   * backfill runs. Rollback = leave unset or set to anything other than "true".
   * See docs/BASICS_RUNBOOK.md.
   */
  basicsGateEnabled: process.env.BASICS_GATE_ENABLED === "true",
};
