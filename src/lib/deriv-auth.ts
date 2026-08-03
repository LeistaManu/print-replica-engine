// Deriv OAuth 2.0 Authorization Code Flow with PKCE (client side).
// The authorization code is exchanged for an access token ONLY on the server
// (see src/routes/api/auth/deriv.ts) so no client secret ever reaches the browser.

import {
  DERIV_AUTHORIZE_ENDPOINT,
  DERIV_CLIENT_ID,
  DERIV_REDIRECT_PATH,
  DERIV_REDIRECT_URI,
  DERIV_SCOPES,
} from "./deriv-config";

const VERIFIER_KEY = "digittool.pkce.verifier";
const STATE_KEY = "digittool.pkce.state";
const RETURN_KEY = "digittool.pkce.return";
const SESSION_KEY = "digittool.deriv.session";

export interface DerivSession {
  access_token: string;
  refresh_token?: string;
  token_type?: string;
  expires_at?: number; // epoch ms
  scope?: string;
}

/* ------------------------------------------------------------------ *
 * PKCE helpers
 * ------------------------------------------------------------------ */

function randomString(bytes = 48): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return base64UrlEncode(buf);
}

function base64UrlEncode(bytes: Uint8Array): string {
  let str = "";
  bytes.forEach((b) => (str += String.fromCharCode(b)));
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sha256Challenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return base64UrlEncode(new Uint8Array(digest));
}

/* ------------------------------------------------------------------ *
 * Session storage
 * ------------------------------------------------------------------ */

export function getSession(): DerivSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as DerivSession;
    if (!session?.access_token) return null;
    if (session.expires_at && session.expires_at < Date.now()) return null;
    return session;
  } catch {
    return null;
  }
}

export function setSession(session: DerivSession) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    /* storage unavailable */
  }
}

export function clearSession() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem("digittool.deriv.activeLoginid");
  } catch {
    /* noop */
  }
}

export function getAccessToken(): string | null {
  return getSession()?.access_token ?? null;
}

export function isLoggedIn(): boolean {
  return !!getAccessToken();
}

/* ------------------------------------------------------------------ *
 * Login / callback / logout
 * ------------------------------------------------------------------ */

/** Redirect URI: prefer the registered production URI, fall back to the
 *  current origin so preview/staging deployments stay usable. */
export function resolveRedirectUri(): string {
  if (typeof window === "undefined") return DERIV_REDIRECT_URI;
  const origin = window.location.origin;
  if (DERIV_REDIRECT_URI.startsWith(origin)) return DERIV_REDIRECT_URI;
  return `${origin}${DERIV_REDIRECT_PATH}`;
}

/** Start the OAuth PKCE flow by redirecting the current tab to Deriv. */
export async function login(returnTo?: string): Promise<void> {
  if (typeof window === "undefined") return;

  const verifier = randomString();
  const challenge = await sha256Challenge(verifier);
  const state = randomString(24);

  try {
    sessionStorage.setItem(VERIFIER_KEY, verifier);
    sessionStorage.setItem(STATE_KEY, state);
    if (returnTo) sessionStorage.setItem(RETURN_KEY, returnTo);
    // Mirror into localStorage: some in-app browsers drop sessionStorage on
    // cross-origin round trips.
    localStorage.setItem(VERIFIER_KEY, verifier);
    localStorage.setItem(STATE_KEY, state);
  } catch {
    /* noop */
  }

  const params = new URLSearchParams({
    response_type: "code",
    client_id: DERIV_CLIENT_ID,
    redirect_uri: resolveRedirectUri(),
    scope: DERIV_SCOPES.join(" "),
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
  });

  window.location.assign(`${DERIV_AUTHORIZE_ENDPOINT}?${params.toString()}`);
}

export function consumeReturnTo(): string | null {
  try {
    const v = sessionStorage.getItem(RETURN_KEY);
    sessionStorage.removeItem(RETURN_KEY);
    return v;
  } catch {
    return null;
  }
}

function readStored(key: string): string | null {
  try {
    return sessionStorage.getItem(key) ?? localStorage.getItem(key);
  } catch {
    return null;
  }
}

function clearPkce() {
  try {
    [VERIFIER_KEY, STATE_KEY].forEach((k) => {
      sessionStorage.removeItem(k);
      localStorage.removeItem(k);
    });
  } catch {
    /* noop */
  }
}

export class OAuthError extends Error {}

/**
 * Validate `state`, then exchange the authorization code for an access token
 * through our own backend endpoint. Stores the resulting session.
 */
export async function exchangeCode(code: string, state: string | null): Promise<DerivSession> {
  const expectedState = readStored(STATE_KEY);
  const verifier = readStored(VERIFIER_KEY);

  if (!expectedState || !state || state !== expectedState) {
    clearPkce();
    throw new OAuthError("Security check failed (invalid state). Please sign in again.");
  }
  if (!verifier) {
    clearPkce();
    throw new OAuthError("Login session expired. Please sign in again.");
  }

  const res = await fetch("/api/auth/deriv", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      code,
      code_verifier: verifier,
      redirect_uri: resolveRedirectUri(),
    }),
  });

  clearPkce();

  const payload = (await res.json().catch(() => null)) as
    | (DerivSession & { error?: string; error_description?: string; expires_in?: number })
    | null;

  if (!res.ok || !payload?.access_token) {
    throw new OAuthError(
      payload?.error_description || payload?.error || "Could not complete sign in with Deriv.",
    );
  }

  const session: DerivSession = {
    access_token: payload.access_token,
    refresh_token: payload.refresh_token,
    token_type: payload.token_type ?? "Bearer",
    scope: payload.scope,
    expires_at: payload.expires_in ? Date.now() + payload.expires_in * 1000 : undefined,
  };
  setSession(session);
  return session;
}

/** Refresh the access token when the provider issued a refresh token. */
export async function refreshSession(): Promise<DerivSession | null> {
  const current = (() => {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      return raw ? (JSON.parse(raw) as DerivSession) : null;
    } catch {
      return null;
    }
  })();
  if (!current?.refresh_token) return null;

  try {
    const res = await fetch("/api/auth/deriv", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: current.refresh_token }),
    });
    const payload = (await res.json().catch(() => null)) as
      | (DerivSession & { expires_in?: number })
      | null;
    if (!res.ok || !payload?.access_token) return null;

    const session: DerivSession = {
      access_token: payload.access_token,
      refresh_token: payload.refresh_token ?? current.refresh_token,
      token_type: payload.token_type ?? "Bearer",
      scope: payload.scope,
      expires_at: payload.expires_in ? Date.now() + payload.expires_in * 1000 : undefined,
    };
    setSession(session);
    return session;
  } catch {
    return null;
  }
}

export function logout(redirectTo = "/") {
  clearSession();
  clearPkce();
  if (typeof window !== "undefined") window.location.assign(redirectTo);
}
