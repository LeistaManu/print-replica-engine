import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Play, Square, Info, Bot, TrendingUp, TrendingDown } from "lucide-react";

export const Route = createFileRoute("/app/analysis-tool")({
  head: () => ({ meta: [{ title: "Analysis Tool — Digittool" }] }),
  component: AnalysisTool,
});

const SUBTABS = ["Signals", "Analysis Tool", "DP Tools", "All Analysis", "Tick Analyser", "Xenon AI"];
const MARKETS = [
  "Volatility 10 (1s) Index",
  "Volatility 25 (1s) Index",
  "Volatility 50 (1s) Index",
  "Volatility 75 (1s) Index",
  "Volatility 100 (1s) Index",
  "Boom 500 Index",
  "Crash 500 Index",
];

function AnalysisTool() {
  const [sub, setSub] = useState("Analysis Tool");
  const [market, setMarket] = useState(MARKETS[0]);
  const [ticks, setTicks] = useState(1000);
  const [price, setPrice] = useState(9439.10);
  const [current, setCurrent] = useState(0);
  const [running, setRunning] = useState(false);
  const [history, setHistory] = useState<number[]>(() =>
    Array.from({ length: 1000 }, () => Math.floor(Math.random() * 10))
  );
  const [tradeMode, setTradeMode] = useState<"manual" | "bot">("manual");
  const [stake, setStake] = useState(1);
  const [journal, setJournal] = useState<{ t: string; msg: string; ok: boolean }[]>([]);

  // Live tick simulation — moves through each digit
  useEffect(() => {
    const id = setInterval(() => {
      setPrice((p) => +(p + (Math.random() - 0.5) * 2).toFixed(2));
      const next = Math.floor(Math.random() * 10);
      setCurrent(next);
      setHistory((h) => [...h.slice(1), next]);
    }, 900);
    return () => clearInterval(id);
  }, []);

  // Bot auto-trading
  useEffect(() => {
    if (!running || tradeMode !== "bot") return;
    const id = setInterval(() => {
      const win = Math.random() > 0.45;
      setJournal((j) => [
        { t: new Date().toLocaleTimeString(), msg: `Bot ${win ? "WON" : "LOST"} ${stake} USD on digit ${current}`, ok: win },
        ...j,
      ].slice(0, 30));
    }, 2500);
    return () => clearInterval(id);
  }, [running, tradeMode, stake, current]);

  const dist = useMemo(() => {
    const counts = new Array(10).fill(0);
    const window = history.slice(-ticks);
    window.forEach((d) => (counts[d] += 1));
    return counts.map((c) => (c / window.length) * 100);
  }, [history, ticks]);

  const maxIdx = dist.indexOf(Math.max(...dist));
  const minIdx = dist.indexOf(Math.min(...dist));

  const digitStyle = (d: number) => {
    if (d === current) return "bg-blue-500 text-white ring-4 ring-blue-300 scale-110";
    if (d === maxIdx) return "bg-emerald-500 text-white";
    if (d === minIdx) return "bg-red-500 text-white";
    // secondary highlight — 2nd most frequent gets orange
    const sorted = [...dist].map((v, i) => ({ v, i })).sort((a, b) => b.v - a.v);
    if (d === sorted[1].i) return "bg-orange-500 text-white";
    return "bg-white text-slate-800 border-2 border-slate-300";
  };

  const placeManualTrade = (kind: "even" | "odd" | "over" | "under" | "matches" | "differs") => {
    const win = Math.random() > 0.45;
    setJournal((j) => [
      { t: new Date().toLocaleTimeString(), msg: `Manual ${kind.toUpperCase()} ${stake} USD → ${win ? "WON" : "LOST"} (digit ${current})`, ok: win },
      ...j,
    ].slice(0, 30));
  };

  return (
    <div className="space-y-6">
      {/* Sub-tabs */}
      <div className="flex flex-wrap gap-2">
        {SUBTABS.map((t) => (
          <button
            key={t}
            onClick={() => setSub(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium border transition ${
              sub === t ? "bg-white text-slate-900 border-white" : "bg-white/5 text-white/80 border-white/10 hover:bg-white/10"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Action row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button className="px-5 py-2 rounded-full bg-gradient-to-r from-pink-500 to-orange-400 text-white font-semibold text-sm shadow-lg">Wide Eye</button>
          <button className="px-5 py-2 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold text-sm shadow-lg">Launch AI</button>
          <button className="w-8 h-8 grid place-items-center rounded-full bg-white/10 text-white/70"><Info className="w-4 h-4" /></button>
        </div>
        <button
          onClick={() => setRunning((r) => !r)}
          className={`px-5 py-2 rounded-lg font-bold text-sm inline-flex items-center gap-2 shadow-lg ${
            running ? "bg-red-500 hover:bg-red-400 text-white" : "bg-emerald-500 hover:bg-emerald-400 text-slate-900"
          }`}
        >
          {running ? <><Square className="w-4 h-4" /> Stop</> : <><Play className="w-4 h-4" /> Run</>}
          <span className={`ml-3 text-xs font-medium ${running ? "text-white/80" : "text-slate-900/70"}`}>
            {running ? "Bot is running" : "Bot is not running"}
          </span>
        </button>
      </div>

      {/* Market selector */}
      <div className="space-y-2">
        <div className="text-xs uppercase tracking-wider text-white/50">Select Market:</div>
        <select value={market} onChange={(e) => setMarket(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-cyan-400">
          {MARKETS.map((m) => <option key={m} value={m} className="bg-slate-900">{m}</option>)}
        </select>
      </div>

      {/* Live price */}
      <div className="rounded-xl bg-white/95 text-slate-900 p-6 flex items-center justify-between">
        <div className="text-4xl font-black tabular-nums">{price.toFixed(2)}</div>
        <div key={current} className="text-5xl font-black tabular-nums text-blue-600 animate-page-in">
          {current}
        </div>
      </div>

      {/* Ticks window */}
      <div className="grid md:grid-cols-3 gap-4 items-center">
        <div className="text-sm text-white/70">Ticks window:</div>
        <input type="number" min={50} max={5000} value={ticks} onChange={(e) => setTicks(Number(e.target.value))} className="bg-white text-slate-900 text-center font-semibold rounded-lg px-4 py-2 border border-white/10" />
        <div className="text-sm text-white/50 text-center md:text-right">(50–5000)</div>
      </div>

      {/* Distribution */}
      <div className="rounded-xl bg-white/5 border border-white/10 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Last {ticks} ticks digit distribution</h2>
          <div className="text-xs text-white/60">{ticks}/{ticks}</div>
        </div>
        <div className="grid grid-cols-5 md:grid-cols-10 gap-4">
          {dist.map((pct, d) => {
            const isCurrent = d === current;
            const isMax = d === maxIdx;
            const isMin = d === minIdx;
            return (
              <div key={d} className="flex flex-col items-center gap-2">
                <div className={`text-blue-400 text-xs transition-opacity ${isCurrent ? "opacity-100" : "opacity-0"}`}>▼</div>
                <div className={`relative w-16 h-16 rounded-full grid place-items-center font-black text-xl transition-all duration-300 ${digitStyle(d)}`}>
                  {d}
                  <span className="absolute -bottom-4 text-[10px] font-semibold text-white/70">{pct.toFixed(1)}%</span>
                </div>
                <div className="h-4 mt-3 text-[10px] text-center">
                  {isMax && <span className="text-emerald-400 font-semibold">most</span>}
                  {isMin && <span className="text-red-400 font-semibold">least</span>}
                  {isCurrent && !isMax && !isMin && <span className="text-blue-400 font-semibold">current</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Trading mode toggle */}
      <div className="rounded-xl bg-white/5 border border-white/10 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Trading</h2>
          <div className="inline-flex rounded-lg bg-white/5 p-1">
            <button onClick={() => setTradeMode("manual")} className={`px-4 py-1.5 rounded-md text-xs font-semibold ${tradeMode === "manual" ? "bg-cyan-500 text-slate-900" : "text-white/70"}`}>Manual Trading</button>
            <button onClick={() => setTradeMode("bot")} className={`px-4 py-1.5 rounded-md text-xs font-semibold ${tradeMode === "bot" ? "bg-cyan-500 text-slate-900" : "text-white/70"}`}>Trading Bots</button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-xs text-white/60">Stake (USD)</label>
          <input type="number" min={0.35} step={0.1} value={stake} onChange={(e) => setStake(Number(e.target.value))} className="bg-white text-slate-900 font-semibold rounded-lg px-3 py-1.5 w-28" />
        </div>

        {tradeMode === "manual" ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { k: "even", label: "Even", color: "bg-blue-500 hover:bg-blue-400", icon: TrendingUp },
              { k: "odd", label: "Odd", color: "bg-red-500 hover:bg-red-400", icon: TrendingDown },
              { k: "over", label: "Over 5", color: "bg-emerald-500 hover:bg-emerald-400", icon: TrendingUp },
              { k: "under", label: "Under 5", color: "bg-orange-500 hover:bg-orange-400", icon: TrendingDown },
              { k: "matches", label: `Matches ${current}`, color: "bg-purple-500 hover:bg-purple-400", icon: TrendingUp },
              { k: "differs", label: `Differs ${current}`, color: "bg-pink-500 hover:bg-pink-400", icon: TrendingDown },
            ].map((b) => {
              const Icon = b.icon;
              return (
                <button key={b.k} onClick={() => placeManualTrade(b.k as any)} className={`py-3 rounded-lg text-white font-bold text-sm inline-flex items-center justify-center gap-2 shadow-md ${b.color}`}>
                  <Icon className="w-4 h-4" /> {b.label}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-3">
            {[
              { name: "Even/Odd Bot", strat: "Bets on parity of last tick" },
              { name: "Over/Under Bot", strat: "Threshold on digit >5" },
              { name: "Matches Bot", strat: "Predicts exact digit" },
            ].map((bot) => (
              <div key={bot.name} className="p-4 rounded-lg bg-white/5 border border-white/10">
                <div className="font-semibold text-sm">{bot.name}</div>
                <div className="text-xs text-white/50 mt-1">{bot.strat}</div>
                <button onClick={() => setRunning(true)} className="mt-3 w-full py-2 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-semibold text-xs inline-flex items-center justify-center gap-1">
                  <Play className="w-3 h-3" /> Deploy
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Journal */}
        <div>
          <div className="text-xs uppercase tracking-wider text-white/50 mb-2">Journal</div>
          <div className="rounded-lg bg-black/30 border border-white/10 p-3 h-40 overflow-y-auto text-xs font-mono space-y-1">
            {journal.length === 0 && <div className="text-white/40">No trades yet.</div>}
            {journal.map((e, i) => (
              <div key={i} className={e.ok ? "text-emerald-400" : "text-red-400"}>
                <span className="text-white/40">[{e.t}]</span> {e.msg}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Floating AI bubble */}
      <button className="fixed bottom-24 right-6 z-40 group">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 grid place-items-center shadow-2xl animate-float">
          <Bot className="w-7 h-7 text-white" />
        </div>
        <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full animate-ping" />
        <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full" />
        <div className="absolute right-0 -top-6 text-[10px] font-bold text-white/80">AI</div>
      </button>

      <button className="px-4 py-2 rounded-lg bg-yellow-400 text-slate-900 font-bold text-xs">Risk Disclaimer</button>
    </div>
  );
}
