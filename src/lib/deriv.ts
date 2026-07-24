// Deriv OAuth + affiliate + cashier helpers.
// Login / Signup redirect the CURRENT tab to Deriv (same-tab flow like
// dollarprinter.com) so Deriv's OAuth return sends the user back to our site
// automatically — no popup blockers, no orphan tabs.

export const DERIV_APP_ID = "36300";
export const DERIV_API_TOKEN = "pat_0b94666ffc899f84515febbc1ec5ddbd58d25e5e6f6803fadf7de73d812aa93e";
export const DERIV_REDIRECT_URI = "https://digitoolderivtrader.vercel.app/app/dashboard";
export const DERIV_OAUTH_URL = `https://oauth.deriv.com/oauth2/authorize?app_id=${DERIV_APP_ID}&l=EN&brand=deriv&redirect_uri=${encodeURIComponent(DERIV_REDIRECT_URI)}`;
export const DERIV_SIGNUP_URL = "https://partner-tracking.deriv.com/click?a=26457&o=1&c=3&link_id=1";
export const DERIV_DEPOSIT_URL = "https://app.deriv.com/cashier/deposit";
export const DERIV_WITHDRAW_URL = "https://app.deriv.com/cashier/withdrawal";
export const SUPPORT_PHONE = "+254700210017";
export const SUPPORT_PHONE_DISPLAY = "0700210017";

const RETURN_TO = "/app/dashboard";

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
  sameTab(DERIV_OAUTH_URL);
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
