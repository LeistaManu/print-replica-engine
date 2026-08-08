// src/context/DerivProvider.tsx
//
// Global Deriv session provider.
//
// Current architecture:
// OAuth PKCE
//     ↓
// OAuth access token
//     ↓
// Current Deriv Options REST API
//     ↓
// Real + Demo accounts
//     ↓
// Individual balances
//
// No legacy token1/acct1 flow.
// No legacy balance { account: "all" }.
// No legacy WebSocket authorize flow for dashboard balances.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import * as auth from "@/lib/deriv-auth";
import * as api from "@/lib/deriv-api";

import type {
  AuthorizeResult,
  BalanceInfo,
  DerivAccountInfo,
} from "@/lib/deriv-api";

/* -------------------------------------------------------------------------- */
/* Constants                                                                  */
/* -------------------------------------------------------------------------- */

const ACTIVE_KEY = "digittool.deriv.activeLoginid";

const BALANCE_REFRESH_MS = 12_000;

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

export interface AccountBalance {
  loginid: string;
  currency: string;
  balance: number;
  is_virtual: boolean;
  account_type?: string;
}

export type DerivStatus =
  | "signed-out"
  | "connecting"
  | "ready"
  | "error";

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

  resetDemoBalance: () => Promise<void>;

  deposit: () => Promise<void>;
  withdraw: () => Promise<void>;
}

/* -------------------------------------------------------------------------- */
/* Context                                                                    */
/* -------------------------------------------------------------------------- */

const DerivContext =
  createContext<DerivContextValue | null>(null);

/* -------------------------------------------------------------------------- */
/* Active Account                                                             */
/* -------------------------------------------------------------------------- */

function readActive(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return localStorage.getItem(ACTIVE_KEY);
  } catch {
    return null;
  }
}

function writeActive(loginid: string) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.setItem(ACTIVE_KEY, loginid);
  } catch {
    // Ignore storage failures.
  }
}

/* -------------------------------------------------------------------------- */
/* Provider                                                                   */
/* -------------------------------------------------------------------------- */

export function DerivProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [token, setToken] =
    useState<string | null>(null);

  const [hydrated, setHydrated] =
    useState(false);

  const [profile, setProfile] =
    useState<AuthorizeResult | null>(null);

  const [accounts, setAccounts] =
    useState<DerivAccountInfo[]>([]);

  const [balances, setBalances] =
    useState<Record<string, AccountBalance>>({});

  const [activeLoginid, setActiveLoginid] =
    useState<string | null>(null);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [connection, setConnection] =
    useState<
      "open" | "closed" | "connecting"
    >("closed");

  /* ------------------------------------------------------------------------ */
  /* Restore PKCE OAuth Session                                               */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    let cancelled = false;

    const restore = async () => {
      try {
        const session =
          await auth.ensureValidSession();

        if (cancelled) {
          return;
        }

        setToken(
          session?.access_token ?? null,
        );
      } catch {
        if (!cancelled) {
          setToken(null);
        }
      }
    };

    setActiveLoginid(readActive());

    void restore().finally(() => {
      if (!cancelled) {
        setHydrated(true);
      }
    });

    const handleSessionChange = () => {
      void restore();
    };

    const unsubscribe =
      auth.subscribeSession(
        handleSessionChange,
      );

    window.addEventListener(
      "focus",
      handleSessionChange,
    );

    return () => {
      cancelled = true;

      unsubscribe();

      window.removeEventListener(
        "focus",
        handleSessionChange,
      );
    };
  }, []);

  /* ------------------------------------------------------------------------ */
  /* Convert API accounts into balance map                                    */
  /* ------------------------------------------------------------------------ */

  const applyBalances = useCallback(
    (items: BalanceInfo[]) => {
      setBalances((previous) => {
        const next: Record<
          string,
          AccountBalance
        > = {
          ...previous,
        };

        for (const item of items) {
          const isDemo =
            item.is_virtual === true ||
            item.loginid
              .toUpperCase()
              .startsWith("DOT");

          next[item.loginid] = {
            loginid: item.loginid,
            currency:
              item.currency || "USD",
            balance: Number(
              Number.isFinite(item.balance)
                ? item.balance
                : 0,
            ),
            is_virtual: isDemo,
            account_type:
              item.account_type,
          };
        }

        return next;
      });
    },
    [],
  );

  /* ------------------------------------------------------------------------ */
  /* Load Accounts + Balances                                                 */
  /* ------------------------------------------------------------------------ */

  const loadAccountsAndBalances =
    useCallback(async () => {
      if (!token) {
        return;
      }

      const [accountList, balanceList] =
        await Promise.all([
          api.getAccounts(token),
          api.getAllBalances(token),
        ]);

      setAccounts(accountList);

      applyBalances(balanceList);

      /*
       * Preserve the user's selected account if it still exists.
       *
       * Otherwise:
       * 1. Prefer real account.
       * 2. Fall back to demo account.
       * 3. Fall back to first account.
       */
      const stored = readActive();

      const storedAccount =
        stored
          ? accountList.find(
              (account) =>
                account.loginid === stored,
            )
          : undefined;

      const preferred =
        storedAccount ??
        accountList.find(
          (account) =>
            !account.is_virtual,
        ) ??
        accountList.find(
          (account) =>
            account.is_virtual,
        ) ??
        accountList[0] ??
        null;

      if (preferred) {
        setActiveLoginid(
          preferred.loginid,
        );

        writeActive(
          preferred.loginid,
        );

        const preferredBalance =
          balanceList.find(
            (balance) =>
              balance.loginid ===
              preferred.loginid,
          );

        setProfile(
          api.accountToAuthorizeResult({
            ...preferred,
            balance:
              preferredBalance?.balance ??
              preferred.balance ??
              0,
          }),
        );
      }
    }, [token, applyBalances]);

  /* ------------------------------------------------------------------------ */
  /* Initial API Loading                                                      */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    if (!token) {
      setAccounts([]);
      setBalances({});
      setProfile(null);
      setActiveLoginid(null);
      setLoading(false);
      setConnection("closed");
      setError(null);
      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setConnection("connecting");
      setError(null);

      try {
        await loadAccountsAndBalances();

        if (!cancelled) {
          setConnection("open");
          setError(null);
        }
      } catch (e) {
        if (cancelled) {
          return;
        }

        const message =
          e instanceof api.DerivApiError
            ? e.message
            : e instanceof Error
              ? e.message
              : "Unable to load your Deriv account.";

        setError(message);
        setConnection("closed");
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();

    const interval =
      window.setInterval(() => {
        if (!cancelled) {
          void loadAccountsAndBalances()
            .catch(() => {
              // Do not replace a valid displayed balance
              // with zero if a temporary request fails.
            });
        }
      }, BALANCE_REFRESH_MS);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [
    hydrated,
    token,
    loadAccountsAndBalances,
  ]);

  /* ------------------------------------------------------------------------ */
  /* Refresh                                                                  */
  /* ------------------------------------------------------------------------ */

  const refresh =
    useCallback(async () => {
      if (!token) {
        return;
      }

      setLoading(true);

      try {
        await loadAccountsAndBalances();

        setError(null);
        setConnection("open");
      } catch (e) {
        setError(
          e instanceof Error
            ? e.message
            : "Unable to refresh your balance.",
        );
      } finally {
        setLoading(false);
      }
    }, [
      token,
      loadAccountsAndBalances,
    ]);

  /* ------------------------------------------------------------------------ */
  /* Switch Account                                                           */
  /* ------------------------------------------------------------------------ */

  const switchAccount =
    useCallback(
      async (loginid: string) => {
        if (!token) {
          throw new api.DerivApiError(
            "missing_token",
            "Please log in again.",
          );
        }

        const account =
          accounts.find(
            (item) =>
              item.loginid === loginid,
          );

        if (!account) {
          throw new api.DerivApiError(
            "account_not_found",
            "That Deriv account could not be found.",
          );
        }

        setLoading(true);
        setError(null);

        try {
          /*
           * Current API does not use the old
           * authorize({ loginid }) switch.
           *
           * The selected account is simply selected locally
           * for dashboard purposes.
           *
           * When trading is performed, the current OTP endpoint
           * is used to create an account-scoped WebSocket.
           */
          setActiveLoginid(loginid);
          writeActive(loginid);

          const balance =
            await api.getBalance(
              token,
              loginid,
            );

          applyBalances([balance]);

          setProfile(
            api.accountToAuthorizeResult({
              ...account,
              balance: balance.balance,
            }),
          );

          setConnection("open");
        } catch (e) {
          setError(
            e instanceof Error
              ? e.message
              : "Unable to switch account.",
          );

          throw e;
        } finally {
          setLoading(false);
        }
      },
      [
        token,
        accounts,
        applyBalances,
      ],
    );

  /* ------------------------------------------------------------------------ */
  /* Reset Demo Balance                                                       */
  /* ------------------------------------------------------------------------ */

  const resetDemoBalance =
    useCallback(async () => {
      if (!token) {
        throw new api.DerivApiError(
          "missing_token",
          "Please log in again.",
        );
      }

      const demo =
        accounts.find(
          (account) =>
            account.is_virtual,
        );

      if (!demo) {
        throw new api.DerivApiError(
          "demo_account_not_found",
          "No demo account is available.",
        );
      }

      setLoading(true);
      setError(null);

      try {
        /*
         * Official Deriv operation.
         *
         * Eligible demo Options accounts are
         * reset to the default $10,000 USD.
         */
        await api.resetDemoBalance(
          token,
          demo.loginid,
        );

        /*
         * Give Deriv a short moment to make the
         * new balance available, then fetch it.
         */
        await new Promise((resolve) =>
          window.setTimeout(
            resolve,
            500,
          ),
        );

        const updated =
          await api.getBalance(
            token,
            demo.loginid,
          );

        applyBalances([updated]);

        setActiveLoginid(
          demo.loginid,
        );

        writeActive(
          demo.loginid,
        );

        setProfile(
          api.accountToAuthorizeResult({
            ...demo,
            balance:
              updated.balance,
          }),
        );

        setConnection("open");
      } catch (e) {
        const message =
          e instanceof Error
            ? e.message
            : "Unable to reset the demo balance.";

        setError(message);

        throw e;
      } finally {
        setLoading(false);
      }
    }, [
      token,
      accounts,
      applyBalances,
    ]);

  /* ------------------------------------------------------------------------ */
  /* Deposit / Withdraw                                                       */
  /* ------------------------------------------------------------------------ */

  const doDeposit =
    useCallback(async () => {
      await api.deposit();

      window.setTimeout(() => {
        void refresh();
      }, 4000);
    }, [refresh]);

  const doWithdraw =
    useCallback(async () => {
      await api.withdraw();

      window.setTimeout(() => {
        void refresh();
      }, 4000);
    }, [refresh]);

  /* ------------------------------------------------------------------------ */
  /* Login                                                                    */
  /* ------------------------------------------------------------------------ */

  const login =
    useCallback(
      (returnTo?: string) => {
        void auth.login(returnTo);
      },
      [],
    );

  /* ------------------------------------------------------------------------ */
  /* Logout                                                                   */
  /* ------------------------------------------------------------------------ */

  const logout =
    useCallback(() => {
      setToken(null);
      setProfile(null);
      setAccounts([]);
      setBalances({});
      setActiveLoginid(null);
      setError(null);
      setConnection("closed");

      auth.logout("/");
    }, []);

  /* ------------------------------------------------------------------------ */
  /* Current Account                                                          */
  /* ------------------------------------------------------------------------ */

  const currentAccount =
    useMemo(() => {
      if (!activeLoginid) {
        return null;
      }

      return (
        accounts.find(
          (account) =>
            account.loginid ===
            activeLoginid,
        ) ?? null
      );
    }, [
      accounts,
      activeLoginid,
    ]);

  const activeBalance =
    activeLoginid
      ? balances[activeLoginid] ??
        null
      : null;

  /* ------------------------------------------------------------------------ */
  /* Real / Demo                                                              */
  /* ------------------------------------------------------------------------ */

  const demoBalance =
    useMemo(
      () =>
        Object.values(
          balances,
        ).find(
          (balance) =>
            balance.is_virtual,
        ) ?? null,
      [balances],
    );

  const realBalance =
    useMemo(
      () =>
        Object.values(
          balances,
        ).find(
          (balance) =>
            !balance.is_virtual,
        ) ?? null,
      [balances],
    );

  /* ------------------------------------------------------------------------ */
  /* Authentication State                                                     */
  /* ------------------------------------------------------------------------ */

  const isAuthenticated =
    Boolean(token);

  const status: DerivStatus =
    !isAuthenticated
      ? "signed-out"
      : error && !activeBalance
        ? "error"
        : activeBalance
          ? "ready"
          : "connecting";

  /* ------------------------------------------------------------------------ */
  /* Context Value                                                            */
  /* ------------------------------------------------------------------------ */

  const value =
    useMemo<DerivContextValue>(
      () => ({
        isAuthenticated,
        isInitializing:
          !hydrated,
        isLoggedIn:
          isAuthenticated,

        status,

        isLoading: loading,
        loading,

        error,

        connection,

        user: profile,
        profile,

        accounts,

        balances,

        activeAccount:
          currentAccount,

        currentAccount,

        balance:
          activeBalance?.balance ??
          0,

        currency:
          activeBalance?.currency ??
          currentAccount?.currency ??
          "USD",

        loginid:
          activeLoginid,

        isDemo:
          currentAccount?.is_virtual ??
          false,

        demoBalance,
        realBalance,

        login,
        logout,

        switchAccount,

        refresh,
        refreshBalance:
          refresh,

        resetDemoBalance,

        deposit:
          doDeposit,

        withdraw:
          doWithdraw,
      }),
      [
        isAuthenticated,
        hydrated,
        status,
        loading,
        error,
        connection,
        profile,
        accounts,
        balances,
        currentAccount,
        activeBalance,
        activeLoginid,
        demoBalance,
        realBalance,
        login,
        logout,
        switchAccount,
        refresh,
        resetDemoBalance,
        doDeposit,
        doWithdraw,
      ],
    );

  return (
    <DerivContext.Provider
      value={value}
    >
      {children}
    </DerivContext.Provider>
  );
}

/* -------------------------------------------------------------------------- */
/* Hook                                                                       */
/* -------------------------------------------------------------------------- */

export function useDeriv(): DerivContextValue {
  const context =
    useContext(DerivContext);

  if (!context) {
    throw new Error(
      "useDeriv() must be used inside <DerivProvider>.",
    );
  }

  return context;
}
