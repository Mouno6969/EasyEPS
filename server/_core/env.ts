/**
 * SpaceXAI (xAI) is the default LLM provider for chat/tutor.
 * Env uses real xAI names: XAI_API_KEY + https://api.x.ai/v1 — not SPACEXAI_*.
 * Optional BUILT_IN_FORGE_* remains for storage/legacy Manus helpers only.
 */
export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
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
