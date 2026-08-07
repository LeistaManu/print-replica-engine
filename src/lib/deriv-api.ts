// Typed Deriv API service built on the shared WebSocket connection.
// Every function here is a thin, strongly-typed wrapper around a Deriv API call.

import { derivSocket, type DerivResponse } from "./deriv-socket";
import { DERIV_DEPOSIT_URL, DERIV_WITHDRAW_URL } from "./deriv-config";

export * from "./deriv-config";

/* ---------------------------- Types ---------------------------- */

export interface DerivAccountInfo {
  loginid: string;
  currency: string;
  is_virtual: boolean;
  account_type?: string;
  landing_company_name?: string;
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
  }>;
}

export interface BalanceInfo {
  loginid: string;
  currency: string;
  balance: number;
  total?: Record<string, { amount: number; currency: string }>;
  accounts?: Record<string, { balance: number; currency: string; type?: string; demo_account?: 0 | 1 }>;
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

/* ---------------------------- Auth ---------------------------- */

/** Authorize the WebSocket with an OAuth access token (or account token). */
export async function authorize(token: string): Promise<AuthorizeResult> {
  const res = await derivSocket.authorize(token) as DerivResponse<{ authorize: AuthorizeResult }>;
  return res.authorize;
}

/** List the accounts available to the authorized session. */
export async function getAccounts(token: string): Promise<DerivAccountInfo[]> {
  const auth = await authorize(token);
  const list = auth.account_list ?? [
    { loginid: auth.loginid, currency: auth.currency, is_virtual: auth.is_virtual },
  ];
  return list.map((a) => ({
    loginid: a.loginid,
    currency: a.currency || auth.currency,
    is_virtual: !!a.is_virtual,
    account_type: a.account_type,
    landing_company_name: a.landing_company_name,
  }));
}

/** Switch the authorized session to another account of the same user. */
export async function switchAccount(token: string, loginid: string): Promise<AuthorizeResult> {
  // An account token already identifies its login ID. `loginid` is not a
  // valid field on Deriv's authorize request and causes input validation to
  // fail, so it is intentionally used only as a caller-side account check.
  const authorized = await authorize(token);
  if (authorized.loginid !== loginid) {
    throw new Error(`Deriv authorized ${authorized.loginid} instead of ${loginid}.`);
  }
  return authorized;
}

export function logout(): Promise<DerivResponse> {
  const p = derivSocket.send({ logout: 1 }).catch(() => ({}) as DerivResponse);
  derivSocket.disconnect();
  return p;
}

/* ---------------------------- Balance ---------------------------- */

/** One-shot balance read for all accounts. */
export async function getBalance(account: "current" | "all" = "all"): Promise<BalanceInfo> {
  const res = await derivSocket.send<{ balance: BalanceInfo }>({ balance: 1, account });
  return res.balance;
}

/** Live balance subscription across every account. Returns unsubscribe. */
export function subscribeBalance(onUpdate: (b: BalanceInfo) => void): () => void {
  const off = derivSocket.subscribe("balance", (data) => {
    const balance = (data as DerivResponse<{ balance?: BalanceInfo }>).balance;
    if (balance) onUpdate(balance);
  });
  void derivSocket.send({ balance: 1, account: "all", subscribe: 1 }).catch(() => undefined);
  return off;
}

/* ---------------------------- Portfolio ---------------------------- */

export async function getPortfolio(): Promise<PortfolioContract[]> {
  const res = await derivSocket.send<{ portfolio: { contracts: PortfolioContract[] } }>({
    portfolio: 1,
  });
  return res.portfolio?.contracts ?? [];
}

/** Open positions enriched with indicative profit where available. */
export async function getOpenTrades(): Promise<OpenTrade[]> {
  const contracts = await getPortfolio();
  const enriched = await Promise.all(
    contracts.map(async (c) => {
      try {
        const res = await derivSocket.send<{
          proposal_open_contract: { profit?: number; current_spot?: number; bid_price?: number };
        }>({ proposal_open_contract: 1, contract_id: c.contract_id });
        const poc = res.proposal_open_contract;
        return { ...c, profit: poc?.profit, current_spot: poc?.current_spot, indicative_price: poc?.bid_price };
      } catch {
        return { ...c };
      }
    }),
  );
  return enriched;
}

export async function getClosedTrades(limit = 50): Promise<ClosedTrade[]> {
  const res = await derivSocket.send<{ profit_table: { transactions: ClosedTrade[] } }>({
    profit_table: 1,
    description: 1,
    limit,
    sort: "DESC",
  });
  return res.profit_table?.transactions ?? [];
}

export async function getTransactions(limit = 100): Promise<TransactionRow[]> {
  const res = await derivSocket.send<{ statement: { transactions: TransactionRow[] } }>({
    statement: 1,
    description: 1,
    limit,
  });
  return res.statement?.transactions ?? [];
}

/* ---------------------------- Cashier ---------------------------- */

function openExternal(url: string) {
  if (typeof window === "undefined") return;
  window.open(url, "_blank", "noopener,noreferrer");
}

/** Request the official Deriv deposit flow (cashier URL when permitted). */
export async function deposit(): Promise<string> {
  try {
    const res = await derivSocket.send<{ cashier: string | { deposit?: { address?: string } } }>({
      cashier: "deposit",
      provider: "doughflow",
    });
    const url = typeof res.cashier === "string" ? res.cashier : undefined;
    openExternal(url || DERIV_DEPOSIT_URL);
    return url || DERIV_DEPOSIT_URL;
  } catch {
    openExternal(DERIV_DEPOSIT_URL);
    return DERIV_DEPOSIT_URL;
  }
}

/** Request the official Deriv withdrawal flow. */
export async function withdraw(): Promise<string> {
  try {
    const res = await derivSocket.send<{ cashier: string }>({
      cashier: "withdraw",
      provider: "doughflow",
    });
    const url = typeof res.cashier === "string" ? res.cashier : undefined;
    openExternal(url || DERIV_WITHDRAW_URL);
    return url || DERIV_WITHDRAW_URL;
  } catch {
    openExternal(DERIV_WITHDRAW_URL);
    return DERIV_WITHDRAW_URL;
  }
}

/* ---------------------------- Formatting ---------------------------- */

export function formatMoney(amount: number | undefined, currency = "USD"): string {
  const value = Number.isFinite(amount) ? (amount as number) : 0;
  return `${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}
