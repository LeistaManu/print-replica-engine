import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Play, Pause, Square, Search, Download, Star, Zap, Bot as BotIcon,
  Sparkles, Filter, Trash2, ExternalLink, TrendingUp,
} from "lucide-react";
import { BOTS, CATEGORIES, LOAD_KEY, type CatalogBot, type BotCategory, type BotGroup } from "@/lib/bots-catalog";

type SubTab = BotGroup | "Calculator" | "Strategies";
const SUBTABS: SubTab[] = ["Free Bots", "Scalper Bots", "SpeedBots", "Calculator", "Strategies"];

export const Route = createFileRoute("/app/trading-bots")({
  head: () => ({ meta: [{ title: "Trading Bots — Digittool" }] }),
  component: TradingBots,
});

type RunningBot = {
  instanceId: string;
  bot: CatalogBot;
  status: "running" | "paused";
  trades: number;
  wins: number;
  pnl: number;
  startedAt: number;
};

const TAG_COLOR: Record<string, string> = {
  Hot: "bg-red-500/20 text-red-300 border-red-500/30",
  New: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
  Pro: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  Free: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
};

function TradingBots() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<BotCategory | "All">("All");
  const [running, setRunning] = useState<RunningBot[]>([]);
  const [selected, setSelected] = useState<CatalogBot | null>(null);
  const [subTab, setSubTab] = useState<SubTab>("Free Bots");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    // Group filter based on active sub-tab (Free Bots / Scalper Bots / SpeedBots)
    const inGroup = (b: CatalogBot) =>
      subTab === "Free Bots" ? (b.group === "Free Bots" || !b.group)
      : subTab === "Scalper Bots" ? b.group === "Scalper Bots"
      : subTab === "SpeedBots" ? b.group === "SpeedBots"
      : true;
    return BOTS.filter((b) =>
      inGroup(b) &&
      (category === "All" || b.category === category) &&
      (q === "" || b.name.toLowerCase().includes(q) || b.market.toLowerCase().includes(q) || b.description.toLowerCase().includes(q)),
    );
  }, [query, category, subTab]);

  // Live simulation for running bots
  useEffect(() => {
    if (running.length === 0) return;
    const t = setInterval(() => {
      setRunning((prev) =>
        prev.map((r) => {
          if (r.status !== "running") return r;
          const win = Math.random() < 0.62;
          const delta = win ? r.bot.stake * 0.95 : -r.bot.stake;
          return { ...r, trades: r.trades + 1, wins: r.wins + (win ? 1 : 0), pnl: r.pnl + delta };
        }),
      );
    }, 1400);
    return () => clearInterval(t);
  }, [running.length]);

  function deploy(bot: CatalogBot) {
    setRunning((prev) => [
      {
        instanceId: `${bot.id}-${Date.now()}`,
        bot,
        status: "running",
        trades: 0, wins: 0, pnl: 0,
        startedAt: Date.now(),
      },
      ...prev,
    ]);
  }

  function loadInBuilder(bot: CatalogBot) {
    try {
      localStorage.setItem(LOAD_KEY, JSON.stringify({
        name: bot.name, market: bot.market, stake: bot.stake,
        duration: bot.duration, strategy: bot.strategy, category: bot.category,
      }));
    } catch {}
    navigate({ to: "/app/bot-builder" });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BotIcon className="w-6 h-6 text-cyan-400" /> Trading Bots Store
          </h1>
          <p className="text-white/60 text-sm">Load Premium Bots · Deploy instantly · Automate every Deriv contract type.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search bots, markets…"
              className="pl-9 pr-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm w-64 focus:outline-none focus:border-cyan-400"
            />
          </div>
        </div>
      </div>

      {/* Sub-tabs (Free Bots / Scalper Bots / SpeedBots / Calculator / Strategies) */}
      <div className="flex flex-wrap gap-2">
        {SUBTABS.map((t) => (
          <button
            key={t}
            onClick={() => setSubTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold border transition inline-flex items-center gap-2 ${
              subTab === t ? "bg-blue-600 text-white border-blue-600" : "bg-white/5 text-white/80 border-white/10 hover:bg-white/10"
            }`}
          >
            {t === "SpeedBots" && <Zap className="w-3.5 h-3.5 text-yellow-400" />}
            {t === "Scalper Bots" && <Zap className="w-3.5 h-3.5 text-orange-400" />}
            {t}
          </button>
        ))}
      </div>


      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <span className="text-xs text-white/50 inline-flex items-center gap-1 shrink-0"><Filter className="w-3 h-3" /> Category:</span>
        {(["All", ...CATEGORIES] as const).map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c as BotCategory | "All")}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border transition ${
              category === c ? "bg-cyan-500 text-slate-900 border-cyan-500" : "bg-white/5 text-white/70 border-white/10 hover:bg-white/10"
            }`}
          >{c}</button>
        ))}
      </div>

      {/* Running bots */}
      {running.length > 0 && (
        <div className="p-5 rounded-xl bg-gradient-to-br from-emerald-500/10 to-cyan-500/5 border border-emerald-500/20">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold inline-flex items-center gap-2"><Zap className="w-4 h-4 text-emerald-400" /> Active Bots ({running.length})</h2>
            <button onClick={() => setRunning([])} className="text-xs text-white/60 hover:text-white inline-flex items-center gap-1"><Trash2 className="w-3 h-3" /> Stop all</button>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {running.map((r) => {
              const winrate = r.trades ? Math.round((r.wins / r.trades) * 100) : 0;
              return (
                <div key={r.instanceId} className="p-3 rounded-lg bg-black/30 border border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <div className="min-w-0">
                      <div className="font-semibold text-sm truncate">{r.bot.name}</div>
                      <div className="text-[11px] text-white/50 truncate">{r.bot.market}</div>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${r.status === "running" ? "bg-emerald-500/20 text-emerald-300" : "bg-yellow-500/20 text-yellow-300"}`}>{r.status}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1 text-center text-xs mb-2">
                    <div><div className="text-white/50 text-[10px]">Trades</div><div className="font-bold">{r.trades}</div></div>
                    <div><div className="text-white/50 text-[10px]">Win%</div><div className="font-bold">{winrate}%</div></div>
                    <div><div className="text-white/50 text-[10px]">P&L</div><div className={`font-bold tabular-nums ${r.pnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>${r.pnl.toFixed(2)}</div></div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setRunning((p) => p.map((x) => x.instanceId === r.instanceId ? { ...x, status: x.status === "running" ? "paused" : "running" } : x))}
                      className="flex-1 py-1.5 rounded bg-white/5 hover:bg-white/10 text-xs inline-flex items-center justify-center gap-1"
                    >
                      {r.status === "running" ? <><Pause className="w-3 h-3" /> Pause</> : <><Play className="w-3 h-3" /> Resume</>}
                    </button>
                    <button
                      onClick={() => setRunning((p) => p.filter((x) => x.instanceId !== r.instanceId))}
                      className="px-2 py-1.5 rounded bg-red-500/10 hover:bg-red-500/20 text-red-300 text-xs inline-flex items-center gap-1"
                    ><Square className="w-3 h-3" /> Stop</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Calculator view */}
      {subTab === "Calculator" && <BotCalculator />}

      {/* Strategies view */}
      {subTab === "Strategies" && <StrategiesView />}

      {/* Store grid */}
      {subTab !== "Calculator" && subTab !== "Strategies" && (
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((b) => (
          <div key={b.id} className={`p-5 rounded-xl border transition group ${b.premium ? "bg-white/95 text-slate-900 border-blue-500/40 hover:border-blue-500" : "bg-white/5 border-white/10 hover:border-cyan-400/40"}`}>
            {b.premium && (
              <div className="flex justify-end -mt-2 -mr-2 mb-2">
                <span className="px-3 py-1 rounded-bl-lg rounded-tr-lg bg-yellow-400 text-slate-900 text-[10px] font-black tracking-wider">PREMIUM</span>
              </div>
            )}
            <div className="flex items-start justify-between mb-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {b.premium && <span className="text-lg">🤖</span>}
                  <span className={`font-bold truncate ${b.premium ? "text-slate-900" : ""}`}>{b.name}</span>
                  {b.tag && <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${TAG_COLOR[b.tag]}`}>{b.tag}</span>}
                </div>
                {b.premium && (
                  <div className="text-yellow-500 text-sm mt-1">★★★★★</div>
                )}
                <div className={`text-xs mt-1 ${b.premium ? "text-slate-500" : "text-white/50"}`}>{b.category} · {b.market}</div>
              </div>
              <div className="text-right shrink-0 ml-2">
                <div className={`text-[10px] ${b.premium ? "text-slate-500" : "text-white/50"}`}>Win rate</div>
                <div className="font-bold text-emerald-500 text-sm">{b.winrate}</div>
              </div>
            </div>
            <p className={`text-xs mb-4 line-clamp-3 min-h-[3.5rem] ${b.premium ? "text-slate-600" : "text-white/70"}`}>{b.description}</p>
            <div className="grid grid-cols-3 gap-2 text-center mb-4 text-xs">
              <div className={`p-2 rounded ${b.premium ? "bg-slate-100" : "bg-black/30"}`}>
                <div className={`text-[10px] ${b.premium ? "text-slate-500" : "text-white/50"}`}>Stake</div>
                <div className="font-bold">${b.stake}</div>
              </div>
              <div className={`p-2 rounded ${b.premium ? "bg-slate-100" : "bg-black/30"}`}>
                <div className={`text-[10px] ${b.premium ? "text-slate-500" : "text-white/50"}`}>Duration</div>
                <div className="font-bold truncate">{b.duration}</div>
              </div>
              <div className={`p-2 rounded ${b.premium ? "bg-slate-100" : "bg-black/30"}`}>
                <div className={`text-[10px] ${b.premium ? "text-slate-500" : "text-white/50"}`}>Strategy</div>
                <div className="font-bold capitalize truncate">{b.strategy.replace("-", " ")}</div>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => loadInBuilder(b)}
                className={`flex-1 py-2.5 rounded font-bold text-xs inline-flex items-center justify-center gap-1 ${b.premium ? "bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white uppercase tracking-wider" : "bg-cyan-500 hover:bg-cyan-400 text-slate-900"}`}
              >
                <Download className="w-3 h-3" /> {b.premium ? "Load Premium Bot" : "Load Bot"}
              </button>
              <button
                onClick={() => deploy(b)}
                title="Deploy & run now"
                className="px-3 py-2 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-semibold text-xs inline-flex items-center gap-1"
              ><Play className="w-3 h-3" /> Run</button>
              <button
                onClick={() => setSelected(b)}
                title="Details"
                className={`w-9 grid place-items-center rounded ${b.premium ? "bg-slate-100 hover:bg-slate-200" : "bg-white/5 hover:bg-white/10"}`}
              ><ExternalLink className="w-3.5 h-3.5" /></button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full text-center py-12 text-white/50">No bots match your filters.</div>
        )}
      </div>
      )}


      {/* Details modal */}
      {selected && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm grid place-items-center p-4" onClick={() => setSelected(null)}>
          <div className="w-full max-w-lg rounded-2xl bg-[#0f1424] border border-white/10 p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs text-white/50">{selected.category}</div>
                <h2 className="text-lg font-bold">{selected.name}</h2>
              </div>
              {selected.premium && <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 text-xs font-bold inline-flex items-center gap-1"><Star className="w-3 h-3" /> Premium</span>}
            </div>
            <p className="text-sm text-white/70">{selected.description}</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="p-3 rounded bg-white/5"><div className="text-xs text-white/50">Market</div><div className="font-semibold">{selected.market}</div></div>
              <div className="p-3 rounded bg-white/5"><div className="text-xs text-white/50">Strategy</div><div className="font-semibold capitalize">{selected.strategy.replace("-", " ")}</div></div>
              <div className="p-3 rounded bg-white/5"><div className="text-xs text-white/50">Stake</div><div className="font-semibold">${selected.stake}</div></div>
              <div className="p-3 rounded bg-white/5"><div className="text-xs text-white/50">Duration</div><div className="font-semibold">{selected.duration}</div></div>
              <div className="p-3 rounded bg-white/5 col-span-2 inline-flex items-center justify-between">
                <span className="text-xs text-white/50">Historical win rate</span>
                <span className="font-bold text-emerald-400 inline-flex items-center gap-1"><TrendingUp className="w-3 h-3" /> {selected.winrate}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { loadInBuilder(selected); setSelected(null); }} className="flex-1 py-2.5 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-semibold text-sm inline-flex items-center justify-center gap-2">
                <Download className="w-4 h-4" /> Load in Bot Builder
              </button>
              <button onClick={() => { deploy(selected); setSelected(null); }} className="flex-1 py-2.5 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-semibold text-sm inline-flex items-center justify-center gap-2">
                <Play className="w-4 h-4" /> Deploy Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* -------- Calculator sub-tab -------- */
function BotCalculator() {
  const [stake, setStake] = useState(1);
  const [payout, setPayout] = useState(95);
  const [losses, setLosses] = useState(5);
  const [factor, setFactor] = useState(2);

  const rows = Array.from({ length: losses }, (_, i) => {
    const s = stake * Math.pow(factor, i);
    return { step: i + 1, stake: s, cum: Array.from({ length: i + 1 }, (_, k) => stake * Math.pow(factor, k)).reduce((a, b) => a + b, 0), payout: s * (payout / 100) };
  });

  return (
    <div className="rounded-xl bg-white/5 border border-white/10 p-6 space-y-5">
      <h2 className="text-lg font-bold inline-flex items-center gap-2"><Zap className="w-5 h-5 text-yellow-400" /> Bot Calculator</h2>
      <p className="text-sm text-white/60">Plan your stake progression, payout expectations and drawdown before deploying a bot.</p>
      <div className="grid md:grid-cols-4 gap-3">
        <label className="text-xs text-white/60">Base Stake (USD)
          <input type="number" min={0.35} step={0.1} value={stake} onChange={(e) => setStake(Number(e.target.value))} className="mt-1 w-full bg-white text-slate-900 font-semibold rounded-lg px-3 py-2" />
        </label>
        <label className="text-xs text-white/60">Payout %
          <input type="number" min={1} max={99} value={payout} onChange={(e) => setPayout(Number(e.target.value))} className="mt-1 w-full bg-white text-slate-900 font-semibold rounded-lg px-3 py-2" />
        </label>
        <label className="text-xs text-white/60">Consecutive Losses
          <input type="number" min={1} max={15} value={losses} onChange={(e) => setLosses(Number(e.target.value))} className="mt-1 w-full bg-white text-slate-900 font-semibold rounded-lg px-3 py-2" />
        </label>
        <label className="text-xs text-white/60">Martingale Factor
          <input type="number" min={1} step={0.1} value={factor} onChange={(e) => setFactor(Number(e.target.value))} className="mt-1 w-full bg-white text-slate-900 font-semibold rounded-lg px-3 py-2" />
        </label>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-white/60 text-xs uppercase text-left">
              <th className="py-2">Step</th><th>Stake</th><th>Cumulative Risk</th><th>Payout on Win</th><th>Net</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.step} className="border-t border-white/10">
                <td className="py-2">{r.step}</td>
                <td className="tabular-nums">${r.stake.toFixed(2)}</td>
                <td className="tabular-nums text-red-400">${r.cum.toFixed(2)}</td>
                <td className="tabular-nums text-emerald-400">${r.payout.toFixed(2)}</td>
                <td className={`tabular-nums font-semibold ${r.payout - r.cum >= 0 ? "text-emerald-400" : "text-red-400"}`}>${(r.payout - r.cum).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* -------- Strategies sub-tab -------- */
function StrategiesView() {
  const strategies = [
    { name: "Martingale", desc: "Double the stake after every loss. Recovers all losses on the next win. High risk during long losing streaks." },
    { name: "D'Alembert", desc: "Increase stake by one unit after a loss, decrease by one after a win. Smoother than Martingale." },
    { name: "Oscar's Grind", desc: "Aims to win one unit per cycle. Increases stake only after wins, resets after each cycle." },
    { name: "1-3-2-6", desc: "Positive progression across 4 wins: 1, 3, 2, 6 units. Locks profits and limits exposure." },
    { name: "Reverse Martingale", desc: "Double stake after each win. Rides winning streaks; resets on loss." },
    { name: "Anti-Martingale", desc: "Compounds winning streaks with capped stake growth." },
    { name: "Fibonacci", desc: "Follows the Fibonacci sequence after losses. Slower progression than Martingale." },
    { name: "Fixed Stake", desc: "Same stake every trade. Best for consistent edge and low variance." },
    { name: "LSS (Level Stake System)", desc: "Adjusts stake level based on session P&L, targeting steady equity growth." },
  ];
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
      {strategies.map((s) => (
        <div key={s.name} className="p-4 rounded-xl bg-white/5 border border-white/10">
          <div className="font-semibold mb-1 inline-flex items-center gap-2"><Star className="w-4 h-4 text-yellow-400" /> {s.name}</div>
          <div className="text-xs text-white/70">{s.desc}</div>
        </div>
      ))}
    </div>
  );
}
