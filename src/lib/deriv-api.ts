// src/lib/deriv-api.ts
//
// Current Deriv Options API service.
//
// IMPORTANT:
// - Uses OAuth 2.0 access tokens.
// - Uses the current REST Options API for account/balance information.
// - Does NOT use legacy token1/acct1 redirect tokens.
// - Does NOT use legacy balance { account: "all" }.
// - Demo balance reset uses the official Deriv endpoint.
// - WebSocket trading can be added separately through the current OTP flow.

import {
  DERIV_DEPOSIT_URL,
  DERIV_WITHDRAW_URL,
  DERIV_WS_APP_ID,
} from "./deriv-config";

export * from "./deriv-config";

/* -------------------------------------------------------------------------- */
/* Constants                                                                  */
/* -------------------------------------------------------------------------- */

const DERIV_API_BASE = "https://api.derivws.com";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

export interface DerivAccountInfo {
  loginid: string;
  currency: string;
  is_virtual: boolean;
  account_type?: string;
  landing_company_name?: string;
  balance?: number;
  status?: string;
  group?: string;
}

export interface OptionsAccount {
  account_id: string;
  balance: number;
  currency: string;
  group?: string;
  status?: string;
  account_type: string;
}

export interface AuthorizeResult {
  loginid: string;
  email: string;
  fullname: string;
  country: string;
  currency: string;
  is_virtual: 0 | 1;
  balance: number;
  landing_company_name?: string;
  account_list?: Array<{
    loginid: string;
    currency: string;
    is_virtual: 0 | 1;
    account_type?: string;
    landing_company_name?: string;
    balance?: number;
  }>;
}

export interface BalanceInfo {
  loginid: string;
  currency: string;
  balance: number;
  is_virtual?: boolean;
  account_type?: string;
}

export interface PortfolioContract {
  contract_id: number;
  contract_type: string;
  symbol: string;
  buy_price: number;
  payout: number;
  purchase_time: number;
  date_start: number;
  longcode: string;
  currency: string;
}

export interface OpenTrade extends PortfolioContract {
  profit?: number;
  current_spot?: number;
  indicative_price?: number;
}

export interface ClosedTrade {
  contract_id: number;
  contract_type: string;
  buy_price: number;
  sell_price: number;
  payout: number;
  purchase_time: number;
  sell_time: number;
  longcode: string;
  profit: number;
  currency?: string;
}

export interface TransactionRow {
  transaction_id: number;
  action_type: string;
  amount: number;
  balance_after: number;
  transaction_time: number;
  longcode?: string;
  payout?: number;
}

interface ApiErrorPayload {
  errors?: Array<{
    status?: number;
    code?: string;
    message?: string;
  }>;
  error?: string;
  error_description?: string;
  message?: string;
}

/* -------------------------------------------------------------------------- */
/* Errors                                                                     */
/* -------------------------------------------------------------------------- */

export class DerivApiError extends Error {
  code: string;
  status?: number;

  constructor(code: string, message: string, status?: number) {
    super(message);
    this.name = "DerivApiError";
    this.code = code;
    this.status = status;
  }
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function requireBrowser() {
  if (typeof window === "undefined") {
    throw new DerivApiError(
      "server_environment",
      "This Deriv API operation must run in the browser.",
    );
  }
}

function requireToken(token: string | null | undefined): string {
  if (!token) {
    throw new DerivApiError(
      "missing_token",
      "Your Deriv session is not authenticated.",
    );
  }

  return token;
}

function buildHeaders(token: string): HeadersInit {
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
    "Deriv-App-ID": String(DERIV_WS_APP_ID),
  };
}

async function parseJsonSafe(response: Response): Promise<unknown> {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function getApiError(
  payload: unknown,
  response: Response,
): DerivApiError {
  const data = payload as ApiErrorPayload | null | undefined;

  const first = data?.errors?.[0];

  const code =
    first?.code ||
    data?.error ||
    `HTTP_${response.status}`;

  const message =
    first?.message ||
    data?.error_description ||
    data?.message ||
    response.statusText ||
    "Deriv API request failed.";

  return new DerivApiError(code, message, response.status);
}

async function request<T>(
  path: string,
  token: string,
  init: RequestInit = {},
): Promise<T> {
  requireBrowser();

  const accessToken = requireToken(token);

  let response: Response;

  try {
    response = await fetch(`${DERIV_API_BASE}${path}`, {
      ...init,
      headers: {
        ...buildHeaders(accessToken),
        ...(init.headers ?? {}),
      },
    });
  } catch (error) {
    throw new DerivApiError(
      "network_error",
      error instanceof Error
        ? error.message
        : "Unable to reach the Deriv API.",
    );
  }

  const payload = await parseJsonSafe(response);

  if (!response.ok) {
    throw getApiError(payload, response);
  }

  return payload as T;
}

/* -------------------------------------------------------------------------- */
/* Options Accounts                                                           */
/* -------------------------------------------------------------------------- */

interface AccountsResponse {
  data?:
    | OptionsAccount[]
    | OptionsAccount
    | {
        accounts?: OptionsAccount[];
      };
  accounts?: OptionsAccount[];
}

/**
 * Get all current Options accounts belonging to the OAuth session.
 *
 * This is the current replacement for the legacy multi-account balance call.
 */
export async function getOptionsAccounts(
  token: string,
): Promise<OptionsAccount[]> {
  const response = await request<AccountsResponse>(
    "/trading/v1/options/accounts",
    token,
    {
      method: "GET",
    },
  );

  const raw = response?.data;

  if (Array.isArray(raw)) {
    return raw;
  }

  if (raw && typeof raw === "object") {
    if (Array.isArray(raw.accounts)) {
      return raw.accounts;
    }

    if ("account_id" in raw) {
      return [raw as OptionsAccount];
    }
  }

  if (Array.isArray(response?.accounts)) {
    return response.accounts;
  }

  return [];
}

/**
 * Convert current Options accounts into the account shape
 * already used by the application.
 */
export async function getAccounts(
  token: string,
): Promise<DerivAccountInfo[]> {
  const accounts = await getOptionsAccounts(token);

  return accounts.map((account) => {
    const isDemo =
      account.account_type.toLowerCase() === "demo" ||
      account.account_id.toUpperCase().startsWith("DOT");

    return {
      loginid: account.account_id,
      currency: account.currency || "USD",
      is_virtual: isDemo,
      account_type: account.account_type,
      balance: Number(account.balance ?? 0),
      status: account.status,
      group: account.group,
    };
  });
}

/**
 * Return all current account balances.
 */
export async function getAllBalances(
  token: string,
): Promise<BalanceInfo[]> {
  const accounts = await getAccounts(token);

  return accounts.map((account) => ({
    loginid: account.loginid,
    currency: account.currency,
    balance: Number.isFinite(account.balance)
      ? Number(account.balance)
      : 0,
    is_virtual: account.is_virtual,
    account_type: account.account_type,
  }));
}

/**
 * Get one account balance.
 *
 * This intentionally uses the current Options REST API rather than
 * the removed legacy `account: "all"` parameter.
 */
export async function getBalance(
  token: string,
  loginid?: string,
): Promise<BalanceInfo> {
  const balances = await getAllBalances(token);

  const account = loginid
    ? balances.find((item) => item.loginid === loginid)
    : balances[0];

  if (!account) {
    throw new DerivApiError(
      "account_not_found",
      loginid
        ? `Account ${loginid} was not returned by Deriv.`
        : "No Deriv Options account was returned.",
    );
  }

  return account;
}

/* -------------------------------------------------------------------------- */
/* Demo Balance                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Reset an Options demo account to Deriv's default demo balance.
 *
 * Deriv currently resets eligible Options demo accounts to $10,000 USD.
 */
export async function resetDemoBalance(
  token: string,
  accountId: string,
): Promise<void> {
  if (!accountId) {
    throw new DerivApiError(
      "missing_account",
      "No demo account was selected.",
    );
  }

  const isDemo = accountId.toUpperCase().startsWith("DOT");

  if (!isDemo) {
    throw new DerivApiError(
      "not_demo_account",
      "The selected account is not a demo account.",
    );
  }

  await request<unknown>(
    `/trading/v1/options/accounts/${encodeURIComponent(
      accountId,
    )}/reset-demo-balance`,
    token,
    {
      method: "POST",
    },
  );
}

/**
 * Convenience helper:
 * reset the first available demo account.
 */
export async function resetFirstDemoBalance(
  token: string,
): Promise<BalanceInfo> {
  const accounts = await getAccounts(token);

  const demo = accounts.find((account) => account.is_virtual);

  if (!demo) {
    throw new DerivApiError(
      "demo_account_not_found",
      "No demo Options account was found.",
    );
  }

  await resetDemoBalance(token, demo.loginid);

  // Fetch the updated value from Deriv.
  return getBalance(token, demo.loginid);
}

/* -------------------------------------------------------------------------- */
/* Current Account                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Builds the profile shape expected by the existing application.
 *
 * The current Options account endpoint does not provide the old
 * authorize response fields such as email/fullname/country.
 */
export function accountToAuthorizeResult(
  account: DerivAccountInfo,
): AuthorizeResult {
  return {
    loginid: account.loginid,
    email: "",
    fullname: "",
    country: "",
    currency: account.currency,
    is_virtual: account.is_virtual ? 1 : 0,
    balance: account.balance ?? 0,
    account_list: [
      {
        loginid: account.loginid,
        currency: account.currency,
        is_virtual: account.is_virtual ? 1 : 0,
        account_type: account.account_type,
        balance: account.balance,
      },
    ],
  };
}

/* -------------------------------------------------------------------------- */
/* Current WebSocket URL                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Get the authenticated WebSocket URL for an account.
 *
 * The current Deriv API uses an OTP endpoint instead of sending the
 * OAuth token directly through the old WebSocket authorize flow.
 */
export async function getAccountWebSocketUrl(
  token: string,
  accountId: string,
): Promise<string> {
  interface OtpResponse {
    data?: {
      url?: string;
    };
  }

  const response = await request<OtpResponse>(
    `/trading/v1/options/accounts/${encodeURIComponent(accountId)}/otp`,
    token,
    {
      method: "POST",
    },
  );

  const url = response?.data?.url;

  if (!url) {
    throw new DerivApiError(
      "otp_url_missing",
      "Deriv did not return an authenticated WebSocket URL.",
    );
  }

  return url;
}

/* -------------------------------------------------------------------------- */
/* Cashier                                                                    */
/* -------------------------------------------------------------------------- */

function openExternal(url: string) {
  if (typeof window === "undefined") return;

  window.open(
    url,
    "_blank",
    "noopener,noreferrer",
  );
}

export async function deposit(): Promise<string> {
  openExternal(DERIV_DEPOSIT_URL);
  return DERIV_DEPOSIT_URL;
}

export async function withdraw(): Promise<string> {
  openExternal(DERIV_WITHDRAW_URL);
  return DERIV_WITHDRAW_URL;
}

/* -------------------------------------------------------------------------- */
/* Compatibility helpers                                                      */
/* -------------------------------------------------------------------------- */

export function formatMoney(
  amount: number | undefined,
  currency = "USD",
): string {
  const value =
    typeof amount === "number" && Number.isFinite(amount)
      ? amount
      : 0;

  return `${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency}`;
}
