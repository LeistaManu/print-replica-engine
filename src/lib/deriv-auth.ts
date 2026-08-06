// Deriv OAuth 2.0 Authorization Code Flow with PKCE
// Ready-to-paste fixed version

import {
  DERIV_AUTHORIZE_ENDPOINT,
  DERIV_CLIENT_ID,
  DERIV_REDIRECT_PATH,
  DERIV_REDIRECT_URI,
  DERIV_SCOPES,
} from './deriv-config'

const VERIFIER_KEY = 'digittool.pkce.verifier'
const STATE_KEY = 'digittool.pkce.state'
const RETURN_KEY = 'digittool.pkce.return'
const SESSION_KEY = 'digittool.deriv.session'

export interface DerivSession {
  access_token: string
  refresh_token?: string
  token_type?: string
  expires_at?: number
  scope?: string
}

/* -------------------------------------------------- */
/* PKCE HELPERS */
/* -------------------------------------------------- */

function randomString(bytes = 48): string {
  const buf = new Uint8Array(bytes)
  crypto.getRandomValues(buf)
  return base64UrlEncode(buf)
}

function base64UrlEncode(bytes: Uint8Array): string {
  let str = ''
  bytes.forEach((b) => (str += String.fromCharCode(b)))
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function sha256Challenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(verifier)
  )
  return base64UrlEncode(new Uint8Array(digest))
}

/* -------------------------------------------------- */
/* SESSION EVENTS */
/* -------------------------------------------------- */

export const SESSION_EVENT = 'digittool:deriv-session'

function broadcastSession() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(SESSION_EVENT))
}

export function subscribeSession(fn: () => void): () => void {
  if (typeof window === 'undefined') return () => {}

  const onStorage = (e: StorageEvent) => {
    if (!e.key || e.key === SESSION_KEY) fn()
  }

  window.addEventListener(SESSION_EVENT, fn)
  window.addEventListener('storage', onStorage)

  return () => {
    window.removeEventListener(SESSION_EVENT, fn)
    window.removeEventListener('storage', onStorage)
  }
}

/* -------------------------------------------------- */
/* SESSION STORAGE */
/* -------------------------------------------------- */

export function clearSession() {
  if (typeof window === 'undefined') return

  localStorage.removeItem(SESSION_KEY)
  localStorage.removeItem('digittool.deriv.activeLoginid')
  localStorage.removeItem('digittool.deriv.tokens')

  broadcastSession()
}

export function getSession(): DerivSession | null {
  if (typeof window === 'undefined') return null

  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null

    const session = JSON.parse(raw) as DerivSession

    if (!session?.access_token) {
      clearSession()
      return null
    }

    // Keep an expired session long enough for refreshSession() to use its
    // refresh token. Clearing it here made refresh impossible and forced the
    // UI back to guest mode as soon as an access token reached its expiry.
    if (session.expires_at && session.expires_at < Date.now()) {
      return null
    }

    return session
  } catch {
    clearSession()
    return null
  }
}

export function setSession(session: DerivSession) {
  if (typeof window === 'undefined') return

  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  broadcastSession()
}

export function getAccessToken(): string | null {
  return getSession()?.access_token ?? null
}

export function isLoggedIn(): boolean {
  return !!getSession()
}

/* -------------------------------------------------- */
/* AUTO REFRESH */
/* -------------------------------------------------- */

export async function refreshSession(): Promise<DerivSession | null> {
  const current = (() => {
    try {
      const raw = localStorage.getItem(SESSION_KEY)
      return raw ? (JSON.parse(raw) as DerivSession) : null
    } catch {
      return null
    }
  })()

  if (!current?.refresh_token) return null

  try {
    const res = await fetch('/api/auth/deriv', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: current.refresh_token }),
    })

    const payload = await res.json()

    if (!res.ok || !payload?.access_token) {
      clearSession()
      return null
    }

    const session: DerivSession = {
      access_token: payload.access_token,
      refresh_token: payload.refresh_token ?? current.refresh_token,
      token_type: payload.token_type ?? 'Bearer',
      scope: payload.scope,
      expires_at: payload.expires_in
        ? Date.now() + payload.expires_in * 1000
        : undefined,
    }

    setSession(session)
    return session
  } catch {
    clearSession()
    return null
  }
}

export async function ensureValidSession(): Promise<DerivSession | null> {
  const current = getSession()
  if (current) return current

  return refreshSession()
}

/* -------------------------------------------------- */
/* LOGIN */
/* -------------------------------------------------- */

export function resolveRedirectUri(): string {
  if (typeof window === 'undefined') return DERIV_REDIRECT_URI

  const origin = window.location.origin

  if (DERIV_REDIRECT_URI.startsWith(origin)) {
    return DERIV_REDIRECT_URI
  }

  return `${origin}${DERIV_REDIRECT_PATH}`
}

export async function login(returnTo?: string): Promise<void> {
  if (typeof window === 'undefined') return

  const verifier = randomString()
  const challenge = await sha256Challenge(verifier)
  const state = randomString(24)

  sessionStorage.setItem(VERIFIER_KEY, verifier)
  sessionStorage.setItem(STATE_KEY, state)

  if (returnTo) {
    sessionStorage.setItem(RETURN_KEY, returnTo)
  }

  localStorage.setItem(VERIFIER_KEY, verifier)
  localStorage.setItem(STATE_KEY, state)

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: DERIV_CLIENT_ID,
    redirect_uri: resolveRedirectUri(),
    scope: DERIV_SCOPES.join(' '),
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  })

  window.location.assign(
    `${DERIV_AUTHORIZE_ENDPOINT}?${params.toString()}`
  )
}

export function consumeReturnTo(): string | null {
  const v = sessionStorage.getItem(RETURN_KEY)
  sessionStorage.removeItem(RETURN_KEY)
  return v
}

function readStored(key: string): string | null {
  return (
    sessionStorage.getItem(key) ?? localStorage.getItem(key)
  )
}

function clearPkce() {
  ;[VERIFIER_KEY, STATE_KEY].forEach((k) => {
    sessionStorage.removeItem(k)
    localStorage.removeItem(k)
  })
}

export class OAuthError extends Error {}

/* -------------------------------------------------- */
/* EXCHANGE CODE */
/* -------------------------------------------------- */

export async function exchangeCode(
  code: string,
  state: string | null
): Promise<DerivSession> {
  const expectedState = readStored(STATE_KEY)
  const verifier = readStored(VERIFIER_KEY)

  if (!expectedState || !state || state !== expectedState) {
    clearPkce()
    throw new OAuthError(
      'Security check failed. Please sign in again.'
    )
  }

  if (!verifier) {
    clearPkce()
    throw new OAuthError('Login session expired. Please sign in again.')
  }

  const res = await fetch('/api/auth/deriv', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code,
      code_verifier: verifier,
      redirect_uri: resolveRedirectUri(),
    }),
  })

  clearPkce()

  const payload = await res.json()

  if (!res.ok || !payload?.access_token) {
    throw new OAuthError(
      payload?.error_description ||
        payload?.error ||
        'Could not complete sign in with Deriv.'
    )
  }

  const session: DerivSession = {
    access_token: payload.access_token,
    refresh_token: payload.refresh_token,
    token_type: payload.token_type ?? 'Bearer',
    scope: payload.scope,
    expires_at: payload.expires_in
      ? Date.now() + payload.expires_in * 1000
      : undefined,
  }

  setSession(session)
  return session
}

/* -------------------------------------------------- */
/* LOGOUT */
/* -------------------------------------------------- */

export function logout(redirectTo = '/') {
  clearSession()
  clearPkce()

  if (typeof window !== 'undefined') {
    window.location.assign(redirectTo)
  }
}

/* -------------------------------------------------- */
/* REDIRECT TOKEN CAPTURE */
/* -------------------------------------------------- */

const TOKENS_KEY = 'digittool.deriv.tokens'

export function getAccountTokens(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(TOKENS_KEY) || '{}')
  } catch {
    return {}
  }
}

export function getTokenFor(loginid: string): string | null {
  return getAccountTokens()[loginid] ?? null
}

function setAccountTokens(map: Record<string, string>) {
  localStorage.setItem(TOKENS_KEY, JSON.stringify(map))
}

export function captureRedirectTokens(): DerivSession | null {
  if (typeof window === 'undefined') return null

  const url = new URL(window.location.href)
  const qs = url.searchParams

  if (!qs.has('token1')) return null

  const tokens = { ...getAccountTokens() }

  let first: string | null = null

  for (let i = 1; i < 20; i++) {
    const token = qs.get(`token${i}`)
    const acct = qs.get(`acct${i}`)

    if (!token) break

    if (acct) tokens[acct] = token
    if (!first) first = token

    qs.delete(`token${i}`)
    qs.delete(`acct${i}`)
    qs.delete(`cur${i}`)
  }

  if (!first) return null

  setAccountTokens(tokens)

  const session: DerivSession = {
    access_token: first,
    token_type: 'Bearer',
  }

  setSession(session)

  window.history.replaceState(
    {},
    '',
    `${url.pathname}${qs.toString() ? `?${qs}` : ''}${url.hash}`
  )

  return session
}
