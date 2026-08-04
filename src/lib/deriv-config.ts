// Central Deriv OAuth 2.0 configuration (no legacy app_id token-redirect flow).

export const DERIV_CLIENT_ID = "340UoQOIkTBicdefuj36O";

/** Public site origin used for the registered redirect URI. */
export const SITE_ORIGIN = "https://www.digittoolderiv.site";

/** Registered redirect URI (must match the Deriv OAuth app exactly). */
export const DERIV_REDIRECT_PATH = "/auth/callback";
export const DERIV_REDIRECT_URI = `${SITE_ORIGIN}${DERIV_REDIRECT_PATH}`;

/** Deriv OAuth 2.0 endpoints (current, non-legacy). */
export const DERIV_AUTHORIZE_ENDPOINT = "https://auth.deriv.com/oauth2/auth";
export const DERIV_TOKEN_ENDPOINT = "https://auth.deriv.com/oauth2/token";

/** Scopes requested for trading + account management + cashier. */
export const DERIV_SCOPES = ["trade", "account_manage", "application_read", "payment"] as const;

/** Numeric Deriv application id used for the API WebSocket handshake.
 *  The OAuth client id is NOT a valid app_id — ws.derivws.com rejects the
 *  connection (which is what left the UI stuck on "Connecting…").
 *  Override with VITE_DERIV_APP_ID once your own app id is provisioned. */
export const DERIV_WS_APP_ID =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_DERIV_APP_ID) || "1089";

/** Deriv API WebSocket endpoint. */
export const DERIV_WS_URL = `wss://ws.derivws.com/websockets/v3?app_id=${DERIV_WS_APP_ID}&l=EN&brand=deriv`;

/** Official Deriv cashier destinations (opened for deposit/withdraw flows). */
export const DERIV_DEPOSIT_URL = "https://app.deriv.com/cashier/deposit";
export const DERIV_WITHDRAW_URL = "https://app.deriv.com/cashier/withdrawal";

/** Where the user lands after a successful login. */
export const POST_LOGIN_PATH = "/app/dashboard";

export const SUPPORT_PHONE = "+254700210017";
export const SUPPORT_PHONE_DISPLAY = "0700210017";
