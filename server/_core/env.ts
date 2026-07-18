export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  /**
   * When true, signed-in users must complete Hangul Basics before curriculum
   * progress writes and practice / chapter-exam attempts. Default false until
   * backfill runs. Rollback = leave unset or set to anything other than "true".
   * See docs/BASICS_RUNBOOK.md.
   */
  basicsGateEnabled: process.env.BASICS_GATE_ENABLED === "true",
};
