import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Blocks, LineChart, Bot, Layers, Activity, FileBarChart, Calculator, Copy, TrendingUp, Phone, LogIn, UserPlus, FileText, Wallet, X, ArrowDownCircle, ArrowUpCircle, CandlestickChart, Briefcase } from "lucide-react";
import { useState } from "react";
import { DollarRain } from "@/components/DollarRain";
import { AccountSwitcher } from "@/components/AccountSwitcher";
import { handleLogin, handleSignup, SUPPORT_PHONE, SUPPORT_PHONE_DISPLAY } from "@/lib/deriv";
import { useDeriv } from "@/context/DerivProvider";
import { formatMoney } from "@/lib/deriv-api";

export const Route = createFileRoute("/app")({
  head: () => ({
    meta: [
      { title: "Digittool App — Trading Workspace" },
      { name: "description", content: "The Digittool trading workspace: bots, charts, analysis, reports, risk tools and copy trading." },
    ],
  }),
  component: AppLayout,
});

const nav = [
  { to: "/app/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/app/portfolio", label: "Portfolio", icon: Briefcase },
  { to: "/app/bot-builder", label: "Bot Builder", icon: Blocks },
  { to: "/app/charts", label: "Charts", icon: LineChart },
  { to: "/app/trading-bots", label: "Trading Bots", icon: Bot },
  { to: "/app/bulk-trader", label: "Bulk Trader", icon: Layers },
  { to: "/app/analysis-tool", label: "Analysis Tool", icon: Activity },
  { to: "/app/reports", label: "Reports", icon: FileBarChart },
  { to: "/app/risk-calculator", label: "Risk Calculator", icon: Calculator },
  { to: "/app/copy-trading", label: "Copy Trading", icon: Copy },
  { to: "/app/dtrader", label: "DTrader", icon: TrendingUp },
  { to: "/app/trading-view", label: "TradingView", icon: CandlestickChart },
];

function AppLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [showMarquee, setShowMarquee] = useState(true);
  const [showCashier, setShowCashier] = useState(false);
  const {
    isAuthenticated,
    isInitializing,

    status,
    balance: liveBalance,
    currency: liveCurrency,
    error,
    deposit,
    withdraw,
  } = useDeriv();
  const handleDeposit = () => void deposit();
  const handleWithdraw = () => void withdraw();
  const balance =
    status === "ready" ? formatMoney(liveBalance, liveCurrency) : "Loading balance…";

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white">
      <DollarRain />

      {/* Utility bar (Reports / Cashier / balance / deposit) */}
      <div className="bg-[#0f1424] border-b border-white/5">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between px-4 py-2 text-sm">
          <div className="flex items-center gap-4">
            <Link to="/app/reports" className="inline-flex items-center gap-1.5 text-white/80 hover:text-white">
              <FileText className="w-4 h-4" /> Reports
            </Link>
            <button onClick={() => setShowCashier(true)} className="inline-flex items-center gap-1.5 text-white/80 hover:text-white">
              <Wallet className="w-4 h-4" /> Cashier
            </button>
          </div>
          <div className="flex items-center gap-3">
            {isAuthenticated && (
              <>
                <button
                  onClick={handleDeposit}
                  className="px-4 py-1.5 rounded-full text-xs font-bold shadow-md bg-purple-500 hover:bg-purple-400 text-white"
                >
                  Deposit
                </button>
                <button
                  onClick={handleWithdraw}
                  className="px-4 py-1.5 rounded-full text-xs font-bold shadow-md bg-purple-300 hover:bg-purple-200 text-purple-900"
                >
                  Withdraw
                </button>
              </>
            )}
            <AccountSwitcher />
          </div>
        </div>
      </div>

      {isAuthenticated && error && (
        <div className="bg-red-500/15 border-b border-red-500/30 px-4 py-1.5 text-center text-xs text-red-200">
          {error}
        </div>
      )}

      {/* Marquee banner */}
      {showMarquee && (
        <div className="relative bg-gradient-to-r from-red-700 via-red-600 to-red-700 text-white text-xs md:text-sm font-semibold overflow-hidden whitespace-nowrap py-2">
          <div className="inline-block animate-[scroll_30s_linear_infinite] px-4">
            🔥 WELCOME TO DIGITTOOL — YOUR HUB FOR TRADING KNOWLEDGE, DERIV INDICES, AND MORE • AUTOMATED BOTS • REAL-TIME ANALYSIS • COPY TOP TRADERS • 24/7 SUPPORT • VIRTUAL ACCOUNT AVAILABLE •&nbsp;
            🔥 WELCOME TO DIGITTOOL — YOUR HUB FOR TRADING KNOWLEDGE, DERIV INDICES, AND MORE • AUTOMATED BOTS • REAL-TIME ANALYSIS • COPY TOP TRADERS • 24/7 SUPPORT • VIRTUAL ACCOUNT AVAILABLE •&nbsp;
          </div>
          <button onClick={() => setShowMarquee(false)} className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 grid place-items-center rounded-full bg-black/30 hover:bg-black/50">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Top bar */}
      <header className="border-b border-white/10 bg-[#0f1424]/80 backdrop-blur">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 grid place-items-center font-black">D</div>
            <span className="font-bold text-lg tracking-tight">Digittool</span>
          </Link>
          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-1 px-2 py-1 rounded bg-white/5 border border-white/10 text-xs">
              <span className="font-semibold text-yellow-400">KSH</span>
              <span className="text-white/40">/</span>
              <span className="font-semibold">USD</span>
            </div>
            <a href={`tel:${SUPPORT_PHONE}`} title={SUPPORT_PHONE_DISPLAY} className="w-9 h-9 grid place-items-center rounded-full bg-white/5 hover:bg-white/10 border border-white/10">
              <Phone className="w-4 h-4 text-cyan-400" />
            </a>
            {!isAuthenticated && (
              <>
                <a
                  href="#login"
                  onClick={handleLogin}
                  className="px-4 py-1.5 rounded-full border border-white/20 hover:bg-white/10 text-sm inline-flex items-center gap-1.5"
                >
                  <LogIn className="w-4 h-4" /> Log in
                </a>
                <a
                  href="#signup"
                  onClick={handleSignup}
                  className="px-4 py-1.5 rounded-full bg-pink-100 text-pink-900 hover:bg-white text-sm font-semibold inline-flex items-center gap-1.5"
                >
                  <UserPlus className="w-4 h-4" /> Sign up
                </a>
              </>
            )}
          </div>
        </div>

        {/* Nav tabs */}
        <nav className="max-w-[1600px] mx-auto px-2 overflow-x-auto">
          <ul className="flex items-center gap-1 min-w-max">
            {nav.map((n) => {
              const active = pathname === n.to;
              const Icon = n.icon;
              return (
                <li key={n.to}>
                  <Link
                    to={n.to}
                    className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                      active
                        ? "border-cyan-400 text-white bg-white/5"
                        : "border-transparent text-white/70 hover:text-white hover:border-white/20"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {n.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </header>

      <main className="max-w-[1600px] mx-auto p-4 md:p-6">
        <div key={pathname} className="animate-page-in">
          <Outlet />
        </div>
      </main>

      <footer className="border-t border-white/10 mt-10 py-6 text-center text-xs text-white/40">
        © {new Date().getFullYear()} Digittool. Trading involves risk. Past performance is not indicative of future results.
        <div className="mt-1">Support: <a href={`tel:${SUPPORT_PHONE}`} className="text-cyan-400 hover:underline">{SUPPORT_PHONE_DISPLAY}</a></div>
      </footer>

      {/* Cashier modal */}
      {showCashier && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm grid place-items-center p-4" onClick={() => setShowCashier(false)}>
          <div className="w-full max-w-md rounded-2xl bg-[#0f1424] border border-white/10 p-6 space-y-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold inline-flex items-center gap-2"><Wallet className="w-5 h-5" /> Cashier</h2>
              <button onClick={() => setShowCashier(false)} className="w-8 h-8 grid place-items-center rounded-full bg-white/5 hover:bg-white/10">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="rounded-lg bg-white/5 p-4 text-center">
              <div className="text-xs text-white/50">Available Balance</div>
              <div className="text-2xl font-black tabular-nums mt-1">{balance}</div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={handleDeposit} className="py-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold inline-flex items-center justify-center gap-2">
                <ArrowDownCircle className="w-4 h-4" /> Deposit
              </button>
              <button onClick={handleWithdraw} className="py-3 rounded-lg bg-red-500 hover:bg-red-400 text-white font-bold inline-flex items-center justify-center gap-2">
                <ArrowUpCircle className="w-4 h-4" /> Withdraw
              </button>
            </div>
            <p className="text-[11px] text-white/50 leading-relaxed">
              Deposits and withdrawals are processed securely through Deriv Cashier. You'll be redirected to complete the transaction.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
