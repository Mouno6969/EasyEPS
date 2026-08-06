export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

/** Where an unauthenticated visitor is sent to sign in. */
export const SIGN_IN_PATH = "/signin";
export const SIGN_UP_PATH = "/signup";

/**
 * Send the visitor to the local sign-in page.
 *
 * Replaces the old `startLogin()`, which built a URL from
 * `VITE_OAUTH_PORTAL_URL` and threw `TypeError: Invalid URL` when that variable
 * was unset — taking the click handler down before it could navigate. Accounts
 * are local now, so this is a plain in-app navigation.
 */
export function goToSignIn(): void {
  if (typeof window === "undefined") return;
  if (window.location.pathname === SIGN_IN_PATH) return;
  window.location.assign(SIGN_IN_PATH);
}
