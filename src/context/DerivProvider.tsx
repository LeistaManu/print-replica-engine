// React context that owns the Deriv session, account list, balances and
// real-time synchronization. Consume it through `useDeriv()`.

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
import { derivSocket } from "@/lib/deriv-socket";
import type { AuthorizeResult, BalanceInfo, DerivAccountInfo } from "@/lib/deriv-api";

const ACTIVE_KEY = "digittool.deriv.activeLoginid";

export interface AccountBalance {
  loginid: string;
  currency: string;
  balance: number;
  is_virtual: boolean;
}

export interface DerivContextValue {
  isLoggedIn: boolean;
  loading: boolean;
  error: string | null;
  connection: "open" | "closed" | "connecting";
  profile: AuthorizeResult | null;
  accounts: DerivAccountInfo[];
  balances: Record<string, AccountBalance>;
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
  deposit: () => Promise<void>;
  withdraw: () => Promise<void>;
}

const DerivContext = createContext<DerivContextValue | null>(null);

export function DerivProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [profile, setProfile] = useState<AuthorizeResult | null>(null);
  const [accounts, setAccounts] = useState<DerivAccountInfo[]>([]);
  const [balances, setBalances] = useState<Record<string, AccountBalance>>({});
  const [activeLoginid, setActiveLoginid] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connection, setConnection] = useState<"open" | "closed" | "connecting">("closed");
  const bootstrapped = useRef(false);

  /* -------- read the stored session on mount -------- */
  useEffect(() => {
    setToken(auth.getAccessToken());
    try {
      setActiveLoginid(localStorage.getItem(ACTIVE_KEY));
    } catch {
      /* noop */
    }
  }, []);

  useEffect(() => {
    const off = derivSocket.onStatus(setConnection);
    return () => {
      off();
    };
  }, []);

  const applyBalanceSnapshot = useCallback((b: BalanceInfo, virtualMap: Map<string, boolean>) => {
    setBalances((prev) => {
      const next = { ...prev };
      if (b.accounts) {
        Object.entries(b.accounts).forEach(([loginid, info]) => {
          next[loginid] = {
            loginid,
            currency: info.currency,
            balance: info.balance,
            is_virtual: info.demo_account === 1 || virtualMap.get(loginid) === true,
          };
        });
      }
      if (b.loginid) {
        next[b.loginid] = {
          loginid: b.loginid,
          currency: b.currency,
          balance: b.balance,
          is_virtual: virtualMap.get(b.loginid) ?? next[b.loginid]?.is_virtual ?? false,
        };
      }
      return next;
    });
  }, []);

  /* -------- authorize + subscribe once we have a token -------- */
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const stored = (() => {
          try {
            return localStorage.getItem(ACTIVE_KEY);
          } catch {
            return null;
          }
        })();

        let authorized = await api.authorize(token);
        if (stored && stored !== authorized.loginid) {
          try {
            authorized = await api.switchAccount(token, stored);
          } catch {
            /* stay on the default account */
          }
        }
        if (cancelled) return;

        setProfile(authorized);
        setActiveLoginid(authorized.loginid);
        const list: DerivAccountInfo[] = (authorized.account_list ?? [
          { loginid: authorized.loginid, currency: authorized.currency, is_virtual: authorized.is_virtual },
        ]).map((a) => ({
          loginid: a.loginid,
          currency: a.currency || authorized.currency,
          is_virtual: !!a.is_virtual,
          account_type: a.account_type,
          landing_company_name: a.landing_company_name,
        }));
        setAccounts(list);
        const virtualMap = new Map(list.map((a) => [a.loginid, a.is_virtual]));

        unsubscribe = api.subscribeBalance((b) => applyBalanceSnapshot(b, virtualMap));
        const snapshot = await api.getBalance("all").catch(() => null);
        if (snapshot && !cancelled) applyBalanceSnapshot(snapshot, virtualMap);
        bootstrapped.current = true;
      } catch (e) {
        if (cancelled) return;
        const message = e instanceof Error ? e.message : "Could not connect to Deriv.";
        setError(message);
        // Unauthorized / expired token: try a refresh, else drop the session.
        if (/token|authoriz|invalid/i.test(message)) {
          const refreshed = await auth.refreshSession();
          if (refreshed) setToken(refreshed.access_token);
          else auth.clearSession();
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [token, applyBalanceSnapshot]);

  const refresh = useCallback(async () => {
    if (!token) return;
    try {
      const virtualMap = new Map(accounts.map((a) => [a.loginid, a.is_virtual]));
      const b = await api.getBalance("all");
      applyBalanceSnapshot(b, virtualMap);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not refresh balances.");
    }
  }, [token, accounts, applyBalanceSnapshot]);

  const switchAccount = useCallback(
    async (loginid: string) => {
      if (!token) return;
      setLoading(true);
      setError(null);
      try {
        const authorized = await api.switchAccount(token, loginid);
        setProfile(authorized);
        setActiveLoginid(authorized.loginid);
        try {
          localStorage.setItem(ACTIVE_KEY, authorized.loginid);
        } catch {
          /* noop */
        }
        await refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not switch account.");
      } finally {
        setLoading(false);
      }
    },
    [token, refresh],
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

  const value: DerivContextValue = {
    isLoggedIn: !!token,
    loading,
    error,
    connection,
    profile,
    accounts,
    balances,
    currentAccount,
    balance: activeBalance?.balance ?? profile?.balance ?? 0,
    currency: activeBalance?.currency ?? profile?.currency ?? "USD",
    loginid: activeLoginid,
    isDemo: currentAccount?.is_virtual ?? profile?.is_virtual === 1,
    demoBalance,
    realBalance,
    login: (returnTo) => void auth.login(returnTo),
    logout: handleLogout,
    switchAccount,
    refresh,
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
