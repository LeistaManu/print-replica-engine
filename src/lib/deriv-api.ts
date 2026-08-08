// src/lib/deriv-api.ts
//
// Digittol Deriv API service
//
// Current Deriv API architecture:
// - OAuth 2.0 access tokens
// - Current Options REST API for accounts/balances
// - OTP authentication for account WebSocket connections
// - WebSocket for portfolio/trading/history
// - No legacy token1/acct1 redirect flow
// - No legacy { account: "all" } balance request
//

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

const REQUEST_TIMEOUT_MS = 20_000;
const WS_TIMEOUT_MS = 20_000;

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
  sell_price?: number;
  sell_time?: number;
  is_expired?: boolean;
  status?: string;
}

export interface ClosedTrade {
  contract_id: number;
  contract_type: string;
  symbol?: string;
  buy_price: number;
  sell_price: number;
  payout: number;
  purchase_time: number;
  sell_time: number;
  longcode: string;
  profit: number;
  currency?: string;
  status?: string;
}

export interface TransactionRow {
  transaction_id: number;
  action_type: string;
  amount: number;
  balance_after: number;
  transaction_time: number;
  longcode?: string;
  payout?: number;
  currency?: string;
}

/* -------------------------------------------------------------------------- */
/* API Error                                                                  */
/* -------------------------------------------------------------------------- */

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

export class DerivApiError extends Error {
  code: string;
  status?: number;

  constructor(
    code: string,
    message: string,
    status?: number,
  ) {
    super(message);

    this.name = "DerivApiError";
    this.code = code;
    this.status = status;
  }
}

/* -------------------------------------------------------------------------- */
/* Browser / Token helpers                                                    */
/* -------------------------------------------------------------------------- */

function requireBrowser() {
  if (typeof window === "undefined") {
    throw new DerivApiError(
      "server_environment",
      "This Deriv API operation must run in the browser.",
    );
  }
}

function requireToken(
  token: string | null | undefined,
): string {
  if (!token) {
    throw new DerivApiError(
      "missing_token",
      "Your Deriv session is not authenticated.",
    );
  }

  return token;
}

/* -------------------------------------------------------------------------- */
/* HTTP Helpers                                                               */
/* -------------------------------------------------------------------------- */

function buildHeaders(token: string): HeadersInit {
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
    "Deriv-App-ID": String(DERIV_WS_APP_ID),
  };
}

async function parseJsonSafe(
  response: Response,
): Promise<unknown> {
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
  const data =
    payload as ApiErrorPayload | null | undefined;

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

  return new DerivApiError(
    code,
    message,
    response.status,
  );
}

async function request<T>(
  path: string,
  token: string,
  init: RequestInit = {},
): Promise<T> {
  requireBrowser();

  const accessToken = requireToken(token);

  const controller = new AbortController();

  const timeout = window.setTimeout(() => {
    controller.abort();
  }, REQUEST_TIMEOUT_MS);

  let response: Response;

  try {
    response = await fetch(
      `${DERIV_API_BASE}${path}`,
      {
        ...init,
        signal: controller.signal,
        headers: {
          ...buildHeaders(accessToken),
          ...(init.headers ?? {}),
        },
      },
    );
  } catch (error) {
    if (
      error instanceof DOMException &&
      error.name === "AbortError"
    ) {
      throw new DerivApiError(
        "timeout",
        "The Deriv API request timed out.",
      );
    }

    throw new DerivApiError(
      "network_error",
      error instanceof Error
        ? error.message
        : "Unable to reach the Deriv API.",
    );
  } finally {
    window.clearTimeout(timeout);
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
 * Get all current Options accounts.
 */
export async function getOptionsAccounts(
  token: string,
): Promise<OptionsAccount[]> {
  const response =
    await request<AccountsResponse>(
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

  if (
    raw &&
    typeof raw === "object"
  ) {
    if (
      Array.isArray(raw.accounts)
    ) {
      return raw.accounts;
    }

    if ("account_id" in raw) {
      return [
        raw as OptionsAccount,
      ];
    }
  }

  if (
    Array.isArray(response?.accounts)
  ) {
    return response.accounts;
  }

  return [];
}

/**
 * Convert Options accounts into the application account shape.
 */
export async function getAccounts(
  token: string,
): Promise<DerivAccountInfo[]> {
  const accounts =
    await getOptionsAccounts(token);

  return accounts.map((account) => {
    const accountType =
      String(account.account_type || "")
        .toLowerCase();

    const accountId =
      String(account.account_id || "")
        .toUpperCase();

    const isDemo =
      accountType === "demo" ||
      accountId.startsWith("DOT") ||
      accountId.startsWith("VR");

    return {
      loginid: account.account_id,
      currency:
        account.currency || "USD",
      is_virtual: isDemo,
      account_type:
        account.account_type,
      balance: Number(
        account.balance ?? 0,
      ),
      status: account.status,
      group: account.group,
    };
  });
}

/**
 * Return all account balances.
 */
export async function getAllBalances(
  token: string,
): Promise<BalanceInfo[]> {
  const accounts =
    await getAccounts(token);

  return accounts.map((account) => ({
    loginid: account.loginid,
    currency: account.currency,
    balance:
      Number.isFinite(account.balance)
        ? Number(account.balance)
        : 0,
    is_virtual:
      account.is_virtual,
    account_type:
      account.account_type,
  }));
}

/**
 * Get one account balance.
 */
export async function getBalance(
  token: string,
  loginid?: string,
): Promise<BalanceInfo> {
  const balances =
    await getAllBalances(token);

  const account = loginid
    ? balances.find(
        (item) =>
          item.loginid === loginid,
      )
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
 * Reset a Deriv Options demo account.
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

  const normalized =
    accountId.toUpperCase();

  const isDemo =
    normalized.startsWith("DOT") ||
    normalized.startsWith("VR");

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
 * Reset the first demo account and return its new balance.
 */
export async function resetFirstDemoBalance(
  token: string,
): Promise<BalanceInfo> {
  const accounts =
    await getAccounts(token);

  const demo =
    accounts.find(
      (account) =>
        account.is_virtual,
    );

  if (!demo) {
    throw new DerivApiError(
      "demo_account_not_found",
      "No demo Options account was found.",
    );
  }

  await resetDemoBalance(
    token,
    demo.loginid,
  );

  return getBalance(
    token,
    demo.loginid,
  );
}

/* -------------------------------------------------------------------------- */
/* Authorize compatibility                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Convert an account to the profile structure
 * expected by the application.
 */
export function accountToAuthorizeResult(
  account: DerivAccountInfo,
): AuthorizeResult {
  return {
    loginid:
      account.loginid,

    email: "",

    fullname: "",

    country: "",

    currency:
      account.currency,

    is_virtual:
      account.is_virtual
        ? 1
        : 0,

    balance:
      account.balance ?? 0,

    landing_company_name:
      account.landing_company_name,

    account_list: [
      {
        loginid:
          account.loginid,

        currency:
          account.currency,

        is_virtual:
          account.is_virtual
            ? 1
            : 0,

        account_type:
          account.account_type,

        balance:
          account.balance,
      },
    ],
  };
}

/* -------------------------------------------------------------------------- */
/* Account WebSocket OTP                                                      */
/* -------------------------------------------------------------------------- */

interface OtpResponse {
  data?: {
    url?: string;
    otp?: string;
  };
}

/**
 * Get the authenticated WebSocket URL for an account.
 *
 * Current Deriv API:
 *
 * POST
 * /trading/v1/options/accounts/{accountId}/otp
 *
 * The returned URL contains a short-lived OTP.
 */
export async function getAccountWebSocketUrl(
  token: string,
  accountId: string,
): Promise<string> {
  const response =
    await request<OtpResponse>(
      `/trading/v1/options/accounts/${encodeURIComponent(
        accountId,
      )}/otp`,
      token,
      {
        method: "POST",
      },
    );

  const url =
    response?.data?.url;

  if (!url) {
    throw new DerivApiError(
      "otp_url_missing",
      "Deriv did not return an authenticated WebSocket URL.",
    );
  }

  return url;
}

/* -------------------------------------------------------------------------- */
/* WebSocket Helpers                                                          */
/* -------------------------------------------------------------------------- */

interface DerivWsMessage {
  msg_type?: string;

  error?: {
    code?: string;
    message?: string;
  };

  [key: string]: unknown;
}

async function getAuthenticatedWebSocket(
  token: string,
): Promise<WebSocket> {
  requireBrowser();

  const accessToken =
    requireToken(token);

  /*
   * First retrieve the account list so that
   * we can select the currently usable account.
   */
  const accounts =
    await getAccounts(accessToken);

  if (!accounts.length) {
    throw new DerivApiError(
      "account_not_found",
      "No Deriv account is available.",
    );
  }

  /*
   * Prefer the real account, otherwise demo.
   */
  const account =
    accounts.find(
      (item) =>
        !item.is_virtual,
    ) ?? accounts[0];

  const url =
    await getAccountWebSocketUrl(
      accessToken,
      account.loginid,
    );

  return new Promise<WebSocket>(
    (resolve, reject) => {
      const ws =
        new WebSocket(url);

      let settled = false;

      const timeout =
        window.setTimeout(() => {
          if (settled) return;

          settled = true;

          try {
            ws.close();
          } catch {}

          reject(
            new DerivApiError(
              "timeout",
              "Deriv WebSocket connection timed out.",
            ),
          );
        }, WS_TIMEOUT_MS);

      ws.onopen = () => {
        if (settled) return;

        settled = true;

        window.clearTimeout(
          timeout,
        );

        resolve(ws);
      };

      ws.onerror = () => {
        if (settled) return;

        settled = true;

        window.clearTimeout(
          timeout,
        );

        reject(
          new DerivApiError(
            "websocket_error",
            "Unable to connect to the Deriv trading WebSocket.",
          ),
        );
      };

      ws.onclose = () => {
        if (settled) return;

        settled = true;

        window.clearTimeout(
          timeout,
        );

        reject(
          new DerivApiError(
            "websocket_closed",
            "The Deriv trading WebSocket closed before authentication completed.",
          ),
        );
      };
    },
  );
}

function sendWebSocketRequest(
  ws: WebSocket,
  payload: Record<string, unknown>,
): Promise<DerivWsMessage> {
  return new Promise(
    (resolve, reject) => {
      let finished = false;

      const timeout =
        window.setTimeout(() => {
          if (finished) return;

          finished = true;

          reject(
            new DerivApiError(
              "timeout",
              "Deriv WebSocket request timed out.",
            ),
          );
        }, WS_TIMEOUT_MS);

      const cleanup = () => {
        window.clearTimeout(
          timeout,
        );

        ws.removeEventListener(
          "message",
          onMessage,
        );

        ws.removeEventListener(
          "error",
          onError,
        );

        ws.removeEventListener(
          "close",
          onClose,
        );
      };

      const finish = (
        callback: () => void,
      ) => {
        if (finished) return;

        finished = true;

        cleanup();

        callback();
      };

      const onMessage = (
        event: MessageEvent,
      ) => {
        try {
          const data =
            typeof event.data ===
            "string"
              ? JSON.parse(
                  event.data,
                )
              : event.data;

          const message =
            data as DerivWsMessage;

          if (
            message.error
          ) {
            finish(() => {
              reject(
                new DerivApiError(
                  message.error
                    ?.code ||
                    "deriv_error",

                  message.error
                    ?.message ||
                    "Deriv WebSocket request failed.",
                ),
              );
            });

            return;
          }

          finish(() => {
            resolve(message);
          });
        } catch {
          // Ignore non-JSON messages.
        }
      };

      const onError = () => {
        finish(() => {
          reject(
            new DerivApiError(
              "websocket_error",
              "Deriv WebSocket communication failed.",
            ),
          );
        });
      };

      const onClose = () => {
        finish(() => {
          reject(
            new DerivApiError(
              "websocket_closed",
              "Deriv WebSocket closed unexpectedly.",
            ),
          );
        });
      };

      ws.addEventListener(
        "message",
        onMessage,
      );

      ws.addEventListener(
        "error",
        onError,
      );

      ws.addEventListener(
        "close",
        onClose,
      );

      try {
        ws.send(
          JSON.stringify(payload),
        );
      } catch (error) {
        finish(() => {
          reject(
            new DerivApiError(
              "websocket_send_error",
              error instanceof Error
                ? error.message
                : "Unable to send the Deriv WebSocket request.",
            ),
          );
        });
      }
    },
  );
}

/* -------------------------------------------------------------------------- */
/* Portfolio                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Get currently open trades.
 *
 * Uses the current authenticated Deriv WebSocket
 * `portfolio` request.
 */
export async function getOpenTrades(
  token: string,
): Promise<OpenTrade[]> {
  const ws =
    await getAuthenticatedWebSocket(
      token,
    );

  try {
    const response =
      await sendWebSocketRequest(
        ws,
        {
          portfolio: 1,
        },
      );

    const portfolio =
      response.portfolio as
        | {
            contracts?: unknown[];
          }
        | undefined;

    if (
      !portfolio ||
      !Array.isArray(
        portfolio.contracts,
      )
    ) {
      return [];
    }

    return portfolio.contracts.map(
      (raw) => {
        const contract =
          raw as Record<
            string,
            unknown
          >;

        return {
          contract_id:
            Number(
              contract.contract_id ??
                0,
            ),

          contract_type:
            String(
              contract.contract_type ??
                "",
            ),

          symbol:
            String(
              contract.underlying_symbol ??
                contract.symbol ??
                "",
            ),

          buy_price:
            Number(
              contract.buy_price ??
                contract.purchase_price ??
                0,
            ),

          payout:
            Number(
              contract.payout ??
                contract.bid_price ??
                0,
            ),

          purchase_time:
            Number(
              contract.purchase_time ??
                contract.date_start ??
                0,
            ),

          date_start:
            Number(
              contract.date_start ??
                contract.purchase_time ??
                0,
            ),

          longcode:
            String(
              contract.longcode ??
                "",
            ),

          currency:
            String(
              contract.currency ??
                "USD",
            ),

          profit:
            Number(
              contract.profit ??
                0,
            ),

          current_spot:
            Number(
              contract.current_spot ??
                0,
            ),

          indicative_price:
            Number(
              contract.indicative_price ??
                0,
            ),

          sell_price:
            Number(
              contract.sell_price ??
                0,
            ),

          sell_time:
            Number(
              contract.sell_time ??
                0,
            ),

          status:
            String(
              contract.status ??
                "open",
            ),
        };
      },
    );
  } finally {
    try {
      ws.close();
    } catch {}
  }
}

/* -------------------------------------------------------------------------- */
/* Closed Trades                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Get closed/historical trades.
 *
 * The current API exposes historical contract information
 * through the authenticated WebSocket history/profit endpoints.
 *
 * We request profit_table first. If no contracts are returned,
 * an empty array is returned rather than breaking the portfolio page.
 */
export async function getClosedTrades(
  token: string,
): Promise<ClosedTrade[]> {
  const ws =
    await getAuthenticatedWebSocket(
      token,
    );

  try {
    const response =
      await sendWebSocketRequest(
        ws,
        {
          profit_table: 1,
          description: 1,
          limit: 100,
        },
      );

    const profitTable =
      response.profit_table as
        | {
            transactions?: unknown[];
          }
        | undefined;

    const rows =
      Array.isArray(
        profitTable?.transactions,
      )
        ? profitTable.transactions
        : [];

    return rows.map(
      (raw) => {
        const contract =
          raw as Record<
            string,
            unknown
          >;

        const buyPrice =
          Number(
            contract.buy_price ??
              contract.buy_price_display ??
              0,
          );

        const sellPrice =
          Number(
            contract.sell_price ??
              contract.sell_price_display ??
              0,
          );

        const profitValue =
          contract.profit !==
          undefined
            ? Number(
                contract.profit,
              )
            : sellPrice -
              buyPrice;

        return {
          contract_id:
            Number(
              contract.contract_id ??
                0,
            ),

          contract_type:
            String(
              contract.contract_type ??
                "",
            ),

          symbol:
            String(
              contract.underlying_symbol ??
                contract.symbol ??
                "",
            ),

          buy_price:
            buyPrice,

          sell_price:
            sellPrice,

          payout:
            Number(
              contract.payout ??
                sellPrice ??
                0,
            ),

          purchase_time:
            Number(
              contract.purchase_time ??
                contract.date_start ??
                0,
            ),

          sell_time:
            Number(
              contract.sell_time ??
                contract.date_expiry ??
                contract.expiry_time ??
                0,
            ),

          longcode:
            String(
              contract.longcode ??
                "",
            ),

          profit:
            Number.isFinite(
              profitValue,
            )
              ? profitValue
              : 0,

          currency:
            contract.currency
              ? String(
                  contract.currency,
                )
              : undefined,

          status:
            String(
              contract.status ??
                "closed",
            ),
        };
      },
    );
  } finally {
    try {
      ws.close();
    } catch {}
  }
}

/* -------------------------------------------------------------------------- */
/* Transactions                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Get account transaction history.
 *
 * Uses the current WebSocket statement endpoint.
 */
export async function getTransactions(
  token: string,
): Promise<TransactionRow[]> {
  const ws =
    await getAuthenticatedWebSocket(
      token,
    );

  try {
    const response =
      await sendWebSocketRequest(
        ws,
        {
          statement: 1,
          description: 1,
          limit: 100,
        },
      );

    const statement =
      response.statement as
        | {
            transactions?: unknown[];
          }
        | undefined;

    const rows =
      Array.isArray(
        statement?.transactions,
      )
        ? statement.transactions
        : [];

    return rows.map(
      (raw) => {
        const transaction =
          raw as Record<
            string,
            unknown
          >;

        return {
          transaction_id:
            Number(
              transaction.transaction_id ??
                transaction.transaction_id_display ??
                0,
            ),

          action_type:
            String(
              transaction.action_type ??
                transaction.action ??
                transaction.type ??
                "",
            ),

          amount:
            Number(
              transaction.amount ??
                0,
            ),

          balance_after:
            Number(
              transaction.balance_after ??
                transaction.balance ??
                0,
            ),

          transaction_time:
            Number(
              transaction.transaction_time ??
                transaction.transaction_time_display ??
                0,
            ),

          longcode:
            transaction.longcode
              ? String(
                  transaction.longcode,
                )
              : undefined,

          payout:
            transaction.payout !==
            undefined
              ? Number(
                  transaction.payout,
                )
              : undefined,

          currency:
            transaction.currency
              ? String(
                  transaction.currency,
                )
              : undefined,
        };
      },
    );
  } finally {
    try {
      ws.close();
    } catch {}
  }
}

/* -------------------------------------------------------------------------- */
/* Cashier                                                                    */
/* -------------------------------------------------------------------------- */

function openExternal(
  url: string,
) {
  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  window.open(
    url,
    "_blank",
    "noopener,noreferrer",
  );
}

export async function deposit(): Promise<string> {
  openExternal(
    DERIV_DEPOSIT_URL,
  );

  return DERIV_DEPOSIT_URL;
}

export async function withdraw(): Promise<string> {
  openExternal(
    DERIV_WITHDRAW_URL,
  );

  return DERIV_WITHDRAW_URL;
}

/* -------------------------------------------------------------------------- */
/* Formatting                                                                 */
/* -------------------------------------------------------------------------- */

export function formatMoney(
  amount: number | undefined,
  currency = "USD",
): string {
  const value =
    typeof amount ===
      "number" &&
    Number.isFinite(amount)
      ? amount
      : 0;

  return `${value.toLocaleString(
    undefined,
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  )} ${currency}`;
}

/* -------------------------------------------------------------------------- */
/* Date formatting                                                            */
/* -------------------------------------------------------------------------- */

export function formatDate(
  timestamp:
    | number
    | string
    | undefined,
): string {
  if (
    timestamp ===
      undefined ||
    timestamp === null ||
    timestamp === ""
  ) {
    return "—";
  }

  const numeric =
    Number(timestamp);

  if (
    !Number.isFinite(
      numeric,
    )
  ) {
    return "—";
  }

  const milliseconds =
    numeric < 10_000_000_000
      ? numeric * 1000
      : numeric;

  const date =
    new Date(milliseconds);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "—";
  }

  return date.toLocaleString();
}

/* -------------------------------------------------------------------------- */
/* Profit formatting                                                          */
/* -------------------------------------------------------------------------- */

export function formatProfit(
  amount:
    | number
    | undefined,
  currency = "USD",
): string {
  const value =
    typeof amount ===
      "number" &&
    Number.isFinite(amount)
      ? amount
      : 0;

  const sign =
    value > 0
      ? "+"
      : "";

  return `${sign}${value.toLocaleString(
    undefined,
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  )} ${currency}`;
}
