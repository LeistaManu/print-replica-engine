// Compatibility layer for existing UI code.
// Login now goes through the OAuth 2.0 Authorization Code + PKCE flow
// (src/lib/deriv-auth.ts). No legacy app_id token-redirect logic remains.

import { login as oauthLogin, signup as oauthSignup, logout as oauthLogout, isLoggedIn } from "./deriv-auth";
import { deposit as apiDeposit, withdraw as apiWithdraw } from "./deriv-api";

export {
  DERIV_CLIENT_ID,
  DERIV_REDIRECT_URI,
  DERIV_DEPOSIT_URL,
  DERIV_WITHDRAW_URL,
  SUPPORT_PHONE,
  SUPPORT_PHONE_DISPLAY,
  POST_LOGIN_PATH,
} from "./deriv-config";

/** Partner sign-up link (affiliate tracking). */
export const DERIV_SIGNUP_URL = "https://partner-tracking.deriv.com/click?a=26457&o=1&c=3&link_id=1";

export { isLoggedIn };

export function handleLogin(e?: { preventDefault?: () => void }) {
  e?.preventDefault?.();
  void oauthLogin("/app/dashboard");
}

export function handleSignup(e?: { preventDefault?: () => void }) {
  e?.preventDefault?.();
  void oauthSignup("/app/dashboard");
}

export function handleLogout(e?: { preventDefault?: () => void }) {
  e?.preventDefault?.();
  oauthLogout("/");
}

export function handleDeposit(e?: { preventDefault?: () => void }) {
  e?.preventDefault?.();
  void apiDeposit();
}

export function handleWithdraw(e?: { preventDefault?: () => void }) {
  e?.preventDefault?.();
  void apiWithdraw();
}
