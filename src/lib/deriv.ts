// Deriv OAuth + affiliate + cashier helpers.
// Login / Signup open Deriv in a NEW tab (avoids popup blockers) and
// immediately navigate THIS tab to the workspace so the user is "returned"
// to our site right away.

export const DERIV_APP_ID = "36300";
export const DERIV_OAUTH_URL = `https://oauth.deriv.com/oauth2/authorize?app_id=${DERIV_APP_ID}`;
export const DERIV_SIGNUP_URL = "https://track.deriv.com/_SBDSiGetH571hit6RV3zsGNd7ZgqdRLk/1/";
export const DERIV_DEPOSIT_URL = "https://app.deriv.com/cashier/deposit";
export const DERIV_WITHDRAW_URL = "https://app.deriv.com/cashier/withdrawal";
export const SUPPORT_PHONE = "+254700210017";
export const SUPPORT_PHONE_DISPLAY = "0700210017";

const RETURN_TO = "/app/bot-builder";

function openInNewTab(url: string) {
  if (typeof window === "undefined") return;
  try {
    const w = window.open(url, "_blank", "noopener,noreferrer");
    if (w) return;
  } catch {}
  // Last-resort fallback: temp anchor click (works when window.open is blocked).
  try {
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    a.remove();
  } catch {}
}

function goToWorkspace() {
  if (typeof window === "undefined") return;
  // Only navigate if we're not already there — avoids a reload loop.
  if (!window.location.pathname.startsWith("/app")) {
    window.location.href = RETURN_TO;
  }
}

export function handleLogin(e?: { preventDefault?: () => void }) {
  e?.preventDefault?.();
  openInNewTab(DERIV_OAUTH_URL);
  goToWorkspace();
}

export function handleSignup(e?: { preventDefault?: () => void }) {
  e?.preventDefault?.();
  openInNewTab(DERIV_SIGNUP_URL);
  goToWorkspace();
}

export function handleDeposit(e?: { preventDefault?: () => void }) {
  e?.preventDefault?.();
  openInNewTab(DERIV_DEPOSIT_URL);
}

export function handleWithdraw(e?: { preventDefault?: () => void }) {
  e?.preventDefault?.();
  openInNewTab(DERIV_WITHDRAW_URL);
}
