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
    const snapshot = await api.getBalance("all");
    applyBalanceSnapshot(snapshot);
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
        const authorized = await api.authorize(token);
        if (cancelled) return;

        setProfile(authorized);

        const list: DerivAccountInfo[] = (authorized.account_list ?? [
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

        setAccounts(list);
        virtualMapRef.current = new Map(list.map((a) => [a.loginid, a.is_virtual]));

        const stored = readActive();
        const preferred =
          (stored && list.find((a) => a.loginid === stored)?.loginid) ||
          list.find((a) => !a.is_virtual)?.loginid ||
          authorized.loginid;

        setActiveLoginid(preferred);
        writeActive(preferred);

        unsubscribeBalance = api.subscribeBalance(applyBalanceSnapshot);
        await loadBalances();

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
        const accountToken = auth.getTokenFor(loginid) ?? token;
        const authorized = await api.switchAccount(accountToken, loginid);

        setProfile(authorized);
        setActiveLoginid(authorized.loginid);
        writeActive(authorized.loginid);
      } finally {
        try {
          await loadBalances();
        } catch {}
        setLoading(false);
      }
    },
    [token, loadBalances],
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

  // Source of truth = persisted session OR current token
  const session = auth.getSession();

  const isAuthenticated =
    !!session?.access_token || !!token;

  const status: DerivStatus = !isAuthenticated
    ? "signed-out"
    : error && !activeBalance
      ? "error"
      : activeBalance
        ? "ready"
        : "connecting";

  const value: DerivContextValue = {
    isAuthenticated,
    isInitializing: !hydrated,
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
