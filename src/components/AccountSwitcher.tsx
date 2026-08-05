import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  ArrowDownCircle,
  ArrowUpCircle,
  LogOut,
  RefreshCw,
  Wifi,
  WifiOff,
  Loader2,
  TriangleAlert,
  User,
} from "lucide-react";
import { useDeriv } from "@/context/DerivProvider";
import { formatMoney } from "@/lib/deriv-api";

/** Deriv-style account switcher: demo + real accounts, cashier actions, logout. */
export function AccountSwitcher() {
  const {
    isAuthenticated,
    accounts,
    balances,
    activeAccount,
    balance,
    currency,
    loginid,
    isDemo,
    status,
    error,
    isLoading,
    connection,
    user,
    login,
    logout,
    switchAccount,
    refresh,
    deposit,
    withdraw,
  } = useDeriv();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // Signed out: the header already renders Log in / Sign up, so stay quiet
  // instead of adding a second login button.
  if (!isAuthenticated) return null;


  const demoAccounts = accounts.filter((a) => a.is_virtual);
  const realAccounts = accounts.filter((a) => !a.is_virtual);
  const initials = (user?.fullname || user?.email || loginid || "D").trim().charAt(0).toUpperCase();

  return (
    <div className="relative flex items-center gap-2" ref={ref}>
      <span className="hidden sm:grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-xs font-black">
        {initials || <User className="h-4 w-4" />}
      </span>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10"
      >
        <span
          className={`rounded px-1.5 py-0.5 text-[10px] font-black ${
            isDemo ? "bg-orange-400 text-slate-900" : "bg-emerald-400 text-slate-900"
          }`}
        >
          {isDemo ? "DEMO" : "REAL"}
        </span>
        {status === "ready" ? (
          <>
            <span className="text-white/50">{currency}</span>
            <span className="font-bold tabular-nums">{formatMoney(balance, "").trim()}</span>
          </>
        ) : status === "error" ? (
          <span className="inline-flex items-center gap-1 text-xs text-red-300">
            <TriangleAlert className="h-3.5 w-3.5" /> Balance unavailable
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs text-white/60">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading balance…
          </span>
        )}
        <ChevronDown className={`h-4 w-4 text-white/50 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-xl border border-white/10 bg-[#0f1424] shadow-2xl">
          <div className="border-b border-white/5 px-4 py-3">
            <div className="text-sm font-semibold">{user?.fullname || user?.email || "Deriv account"}</div>
            <div className="text-xs text-white/40">
              {loginid} {activeAccount?.landing_company_name ? `• ${activeAccount.landing_company_name}` : ""}
            </div>
          </div>

          <div className="flex items-center justify-between border-b border-white/5 px-4 py-2 text-xs text-white/50">
            <span className="inline-flex items-center gap-1.5">
              {connection === "open" ? (
                <Wifi className="h-3.5 w-3.5 text-emerald-400" />
              ) : (
                <WifiOff className="h-3.5 w-3.5 text-red-400" />
              )}
              {connection === "open" ? "Live" : connection === "connecting" ? "Connecting…" : "Reconnecting…"}
            </span>
            <button onClick={() => void refresh()} className="inline-flex items-center gap-1 hover:text-white">
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} /> Refresh
            </button>
          </div>

          {error && (
            <div className="border-b border-white/5 bg-red-500/10 px-4 py-2 text-xs text-red-200">
              {error}
            </div>
          )}

          {[
            { label: "Real", list: realAccounts },
            { label: "Demo", list: demoAccounts },
          ].map(({ label, list }) =>
            list.length ? (
              <div key={label} className="border-b border-white/5 py-2">
                <div className="px-4 pb-1 text-[11px] font-bold uppercase tracking-wide text-white/40">
                  {label}
                </div>
                {list.map((a) => {
                  const b = balances[a.loginid];
                  const active = activeAccount?.loginid === a.loginid;
                  return (
                    <button
                      key={a.loginid}
                      onClick={() => {
                        setOpen(false);
                        void switchAccount(a.loginid);
                      }}
                      className={`flex w-full items-center justify-between px-4 py-2 text-sm hover:bg-white/5 ${
                        active ? "bg-white/5" : ""
                      }`}
                    >
                      <span className="text-left">
                        <span className="block font-medium">{a.loginid}</span>
                        <span className="block text-xs text-white/40">
                          {a.currency}
                          {active ? " • current" : ""}
                        </span>
                      </span>
                      <span className="font-bold tabular-nums">
                        {b ? (
                          formatMoney(b.balance, b.currency ?? a.currency)
                        ) : (
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-white/40" />
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : null,
          )}

          <div className="grid grid-cols-2 gap-2 p-3">
            <button
              onClick={() => void deposit()}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-500 py-2 text-sm font-bold text-slate-900 hover:bg-emerald-400"
            >
              <ArrowDownCircle className="h-4 w-4" /> Deposit
            </button>
            <button
              onClick={() => void withdraw()}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-white/10 py-2 text-sm font-bold hover:bg-white/20"
            >
              <ArrowUpCircle className="h-4 w-4" /> Withdraw
            </button>
          </div>
          <button
            onClick={logout}
            className="flex w-full items-center gap-2 border-t border-white/5 px-4 py-3 text-sm text-red-300 hover:bg-red-500/10"
          >
            <LogOut className="h-4 w-4" /> Log out
          </button>
        </div>
      )}
    </div>
  );
}
