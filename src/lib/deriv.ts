// Deriv OAuth + affiliate + cashier helpers.
// After clicking login / signup we open Deriv in a new tab and immediately
// return the user to our workspace so the session on this site is preserved.

export const DERIV_APP_ID = "36300";
export const DERIV_OAUTH_URL = `https://oauth.deriv.com/oauth2/authorize?app_id=${DERIV_APP_ID}`;
export const DERIV_SIGNUP_URL = "https://track.deriv.com/_SBDSiGetH571hit6RV3zsGNd7ZgqdRLk/1/";
export const DERIV_DEPOSIT_URL = "https://app.deriv.com/cashier/deposit";
export const DERIV_WITHDRAW_URL = "https://app.deriv.com/cashier/withdrawal";
export const SUPPORT_PHONE = "+254700210017";
export const SUPPORT_PHONE_DISPLAY = "0700210017";

function openExternalAndReturn(url: string, returnTo: string) {
  if (typeof window === "undefined") return;
  // Open Deriv login/signup in a popup so THIS tab (our site) is preserved.
  let popup: Window | null = null;
  try {
    popup = window.open(
      url,
      "deriv_auth",
      "noopener,noreferrer,width=520,height=720,left=200,top=100",
    );
  } catch {}
  // Immediately route this tab to the workspace so the user is already "back".
  try { window.location.href = returnTo; } catch {}
  if (!popup) {
    // Popup blocked — fall back to a new tab.
    try { window.open(url, "_blank", "noopener,noreferrer"); } catch {}
    return;
  }
  const timer = setInterval(() => {
    try {
      if (popup!.closed) {
        clearInterval(timer);
        try { window.focus(); } catch {}
        window.location.href = returnTo;
      }
    } catch {
      clearInterval(timer);
    }
  }, 600);
}

export function handleLogin(e?: { preventDefault?: () => void }) {
  e?.preventDefault?.();
  openExternalAndReturn(DERIV_OAUTH_URL, "/app/bot-builder");
}

export function handleSignup(e?: { preventDefault?: () => void }) {
  e?.preventDefault?.();
  openExternalAndReturn(DERIV_SIGNUP_URL, "/app/bot-builder");
}

export function handleDeposit(e?: { preventDefault?: () => void }) {
  e?.preventDefault?.();
  window.open(DERIV_DEPOSIT_URL, "_blank", "noopener,noreferrer");
}

export function handleWithdraw(e?: { preventDefault?: () => void }) {
  e?.preventDefault?.();
  window.open(DERIV_WITHDRAW_URL, "_blank", "noopener,noreferrer");
}
