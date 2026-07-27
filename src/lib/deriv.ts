// Deriv OAuth + affiliate + cashier helpers.
// Login / Signup redirect the CURRENT tab to Deriv (same-tab flow like
// dollarprinter.com) so Deriv's OAuth return sends the user back to our site
// automatically — no popup blockers, no orphan tabs.

export const DERIV_APP_ID = "33Vxdb9YF1exXgyW3vms1";
export const DERIV_API_TOKEN = "pat_a7ebbd38e1be1bb0e32a14e6b42935c521d6afd8a99a1183ea411032620245a7";
// Fallback redirect target when running server-side / SSR (no window).
export const DERIV_REDIRECT_URI_FALLBACK = "https://digittoolderiv.site/app/dashboard";
export const DERIV_SIGNUP_URL = "https://https://partner-tracking.deriv.com/click?a=53994&o=1&c=3&link_id=1";
export const DERIV_DEPOSIT_URL = "https://app.deriv.com/cashier/deposit";
export const DERIV_WITHDRAW_URL = "https://app.deriv.com/cashier/withdrawal";
export const SUPPORT_PHONE = "+254700210017";
export const SUPPORT_PHONE_DISPLAY = "0700210017";

const RETURN_TO = "/app/dashboard";

// Build the redirect URI dynamically at call time from the current origin so
// Deriv sends the user back to the SAME site they logged in from. Using a
// hardcoded external URL (e.g. the Vercel domain) makes login appear broken
// on every other origin (preview, published, custom domain).
function buildRedirectUri(): string {
  if (typeof window === "undefined") return DERIV_REDIRECT_URI_FALLBACK;
  return `${window.location.origin}${RETURN_TO}`;
}

export function getDerivOAuthUrl(): string {
  const redirect = buildRedirectUri();
  return `https://oauth.deriv.com/oauth2/authorize?app_id=${DERIV_APP_ID}&l=EN&brand=deriv&redirect_uri=${encodeURIComponent(redirect)}`;
}

// Back-compat export: some modules import this constant directly.
export const DERIV_OAUTH_URL = `https://oauth.deriv.com/oauth2/authorize?app_id=${DERIV_APP_ID}&l=EN&brand=deriv&redirect_uri=${encodeURIComponent(DERIV_REDIRECT_URI_FALLBACK)}`;
export const DERIV_REDIRECT_URI = DERIV_REDIRECT_URI_FALLBACK;

function sameTab(url: string) {
  if (typeof window === "undefined") return;
  try { sessionStorage.setItem("digittool.postAuthReturn", RETURN_TO); } catch {}
  window.location.assign(url);
}

function openInNewTab(url: string) {
  if (typeof window === "undefined") return;
  try {
    const w = window.open(url, "_blank", "noopener,noreferrer");
    if (w) return;
  } catch {}
  try {
    const a = document.createElement("a");
    a.href = url; a.target = "_blank"; a.rel = "noopener noreferrer";
    document.body.appendChild(a); a.click(); a.remove();
  } catch {}
}

export function handleLogin(e?: { preventDefault?: () => void }) {
  e?.preventDefault?.();
  sameTab(getDerivOAuthUrl());
}

export function handleSignup(e?: { preventDefault?: () => void }) {
  e?.preventDefault?.();
  sameTab(DERIV_SIGNUP_URL);
}

export function handleDeposit(e?: { preventDefault?: () => void }) {
  e?.preventDefault?.();
  openInNewTab(DERIV_DEPOSIT_URL);
}

export function handleWithdraw(e?: { preventDefault?: () => void }) {
  e?.preventDefault?.();
  openInNewTab(DERIV_WITHDRAW_URL);
}
