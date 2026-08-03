import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, RefreshCw, TrendingDown, TrendingUp } from "lucide-react";
import { useDeriv } from "@/context/DerivProvider";
import {
  formatMoney,
  getClosedTrades,
  getOpenTrades,
  getTransactions,
  type ClosedTrade,
  type OpenTrade,
  type TransactionRow,
} from "@/lib/deriv-api";

export const Route = createFileRoute("/app/portfolio")({
  head: () => ({
    meta: [
      { title: "Portfolio — Digittool" },
      { name: "description", content: "Open and closed positions, profit and loss, equity and margin for your Deriv accounts." },
      { property: "og:title", content: "Portfolio — Digittool" },
      { property: "og:description", content: "Open and closed positions, profit and loss, equity and margin for your Deriv accounts." },
    ],
  }),
  component: PortfolioPage,
});

function PortfolioPage() {
  const { isLoggedIn, login, balance, currency, loginid } = useDeriv();
  const [tab, setTab] = useState<"open" | "closed" | "transactions">("open");
  const [open, setOpen] = useState<OpenTrade[]>([]);
  const [closed, setClosed] = useState<ClosedTrade[]>([]);
  const [txns, setTxns] = useState<TransactionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!isLoggedIn) return;
    setLoading(true);
    setError(null);
    try {
      const [o, c, t] = await Promise.all([
        getOpenTrades().catch(() => []),
        getClosedTrades().catch(() => []),
        getTransactions().catch(() => []),
      ]);
      setOpen(o);
      setClosed(c);
      setTxns(t);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load portfolio data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, loginid]);

  if (!isLoggedIn) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-10 text-center">
        <h1 className="text-xl font-bold">Portfolio</h1>
        <p className="mt-2 text-sm text-white/60">Sign in with Deriv to see your positions and history.</p>
        <button
          onClick={() => login("/app/portfolio")}
          className="mt-5 rounded-lg bg-cyan-500 px-5 py-2 text-sm font-bold text-slate-900 hover:bg-cyan-400"
        >
          Log in with Deriv
        </button>
      </div>
    );
  }

  const openStake = open.reduce((s, c) => s + (c.buy_price ?? 0), 0);
  const openPnl = open.reduce((s, c) => s + (c.profit ?? 0), 0);
  const dayStart = Date.now() / 1000 - 86400;
  const dailyPnl = closed.filter((c) => c.sell_time > dayStart).reduce((s, c) => s + (c.profit ?? 0), 0);
  const equity = balance + openStake + openPnl;

  const stats = [
    { label: "Total Equity", value: formatMoney(equity, currency) },
    { label: "Available Funds", value: formatMoney(balance, currency) },
    { label: "Margin (in trades)", value: formatMoney(openStake, currency) },
    { label: "Free Margin", value: formatMoney(balance, currency) },
    { label: "Open P/L", value: formatMoney(openPnl, currency), tone: openPnl >= 0 },
    { label: "Daily P/L", value: formatMoney(dailyPnl, currency), tone: dailyPnl >= 0 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Portfolio</h1>
          <p className="text-sm text-white/60">Live positions, results and transactions for {loginid}.</p>
        </div>
        <button
          onClick={() => void load()}
          className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-white/10 bg-white/5 p-5">
            <div className="text-sm text-white/60">{s.label}</div>
            <div
              className={`mt-1 text-xl font-bold tabular-nums ${
                s.tone === undefined ? "" : s.tone ? "text-emerald-400" : "text-red-400"
              }`}
            >
              {s.value}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5">
        <div className="flex gap-1 border-b border-white/10 p-2">
          {(
            [
              ["open", `Open positions (${open.length})`],
              ["closed", `Closed positions (${closed.length})`],
              ["transactions", `Transactions (${txns.length})`],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`rounded-lg px-4 py-2 text-sm font-medium ${
                tab === key ? "bg-cyan-500 text-slate-900" : "text-white/70 hover:bg-white/10"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto p-4">
          {loading && (
            <div className="flex items-center gap-2 py-8 text-sm text-white/60">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          )}

          {!loading && tab === "open" && (
            <Table
              head={["Contract", "Market", "Stake", "Payout", "Indicative", "P/L"]}
              rows={open.map((c) => [
                c.contract_type,
                c.symbol,
                formatMoney(c.buy_price, c.currency ?? currency),
                formatMoney(c.payout, c.currency ?? currency),
                formatMoney(c.indicative_price ?? 0, c.currency ?? currency),
                <Pnl key={c.contract_id} value={c.profit ?? 0} currency={c.currency ?? currency} />,
              ])}
              empty="No open positions right now."
            />
          )}

          {!loading && tab === "closed" && (
            <Table
              head={["Closed", "Contract", "Buy", "Sell", "Payout", "P/L"]}
              rows={closed.map((c) => [
                new Date(c.sell_time * 1000).toLocaleString(),
                c.contract_type ?? c.longcode?.slice(0, 40),
                formatMoney(c.buy_price, currency),
                formatMoney(c.sell_price, currency),
                formatMoney(c.payout, currency),
                <Pnl key={c.contract_id} value={c.profit ?? 0} currency={currency} />,
              ])}
              empty="No closed positions yet."
            />
          )}

          {!loading && tab === "transactions" && (
            <Table
              head={["Date", "Action", "Amount", "Balance after", "Reference"]}
              rows={txns.map((t) => [
                new Date(t.transaction_time * 1000).toLocaleString(),
                <span key={t.transaction_id} className="capitalize">
                  {t.action_type}
                </span>,
                formatMoney(t.amount, currency),
                formatMoney(t.balance_after, currency),
                t.longcode ?? String(t.transaction_id),
              ])}
              empty="No transactions found."
            />
          )}
        </div>
      </div>
    </div>
  );
}

function Pnl({ value, currency }: { value: number; currency: string }) {
  const up = value >= 0;
  return (
    <span className={`inline-flex items-center gap-1 font-semibold ${up ? "text-emerald-400" : "text-red-400"}`}>
      {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {formatMoney(value, currency)}
    </span>
  );
}

function Table({
  head,
  rows,
  empty,
}: {
  head: string[];
  rows: React.ReactNode[][];
  empty: string;
}) {
  if (!rows.length) return <p className="py-8 text-sm text-white/50">{empty}</p>;
  return (
    <table className="w-full text-sm">
      <thead className="text-xs uppercase text-white/50">
        <tr>
          {head.map((h) => (
            <th key={h} className="py-2 text-left font-medium">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-white/5">
        {rows.map((r, i) => (
          <tr key={i}>
            {r.map((cell, j) => (
              <td key={j} className="py-3 pr-4 align-middle">
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
