import { createFileRoute, Link } from "@tanstack/react-router";
import { TrendingUp, TrendingDown, DollarSign, Activity, Bot, Users, Wallet, Award } from "lucide-react";
import { useDeriv } from "@/context/DerivProvider";
import { formatMoney } from "@/lib/deriv-api";

export const Route = createFileRoute("/app/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Digittool" }] }),
  component: Dashboard,
});



const activity = [
  { time: "2m ago", pair: "EUR/USD", type: "BUY", amount: "$120.00", pnl: "+$14.20", up: true },
  { time: "18m ago", pair: "BTC/USD", type: "SELL", amount: "$500.00", pnl: "+$62.50", up: true },
  { time: "44m ago", pair: "Vol 75", type: "BUY", amount: "$80.00", pnl: "-$8.00", up: false },
  { time: "1h ago", pair: "GBP/JPY", type: "SELL", amount: "$210.00", pnl: "+$31.40", up: true },
  { time: "2h ago", pair: "XAU/USD", type: "BUY", amount: "$300.00", pnl: "+$45.00", up: true },
  { time: "3h ago", pair: "ETH/USD", type: "SELL", amount: "$150.00", pnl: "-$12.30", up: false },
];

function Dashboard() {
  const {
    isLoggedIn,
    loading,
    error,
    balance,
    currency,
    isDemo,
    loginid,
    demoBalance,
    realBalance,
    login,
    deposit,
  } = useDeriv();

  const kpis = [
    {
      label: isLoggedIn ? `${isDemo ? "Demo" : "Real"} Balance (${loginid ?? "—"})` : "Total Balance",
      value: isLoggedIn ? formatMoney(balance, currency) : "—",
      change: isLoggedIn ? (loading ? "syncing…" : "live") : "sign in to sync",
      up: true,
      icon: Wallet,
    },
    {
      label: "Real Account",
      value: realBalance ? formatMoney(realBalance.balance, realBalance.currency) : "—",
      change: realBalance ? realBalance.loginid : "not available",
      up: true,
      icon: DollarSign,
    },
    {
      label: "Demo Account",
      value: demoBalance ? formatMoney(demoBalance.balance, demoBalance.currency) : "—",
      change: demoBalance ? demoBalance.loginid : "not available",
      up: true,
      icon: Bot,
    },
    { label: "Win Rate", value: "68.4%", change: "-1.2%", up: false, icon: Activity },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Welcome back, Trader</h1>
          <p className="text-white/60 text-sm">Here's what's happening across your accounts today.</p>
        </div>
        <div className="flex gap-2">
          {isLoggedIn && (
            <button onClick={() => void deposit()} className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-sm">
              Deposit
            </button>
          )}

          <Link to="/app/portfolio" className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-sm">Portfolio</Link>
          <button className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-semibold text-sm">New Bot</button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <div key={k.label} className="p-5 rounded-xl bg-white/5 border border-white/10">
              <div className="flex items-center justify-between mb-3">
                <span className="text-white/60 text-sm">{k.label}</span>
                <Icon className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="text-2xl font-bold">{k.value}</div>
              <div className={`text-xs mt-1 flex items-center gap-1 ${k.up ? "text-emerald-400" : "text-red-400"}`}>
                {k.up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {k.change}
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 p-5 rounded-xl bg-white/5 border border-white/10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Portfolio Performance</h2>
            <div className="flex gap-1 text-xs">
              {["1D", "1W", "1M", "3M", "1Y"].map((t) => (
                <button key={t} className="px-2 py-1 rounded bg-white/5 hover:bg-white/10">{t}</button>
              ))}
            </div>
          </div>
          <svg viewBox="0 0 600 220" className="w-full h-56">
            <defs>
              <linearGradient id="g1" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor="#22d3ee" stopOpacity="0.4" />
                <stop offset="1" stopColor="#22d3ee" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d="M0,180 C50,160 90,120 140,130 C200,140 240,80 300,90 C360,100 400,60 460,50 C520,40 560,70 600,55 L600,220 L0,220 Z" fill="url(#g1)" />
            <path d="M0,180 C50,160 90,120 140,130 C200,140 240,80 300,90 C360,100 400,60 460,50 C520,40 560,70 600,55" fill="none" stroke="#22d3ee" strokeWidth="2" />
          </svg>
        </div>

        <div className="p-5 rounded-xl bg-white/5 border border-white/10">
          <h2 className="font-semibold mb-4 flex items-center gap-2"><Award className="w-4 h-4 text-yellow-400" /> Top Bots</h2>
          <ul className="space-y-3">
            {[
              { name: "Rise/Fall Pro", roi: "+24.3%" },
              { name: "Volatility 75 Sniper", roi: "+18.9%" },
              { name: "Even/Odd Master", roi: "+12.4%" },
              { name: "Matches/Differs", roi: "+9.7%" },
            ].map((b) => (
              <li key={b.name} className="flex items-center justify-between text-sm">
                <span>{b.name}</span>
                <span className="text-emerald-400 font-semibold">{b.roi}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="p-5 rounded-xl bg-white/5 border border-white/10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold flex items-center gap-2"><Users className="w-4 h-4 text-cyan-400" /> Recent Activity</h2>
          <button className="text-xs text-cyan-400 hover:underline">View all</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-white/50 text-xs uppercase">
              <tr>
                <th className="text-left py-2">Time</th>
                <th className="text-left">Pair</th>
                <th className="text-left">Type</th>
                <th className="text-right">Amount</th>
                <th className="text-right">P&L</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {activity.map((a, i) => (
                <tr key={i}>
                  <td className="py-3 text-white/60">{a.time}</td>
                  <td className="font-medium">{a.pair}</td>
                  <td>
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${a.type === "BUY" ? "bg-emerald-500/20 text-emerald-300" : "bg-red-500/20 text-red-300"}`}>{a.type}</span>
                  </td>
                  <td className="text-right">{a.amount}</td>
                  <td className={`text-right font-semibold ${a.up ? "text-emerald-400" : "text-red-400"}`}>{a.pnl}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
