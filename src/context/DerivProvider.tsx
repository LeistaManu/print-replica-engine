// Global Deriv session provider: owns the OAuth session, the WebSocket
// lifecycle, the account list, live balances and account switching.
// Consume it through `useDeriv()`.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import * as auth from "@/lib/deriv-auth";
import * as api from "@/lib/deriv-api";
import { derivSocket, DerivApiError } from "@/lib/deriv-socket";
import type { AuthorizeResult, BalanceInfo, DerivAccountInfo } from "@/lib/deriv-api";

const ACTIVE_KEY = "digittool.deriv.activeLoginid";
const BALANCE_POLL_MS = 12_000;

export interface AccountBalance {
  loginid: string;
  currency: string;
  balance: number;
  is_virtual: boolean;
}

export type DerivStatus = "signed-out" | "connecting" | "ready" | "error";

export interface DerivContextValue {
  isAuthenticated: boolean;
  isInitializing: boolean;
  isLoggedIn: boolean;
  status: DerivStatus;
  isLoading: boolean;
  loading: boolean;
  error: string | null;
  connection: "open" | "closed" | "connecting";
  user: AuthorizeResult | null;
  profile: AuthorizeResult | null;
  accounts: DerivAccountInfo[];
  balances: Record<string, AccountBalance>;
  activeAccount: DerivAccountInfo | null;
  currentAccount: DerivAccountInfo | null;
  balance: number;
  currency: string;
  loginid: string | null;
  isDemo: boolean;
  demoBalance: AccountBalance | null;
  realBalance: AccountBalance | null;
  login: (returnTo?: string) => void;
  logout: () => void;
  switchAccount: (loginid: string) => Promise<void>;
  refresh: () => Promise<void>;
  refreshBalance: () => Promise<void>;
  deposit: () => Promise<void>;
  withdraw: () => Promise<void>;
}

const DerivContext = createContext<DerivContextValue | null>(null);

function readActive(): string | null {
  try {
    return localStorage.getItem(ACTIVE_KEY);
  } catch {
    return null;
  }
}

function writeActive(loginid: string) {
  try {
    localStorage.setItem(ACTIVE_KEY, loginid);
  } catch {}
}

export function DerivProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [profile, setProfile] = useState<AuthorizeResult | null>(null);
  const [accounts, setAccounts] = useState<DerivAccountInfo[]>([]);
  const [balances, setBalances] = useState<Record<string, AccountBalance>>({});
  const [activeLoginid, setActiveLoginid] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connection, setConnection] = useState<"open" | "closed" | "connecting">("closed");

  const virtualMapRef = useRef<Map<string, boolean>>(new Map());
  const tokenRef = useRef<string | null>(null);
  const oauthSessionRef = useRef(false);

  // Restore session on mount. An expired access token may still contain a
  // usable refresh token, so complete that check before ending hydration.
  useEffect(() => {
    let cancelled = false;

    const sync = async () => {
      const session = auth.captureRedirectTokens() ?? auth.getSession();
      const restored = session ?? (await auth.refreshSession());
      if (!cancelled) setToken(restored?.access_token ?? null);
    };

    setActiveLoginid(readActive());
    void sync().finally(() => {
      if (!cancelled) setHydrated(true);
    });

    const handleSessionChange = () => void sync();
    const off = auth.subscribeSession(handleSessionChange);
    window.addEventListener("focus", handleSessionChange);

    return () => {
      cancelled = true;
      off();
      window.removeEventListener("focus", handleSessionChange);
    };
  }, []);

  useEffect(() => {
    tokenRef.current = token;
  }, [token]);

  useEffect(() => {
    const offStatus = derivSocket.onStatus(setConnection);
    return () => offStatus();
  }, []);

  const applyBalanceSnapshot = useCallback((b: BalanceInfo) => {
    const virtualMap = virtualMapRef.current;

    setBalances((prev) => {
      const next = { ...prev };

      if (b.accounts) {
        Object.entries(b.accounts).forEach(([loginid, info]) => {
          next[loginid] = {
            loginid,
            currency: info.currency,
            balance: info.balance,
            is_virtual:
              info.demo_account === 1 ||
              virtualMap.get(loginid) === true ||
              loginid.startsWith("VR"),
          };
        });
      }

      if (b.loginid) {
        next[b.loginid] = {
          loginid: b.loginid,
          currency: b.currency,
          balance: b.balance,
          is_virtual:
            virtualMap.get(b.loginid) ??
            next[b.loginid]?.is_virtual ??
            b.loginid.startsWith("VR"),
        };
      }

      return next;
    });
  }, []);

  const loadBalances = useCallback(async () => {
    if (oauthSessionRef.current && tokenRef.current) {
      const oauthAccounts = await api.getOAuthAccounts(tokenRef.current);
      oauthAccounts.forEach((account) => {
        applyBalanceSnapshot({
          loginid: account.loginid,
          currency: account.currency,
          balance: account.balance,
        });
      });
      return;
    }
    try {
      const snapshot = await api.getBalance("all");
      applyBalanceSnapshot(snapshot);
    } catch {
      const snapshot = await api.getBalance("current");
      applyBalanceSnapshot(snapshot);
    }
  }, [applyBalanceSnapshot]);

  // Authorize + subscribe
  useEffect(() => {
    if (!hydrated) return;

    if (!token) {
      setProfile(null);
      setAccounts([]);
      setBalances({});
      setLoading(false);
      return;
    }

    let cancelled = false;
    let unsubscribeBalance: (() => void) | undefined;

    const bootstrap = async () => {
      setLoading(true);
      setError(null);

      try {
        // OAuth2 bearer tokens use Deriv's current REST account endpoint.
        // They are not valid input for the legacy WebSocket `authorize`
        // message, which was the source of the validation error in the UI.
        try {
          const oauthAccounts = await api.getOAuthAccounts(token);
          if (cancelled) return;
          if (oauthAccounts.length === 0) throw new Error("No Deriv trading accounts were returned.");

          oauthSessionRef.current = true;
          const list: DerivAccountInfo[] = oauthAccounts.map((account) => ({
            loginid: account.loginid,
            currency: account.currency,
            is_virtual: account.is_virtual,
            account_type: account.account_type,
            landing_company_name: account.landing_company_name,
          }));
          virtualMapRef.current = new Map(list.map((account) => [account.loginid, account.is_virtual]));
          setAccounts(list);
          oauthAccounts.forEach((account) => {
            applyBalanceSnapshot({
              loginid: account.loginid,
              currency: account.currency,
              balance: account.balance,
            });
          });

          const stored = readActive();
          const preferredAccount =
            (stored && oauthAccounts.find((account) => account.loginid === stored)) ||
            oauthAccounts.find((account) => !account.is_virtual) ||
            oauthAccounts[0];
          if (!preferredAccount) throw new Error("No active Deriv account is available.");

          setActiveLoginid(preferredAccount.loginid);
          writeActive(preferredAccount.loginid);
          setProfile({
            loginid: preferredAccount.loginid,
            email: "",
            fullname: "",
            country: "",
            currency: preferredAccount.currency,
            is_virtual: preferredAccount.is_virtual ? 1 : 0,
            balance: preferredAccount.balance,
            landing_company_name: preferredAccount.landing_company_name,
            account_list: list.map((account) => ({
              loginid: account.loginid,
              currency: account.currency,
              is_virtual: account.is_virtual ? 1 : 0,
              account_type: account.account_type,
              landing_company_name: account.landing_company_name,
            })),
          });
          setError(null);
          return;
        } catch (oauthError) {
          // A classic token redirect is supported as a compatibility path.
          // Only fall through when classic account tokens actually exist.
          if (Object.keys(auth.getAccountTokens()).length === 0) throw oauthError;
          oauthSessionRef.current = false;
        }

        const authorized = await api.authorize(token);
        if (cancelled) return;

        setProfile(authorized);

        // `authorize` already includes the current account balance. Render it
        // immediately instead of leaving the UI blank while a second request
        // (which may not support account="all" for every token type) runs.
        applyBalanceSnapshot({
          loginid: authorized.loginid,
          currency: authorized.currency,
          balance: authorized.balance,
        });

        let list: DerivAccountInfo[] = (authorized.account_list ?? [
          {
            loginid: authorized.loginid,
            currency: authorized.currency,
            is_virtual: authorized.is_virtual,
          },
        ]).map((a) => ({
          loginid: a.loginid,
          currency: a.currency || authorized.currency,
          is_virtual: !!a.is_virtual,
          account_type: a.account_type,
          landing_company_name: a.landing_company_name,
        }));

        // Classic Deriv redirects return a separate token for every real/demo
        // account. Authorize each account token once so both balances are
        // available, then restore the preferred account below.
        const accountTokens = auth.getAccountTokens();
        const tokenEntries = Object.entries(accountTokens);
        if (tokenEntries.length > 0) {
          const discovered: DerivAccountInfo[] = [];
          for (const [expectedLoginid, accountToken] of tokenEntries) {
            try {
              const account = await api.authorize(accountToken);
              if (cancelled) return;
              const loginid = account.loginid || expectedLoginid;
              discovered.push({
                loginid,
                currency: account.currency,
                is_virtual: account.is_virtual === 1 || loginid.startsWith("VR"),
                account_type: account.account_list?.find((item) => item.loginid === loginid)?.account_type,
                landing_company_name: account.landing_company_name,
              });
              applyBalanceSnapshot({
                loginid,
                currency: account.currency,
                balance: account.balance,
              });
            } catch {
              // Keep the primary authorization usable when an individual
              // linked account is unavailable.
            }
          }
          if (discovered.length > 0) list = discovered;
        }

        setAccounts(list);
        virtualMapRef.current = new Map(list.map((a) => [a.loginid, a.is_virtual]));

        const stored = readActive();
        const preferred =
          (stored && list.find((a) => a.loginid === stored)?.loginid) ||
          list.find((a) => !a.is_virtual)?.loginid ||
          authorized.loginid;

        setActiveLoginid(preferred);
        writeActive(preferred);

        const preferredToken = accountTokens[preferred];
        if (preferredToken) {
          const preferredAccount = await api.authorize(preferredToken);
          if (cancelled) return;
          setProfile(preferredAccount);
          applyBalanceSnapshot({
            loginid: preferredAccount.loginid,
            currency: preferredAccount.currency,
            balance: preferredAccount.balance,
          });
        }

        unsubscribeBalance = api.subscribeBalance(applyBalanceSnapshot);
        await loadBalances().catch(() => undefined);

        if (!cancelled) setError(null);
      } catch (e) {
        if (cancelled) return;

        const message =
          e instanceof DerivApiError
            ? e.code === "timeout"
              ? "Unable to reach the Deriv API. Retrying…"
              : e.message
            : e instanceof Error
              ? e.message
              : "Unable to connect to the Deriv API.";

        setError(message);

        // Only token-specific API codes are allowed to destroy a persisted
        // login. Previously the broad /authoriz/ message match also cleared
        // valid sessions for app-id, permission and connection errors.
        const invalidTokenCodes = new Set([
          "InvalidToken",
          "InvalidTokenFormat",
          "TokenExpired",
          "AuthorizationRequired",
        ]);

        if (e instanceof DerivApiError && invalidTokenCodes.has(e.code)) {
          const refreshed = await auth.refreshSession();

          if (refreshed) {
            setToken(refreshed.access_token);
            setError(null);
            return;
          }

          auth.clearSession();
          setToken(null);
          setProfile(null);
          setAccounts([]);
          setBalances({});
          setActiveLoginid(null);
          setError("Your Deriv session expired. Please log in again.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void bootstrap();

    const offReauth = derivSocket.onReauthorize(() => {
      void loadBalances().catch(() => undefined);
    });

    const offAuthError = derivSocket.onAuthError((e) => {
      setError(e.message || "Authorization failed. Please log in again.");
    });

    const poll = setInterval(() => {
      if (!tokenRef.current) return;
      void loadBalances().catch(() => undefined);
    }, BALANCE_POLL_MS);

    return () => {
      cancelled = true;
      clearInterval(poll);
      offReauth();
      offAuthError();
      unsubscribeBalance?.();
    };
  }, [hydrated, token, applyBalanceSnapshot, loadBalances]);

  const refresh = useCallback(async () => {
    if (!token) return;

    try {
      await loadBalances();
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Balance unavailable right now.");
    }
  }, [token, loadBalances]);

  const switchAccount = useCallback(
    async (loginid: string) => {
      if (!token) return;

      setActiveLoginid(loginid);
      writeActive(loginid);
      setLoading(true);
      setError(null);

      try {
        if (oauthSessionRef.current) {
          const account = accounts.find((item) => item.loginid === loginid);
          const accountBalance = balances[loginid];
          if (account) {
            setProfile((current) => ({
              loginid,
              email: current?.email ?? "",
              fullname: current?.fullname ?? "",
              country: current?.country ?? "",
              currency: accountBalance?.currency ?? account.currency,
              is_virtual: account.is_virtual ? 1 : 0,
              balance: accountBalance?.balance ?? 0,
              landing_company_name: account.landing_company_name,
              account_list: current?.account_list,
            }));
          }
          await loadBalances();
          return;
        }
        const accountToken = auth.getTokenFor(loginid);

        // Classic multi-account redirects provide one token per login ID and
        // can be re-authorized here. A PKCE access token has no separate token
        // for each account; balance(all) already supplies those balances, so
        // switching the UI must not send an invalid authorize payload.
        if (accountToken) {
          const authorized = await api.switchAccount(accountToken, loginid);
          setProfile(authorized);
          setActiveLoginid(authorized.loginid);
          writeActive(authorized.loginid);
        }
      } finally {
        try {
          await loadBalances();
        } catch {}
        setLoading(false);
      }
    },
    [token, loadBalances, accounts, balances],
  );

  const doDeposit = useCallback(async () => {
    await api.deposit();
    setTimeout(() => void refresh(), 4000);
  }, [refresh]);

  const doWithdraw = useCallback(async () => {
    await api.withdraw();
    setTimeout(() => void refresh(), 4000);
  }, [refresh]);

  const handleLogout = useCallback(() => {
    void api.logout();
    setToken(null);
    setProfile(null);
    setAccounts([]);
    setBalances({});
    auth.logout("/");
  }, []);

  const currentAccount = useMemo(
    () => accounts.find((a) => a.loginid === activeLoginid) ?? null,
    [accounts, activeLoginid],
  );

  const activeBalance = activeLoginid ? balances[activeLoginid] : undefined;

  const demoBalance = useMemo(
    () => Object.values(balances).find((b) => b.is_virtual) ?? null,
    [balances],
  );

  const realBalance = useMemo(
    () => Object.values(balances).find((b) => !b.is_virtual) ?? null,
    [balances],
  );

  // A stored token is only a login candidate. The UI becomes authenticated
  // after Deriv has actually accepted it and returned an account profile.
  const isAuthenticated = profile !== null;

  const status: DerivStatus = !isAuthenticated
    ? "signed-out"
    : error && !activeBalance
      ? "error"
      : activeBalance
        ? "ready"
        : "connecting";

  const value: DerivContextValue = {
    isAuthenticated,
    isInitializing: !hydrated || (!!token && loading && !profile),
    isLoggedIn: isAuthenticated,
    status,
    isLoading: loading,
    loading,
    error,
    connection,
    user: profile,
    profile,
    accounts,
    balances,
    activeAccount: currentAccount,
    currentAccount,
    balance: activeBalance?.balance ?? profile?.balance ?? 0,
    currency: activeBalance?.currency ?? currentAccount?.currency ?? profile?.currency ?? "USD",
    loginid: activeLoginid,
    isDemo: currentAccount?.is_virtual ?? profile?.is_virtual === 1,
    demoBalance,
    realBalance,
    login: (returnTo) => void auth.login(returnTo),
    logout: handleLogout,
    switchAccount,
    refresh,
    refreshBalance: refresh,
    deposit: doDeposit,
    withdraw: doWithdraw,
  };

  return <DerivContext.Provider value={value}>{children}</DerivContext.Provider>;
}

export function useDeriv(): DerivContextValue {
  const ctx = useContext(DerivContext);
  if (!ctx) throw new Error("useDeriv() must be used inside <DerivProvider>.");
  return ctx;
}
