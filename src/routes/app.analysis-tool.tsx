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
const STRATEGIES = ["Matches & Differs", "Even & Odd", "Over & Under", "Rise & Fall"];

const LOG_LINES = [
  "[INFO] Fetching market data...", "[OK] [INFO] Authenticating API key...",
  "[WARNING] High market volatility detected...", "[SUCCESS] Data stream established...",
  "[INFO] Data transmission complete...", "[INFO] Compiling results...",
  "[ERROR] Connection timeout. Retrying...", "[WARNING] Unstable connection detected...",
  "[SECURITY] Encryption enabled...", "[INFO] Predicting next digit...",
  "[INFO] Analysing Volatility Index...", "[INFO] Connecting to server...",
];

function AnalysisTool() {
  const [sub, setSub] = useState("Analysis Tool");
  const [market, setMarket] = useState(MARKETS[0]);
  const [ticks, setTicks] = useState(1000);
  const [price, setPrice] = useState(9469.92);
  const [current, setCurrent] = useState(2);
  const [running, setRunning] = useState(false);
  const [history, setHistory] = useState<number[]>(() =>
    Array.from({ length: 1000 }, () => Math.floor(Math.random() * 10))
  );
  const [tradeMode, setTradeMode] = useState<"manual" | "bot">("manual");
  const [stake, setStake] = useState(1);
  const [journal, setJournal] = useState<{ t: string; msg: string; ok: boolean }[]>([]);
  const [wideEyeOpen, setWideEyeOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);

  // Signals sub-tab state
  const [sigStrategy, setSigStrategy] = useState(STRATEGIES[0]);
  const [sigMarket, setSigMarket] = useState("Volatility 10 Index");
  const [latestTick, setLatestTick] = useState<string>("--");
  const [lastDigit, setLastDigit] = useState<string>("--");

  // Reset the digit history whenever the user picks a different market so the
  // colored circles visibly shift with volatility.
  useEffect(() => {
    setHistory(Array.from({ length: 1000 }, () => Math.floor(Math.random() * 10)));
  }, [market]);

  useEffect(() => {
    const id = setInterval(() => {
      setPrice((p) => {
        const np = +(p + (Math.random() - 0.5) * 2).toFixed(2);
        setLatestTick(np.toFixed(2));
        setLastDigit(String(Math.floor(np * 100) % 10));
        return np;
      });
      const next = Math.floor(Math.random() * 10);
      setCurrent(next);
      setHistory((h) => [...h.slice(1), next]);
    }, 900);
    return () => clearInterval(id);
  }, []);

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

  // Frequency ranking → 4-color palette (mirrors dollarprinter.com):
  //   green  = most frequent
  //   blue   = 2nd most frequent
  //   orange = 2nd least frequent
  //   red    = least frequent
  const ranked = useMemo(() => {
    const idx = dist.map((v, i) => ({ v, i })).sort((a, b) => b.v - a.v);
    return {
      mostIdx: idx[0].i,
      secondIdx: idx[1].i,
      secondLeastIdx: idx[idx.length - 2].i,
      leastIdx: idx[idx.length - 1].i,
    };
  }, [dist]);

  const digitStyle = (d: number) => {
    if (d === ranked.mostIdx) return "bg-emerald-500 text-white ring-2 ring-emerald-300";
    if (d === ranked.secondIdx) return "bg-blue-500 text-white ring-2 ring-blue-300";
    if (d === ranked.leastIdx) return "bg-red-500 text-white ring-2 ring-red-300";
    if (d === ranked.secondLeastIdx) return "bg-orange-500 text-white ring-2 ring-orange-300";
    return "bg-white text-slate-800 border-2 border-slate-300";
  };

  const placeManualTrade = (kind: string) => {
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

      {sub === "Signals" ? (
        <SignalAnalyzer
          strategy={sigStrategy} setStrategy={setSigStrategy}
          market={sigMarket} setMarket={setSigMarket}
          latestTick={latestTick} lastDigit={lastDigit}
        />
      ) : (
        <>
          {/* Action row */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button onClick={() => setWideEyeOpen(true)} className="px-5 py-2 rounded-full bg-gradient-to-r from-pink-500 to-orange-400 text-white font-semibold text-sm shadow-lg hover:brightness-110">Wide Eye</button>
              <button onClick={() => setAiOpen(true)} className="px-5 py-2 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold text-sm shadow-lg hover:brightness-110">Launch AI</button>
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

          <div className="space-y-2">
            <div className="text-xs uppercase tracking-wider text-white/50">Select Market:</div>
            <select value={market} onChange={(e) => setMarket(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-cyan-400">
              {MARKETS.map((m) => <option key={m} value={m} className="bg-slate-900">{m}</option>)}
            </select>
          </div>

          <div className="rounded-xl bg-white/95 text-slate-900 p-6 flex items-center justify-between">
            <div className="text-4xl font-black tabular-nums">{price.toFixed(2)}</div>
            <div key={current} className="text-5xl font-black tabular-nums text-blue-600 animate-page-in">
              {current}
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4 items-center">
            <div className="text-sm text-white/70">Ticks window:</div>
            <input type="number" min={50} max={5000} value={ticks} onChange={(e) => setTicks(Number(e.target.value))} className="bg-white text-slate-900 text-center font-semibold rounded-lg px-4 py-2 border border-white/10" />
            <div className="text-sm text-white/50 text-center md:text-right">(50–5000)</div>
          </div>

          <div className="rounded-xl bg-white/5 border border-white/10 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">Last {ticks} ticks digit distribution</h2>
              <div className="text-xs text-white/60">{ticks}/{ticks}</div>
            </div>
            <div className="relative pt-8 pb-7">
              <div className="grid grid-cols-5 gap-3 md:gap-4 justify-items-center">
              {dist.map((pct, d) => {
                const isCurrent = d === current;
                const isMax = d === ranked.mostIdx;
                const isMin = d === ranked.leastIdx;
                return (
                  <div key={d} className="flex flex-col items-center gap-1.5 relative pt-6">
                    <div className={`absolute top-0 transition-opacity ${isCurrent ? "opacity-100" : "opacity-0"}`}>
                      <div className="text-purple-500 text-2xl leading-none">▼</div>
                    </div>
                    <div className={`w-14 h-14 md:w-16 md:h-16 rounded-full grid place-items-center font-black text-xl md:text-2xl transition-all duration-300 ${digitStyle(d)}`}>
                      {d}
                    </div>
                    <div className="text-[11px] font-semibold text-white/80">{pct.toFixed(1)}%</div>
                    {isCurrent && (
                      <div className="flex flex-col items-center" aria-hidden="true">
                        <div className="h-0 w-0 border-l-[6px] border-r-[6px] border-b-[8px] border-l-transparent border-r-transparent border-b-red-600" />
                        <div className="h-1.5 w-10 rounded-full bg-red-600 shadow-[0_0_12px_rgba(220,38,38,0.9)]" />
                      </div>
                    )}
                    <div className="h-4 text-[10px] text-center">
                      {isMax && <span className="text-emerald-400 font-semibold">most</span>}
                      {!isMax && isMin && <span className="text-red-400 font-semibold">least</span>}
                    </div>
                  </div>
                );
              })}
              </div>
            </div>
          </div>

          {/* Trading mode */}
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
                    <button key={b.k} onClick={() => placeManualTrade(b.k)} className={`py-3 rounded-lg text-white font-bold text-sm inline-flex items-center justify-center gap-2 shadow-md ${b.color}`}>
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
        </>
      )}

      {/* Floating AI bubble */}
      <button onClick={() => setAiOpen(true)} className="fixed bottom-24 right-6 z-40 group">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 grid place-items-center shadow-2xl animate-float">
          <Bot className="w-7 h-7 text-white" />
        </div>
        <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full animate-ping" />
        <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full" />
        <div className="absolute right-0 -top-6 text-[10px] font-bold text-white/80">AI</div>
      </button>

      <button className="px-4 py-2 rounded-lg bg-yellow-400 text-slate-900 font-bold text-xs">Risk Disclaimer</button>

      {wideEyeOpen && (
        <WideEyeModal
          onClose={() => setWideEyeOpen(false)}
          market={market}
          dist={dist}
          history={history}
          current={current}
          ranked={ranked}
        />
      )}
      {aiOpen && (
        <LaunchAIModal
          onClose={() => setAiOpen(false)}
          market={market}
          dist={dist}
          ranked={ranked}
        />
      )}
    </div>
  );
}

/* -------- Wide Eye — full digit intelligence panel -------- */
function WideEyeModal({ onClose, market, dist, history, current, ranked }: {
  onClose: () => void; market: string; dist: number[]; history: number[]; current: number;
  ranked: { mostIdx: number; secondIdx: number; secondLeastIdx: number; leastIdx: number };
}) {
  const evens = dist.filter((_, i) => i % 2 === 0).reduce((a, b) => a + b, 0);
  const odds = 100 - evens;
  const over = dist.slice(6).reduce((a, b) => a + b, 0);
  const under = dist.slice(0, 5).reduce((a, b) => a + b, 0);
  const streak = (() => {
    let s = 1;
    for (let i = history.length - 2; i >= 0; i--) {
      if ((history[i] % 2) === (history[history.length - 1] % 2)) s++; else break;
    }
    return s;
  })();
  const rows = history.slice(-30).reverse();

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm grid place-items-center p-4" onClick={onClose}>
      <div className="w-full max-w-3xl rounded-2xl bg-[#0b1020] border border-pink-500/40 p-6 space-y-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-pink-400">Wide Eye · Deep Digit Intelligence</div>
            <h2 className="text-xl font-bold">{market}</h2>
          </div>
          <button onClick={onClose} className="w-9 h-9 grid place-items-center rounded bg-red-600 text-white font-bold">✕</button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30"><div className="text-[10px] text-emerald-300 uppercase">Most</div><div className="text-2xl font-black text-emerald-400">{ranked.mostIdx}</div><div className="text-[11px] text-white/60">{dist[ranked.mostIdx].toFixed(1)}%</div></div>
          <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30"><div className="text-[10px] text-blue-300 uppercase">2nd Most</div><div className="text-2xl font-black text-blue-400">{ranked.secondIdx}</div><div className="text-[11px] text-white/60">{dist[ranked.secondIdx].toFixed(1)}%</div></div>
          <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/30"><div className="text-[10px] text-orange-300 uppercase">2nd Least</div><div className="text-2xl font-black text-orange-400">{ranked.secondLeastIdx}</div><div className="text-[11px] text-white/60">{dist[ranked.secondLeastIdx].toFixed(1)}%</div></div>
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30"><div className="text-[10px] text-red-300 uppercase">Least</div><div className="text-2xl font-black text-red-400">{ranked.leastIdx}</div><div className="text-[11px] text-white/60">{dist[ranked.leastIdx].toFixed(1)}%</div></div>
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          <div className="p-4 rounded-lg bg-white/5 border border-white/10">
            <div className="text-xs uppercase text-white/50 mb-2">Even vs Odd</div>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-3 rounded-full bg-black/40 overflow-hidden flex">
                <div className="h-full bg-blue-500" style={{ width: `${evens}%` }} />
                <div className="h-full bg-red-500" style={{ width: `${odds}%` }} />
              </div>
            </div>
            <div className="flex justify-between text-xs mt-2"><span className="text-blue-300">Even {evens.toFixed(1)}%</span><span className="text-red-300">Odd {odds.toFixed(1)}%</span></div>
          </div>
          <div className="p-4 rounded-lg bg-white/5 border border-white/10">
            <div className="text-xs uppercase text-white/50 mb-2">Over 5 vs Under 5</div>
            <div className="flex-1 h-3 rounded-full bg-black/40 overflow-hidden flex">
              <div className="h-full bg-emerald-500" style={{ width: `${over}%` }} />
              <div className="h-full bg-orange-500" style={{ width: `${under}%` }} />
            </div>
            <div className="flex justify-between text-xs mt-2"><span className="text-emerald-300">Over {over.toFixed(1)}%</span><span className="text-orange-300">Under {under.toFixed(1)}%</span></div>
          </div>
        </div>

        <div className="p-4 rounded-lg bg-white/5 border border-white/10">
          <div className="text-xs uppercase text-white/50 mb-2">Full digit heatmap</div>
          <div className="grid grid-cols-10 gap-1.5">
            {dist.map((v, d) => {
              const intensity = Math.min(1, v / 15);
              return (
                <div key={d} className="text-center">
                  <div className="rounded-md py-2 font-black text-lg text-white" style={{ background: `rgba(34,197,94,${intensity})`, boxShadow: d === current ? "0 0 0 2px #a855f7" : undefined }}>{d}</div>
                  <div className="text-[10px] text-white/60 mt-1">{v.toFixed(1)}%</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="p-4 rounded-lg bg-white/5 border border-white/10">
          <div className="text-xs uppercase text-white/50 mb-2">Last 30 ticks · current parity streak: <span className="text-yellow-300 font-bold">{streak}</span></div>
          <div className="flex flex-wrap gap-1 font-mono text-xs">
            {rows.map((d, i) => (
              <span key={i} className={`w-6 h-6 grid place-items-center rounded ${d % 2 === 0 ? "bg-blue-500/20 text-blue-200" : "bg-red-500/20 text-red-200"}`}>{d}</span>
            ))}
          </div>
        </div>

        <div className="p-4 rounded-lg bg-gradient-to-br from-pink-500/10 to-orange-500/10 border border-pink-500/30 text-sm">
          <div className="font-bold text-pink-300 mb-1">Wide Eye recommendation</div>
          <div className="text-white/80">
            Digit <b className="text-emerald-400">{ranked.mostIdx}</b> dominates at {dist[ranked.mostIdx].toFixed(1)}% — favour <b>Matches {ranked.mostIdx}</b> and <b>Differs {ranked.leastIdx}</b>. Parity leans {evens > odds ? "EVEN" : "ODD"} ({Math.max(evens, odds).toFixed(1)}%); consider {over > under ? "Over 5" : "Under 5"} for barrier trades.
          </div>
        </div>
      </div>
    </div>
  );
}

/* -------- Launch AI — quick AI signal snapshot -------- */
function LaunchAIModal({ onClose, market, dist, ranked }: {
  onClose: () => void; market: string; dist: number[];
  ranked: { mostIdx: number; secondIdx: number; secondLeastIdx: number; leastIdx: number };
}) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setStep((s) => Math.min(s + 1, 4)), 700);
    return () => clearInterval(id);
  }, []);
  const steps = [
    "Connecting to Digittool AI engine…",
    "Streaming last 1000 ticks…",
    "Running Bayesian frequency model…",
    "Cross-checking parity + over/under drift…",
    "Analysis complete.",
  ];
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm grid place-items-center p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-[#050914] border border-cyan-400/60 p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center gap-2"><Bot className="w-5 h-5 text-cyan-400" /><h2 className="text-lg font-bold text-cyan-300">Digittool AI</h2></div>
          <button onClick={onClose} className="w-8 h-8 grid place-items-center rounded bg-red-600 text-white font-bold">✕</button>
        </div>
        <div className="text-xs text-white/60">{market}</div>
        <div className="font-mono text-emerald-400 text-sm space-y-1 min-h-[9rem]">
          {steps.slice(0, step + 1).map((s, i) => <div key={i}>[AI] {s}</div>)}
        </div>
        {step >= 4 && (
          <div className="p-4 rounded-lg bg-cyan-500/10 border border-cyan-500/40 text-sm space-y-1">
            <div><span className="text-white/60">Signal:</span> <b className="text-emerald-400">Matches {ranked.mostIdx}</b> · confidence {(dist[ranked.mostIdx] + 45).toFixed(0)}%</div>
            <div><span className="text-white/60">Backup:</span> <b className="text-red-400">Differs {ranked.leastIdx}</b></div>
            <div><span className="text-white/60">Avoid:</span> <b className="text-orange-300">Matches {ranked.secondLeastIdx}</b></div>
          </div>
        )}
      </div>
    </div>
  );
}

/* -------- Signal Analyzer (Signals sub-tab) -------- */
function SignalAnalyzer({
  strategy, setStrategy, market, setMarket, latestTick, lastDigit,
}: {
  strategy: string; setStrategy: (s: string) => void;
  market: string; setMarket: (m: string) => void;
  latestTick: string; lastDigit: string;
}) {
  const [analysis, setAnalysis] = useState<string[] | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);

  const logStream = useMemo(() => {
    const arr: string[] = [];
    for (let i = 0; i < 60; i++) arr.push(LOG_LINES[Math.floor(Math.random() * LOG_LINES.length)]);
    return arr.join(" ");
  }, [latestTick]);

  const SIG_MARKETS = ["Volatility 10 Index", "Volatility 25 Index", "Volatility 50 Index", "Volatility 75 Index", "Volatility 100 Index"];

  const runAnalysis = () => {
    // Build a realistic per-strategy analysis dashboard modeled on dollarprinter.com.
    const marketCode = market.match(/\d+/)?.[0] ?? "10";
    const sample = Array.from({ length: 500 }, () => Math.floor(Math.random() * 10));
    const counts = new Array(10).fill(0);
    sample.forEach((d) => (counts[d] += 1));
    const pct = counts.map((c) => (c / sample.length) * 100);
    const evens = pct.filter((_, i) => i % 2 === 0).reduce((a, b) => a + b, 0);
    const odds = 100 - evens;
    const over = pct.slice(6).reduce((a, b) => a + b, 0);
    const under = pct.slice(0, 5).reduce((a, b) => a + b, 0);
    const rises = 48 + Math.random() * 6;
    const falls = 100 - rises;
    const ordered = pct.map((v, i) => ({ v, i })).sort((a, b) => b.v - a.v);
    const most = ordered[0], least = ordered[9];

    let dominateType = "MATCH", dominatePct = "50.00", secondary = "";
    if (strategy.includes("Even")) {
      dominateType = evens > odds ? "EVEN" : "ODD";
      dominatePct = Math.max(evens, odds).toFixed(2);
      secondary = `Opposite side: ${(100 - Number(dominatePct)).toFixed(2)}%`;
    } else if (strategy.includes("Over")) {
      dominateType = over > under ? "OVER 5" : "UNDER 5";
      dominatePct = Math.max(over, under).toFixed(2);
      secondary = `Digit 5 neutral zone: ${pct[5].toFixed(2)}%`;
    } else if (strategy.includes("Rise")) {
      dominateType = rises > falls ? "RISE" : "FALL";
      dominatePct = Math.max(rises, falls).toFixed(2);
      secondary = `Opposite direction: ${(100 - Number(dominatePct)).toFixed(2)}%`;
    } else {
      dominateType = Math.random() > 0.5 ? "MATCH" : "DIFFER";
      dominatePct = (dominateType === "MATCH" ? most.v + 10 : 100 - least.v).toFixed(2);
      secondary = `Target digit: ${dominateType === "MATCH" ? most.i : least.i}`;
    }

    const topDigits = ordered.slice(0, 3).map((x) => `${x.i} (${x.v.toFixed(1)}%)`).join(", ");
    const coldDigits = ordered.slice(-3).map((x) => `${x.i} (${x.v.toFixed(1)}%)`).join(", ");
    const recommended = strategy.includes("Even") ? `Buy ${dominateType} after 3 opposite signals in a row`
      : strategy.includes("Over") ? `Trade ${dominateType} with fixed stake, martingale after 2 losses`
      : strategy.includes("Rise") ? `Enter ${dominateType} on the 3rd consecutive opposite candle`
      : `${dominateType} digit ${dominateType === "MATCH" ? most.i : least.i} with 1-3-2-6 progression`;

    const lines = [
      `╔══ Analysis Dashboard · ${strategy} on R_${marketCode} ══╗`,
      `[OK] Sample size: 500 ticks`,
      `[OK] Analysis Complete!`,
      ``,
      `► ${dominateType} numbers dominate (${dominatePct}%)`,
      `  ${secondary}`,
      ``,
      `► Hot digits: ${topDigits}`,
      `► Cold digits: ${coldDigits}`,
      `► Most frequent: ${most.i}  ·  Least frequent: ${least.i}`,
      ``,
      `► Even ${evens.toFixed(1)}% | Odd ${odds.toFixed(1)}%`,
      `► Over 5 ${over.toFixed(1)}% | Under 5 ${under.toFixed(1)}%`,
      ``,
      `► Recommended Entry Point:`,
      `  ${recommended}`,
      ``,
      `► Suggested stake: $1.00  ·  Target profit: $10  ·  Stop loss: -$5`,
    ];
    setAnalysis(lines);
    setCountdown(5);
  };

  useEffect(() => {
    if (countdown === null) return;
    if (countdown < 0) {
      setAnalysis((a) => a ? [...a, "Bot activated!"] : a);
      setCountdown(null);
      return;
    }
    const t = setTimeout(() => setCountdown((c) => (c === null ? null : c - 1)), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  return (
    <div className="relative rounded-xl overflow-hidden border border-cyan-500/40 min-h-[520px] bg-black">
      <div className="absolute inset-0 p-2 text-[11px] leading-relaxed font-mono text-cyan-400/40 select-none pointer-events-none whitespace-normal break-words">
        {logStream} {logStream}
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/50 to-black/70" />

      {analysis ? (
        <div className="relative z-10 max-w-3xl mx-auto my-10 p-6 rounded-xl bg-black/80 border border-cyan-500/60 shadow-2xl">
          <div className="flex items-center justify-between mb-3">
            <div className="flex gap-1.5">
              <span className="w-3 h-3 rounded-full bg-red-500" />
              <span className="w-3 h-3 rounded-full bg-yellow-500" />
              <span className="w-3 h-3 rounded-full bg-green-500" />
            </div>
            <button onClick={() => { setAnalysis(null); setCountdown(null); }} className="w-8 h-8 grid place-items-center rounded bg-red-600 text-white font-bold">X</button>
          </div>
          <div className="font-mono text-emerald-400 text-sm space-y-1.5 max-h-80 overflow-y-auto">
            {analysis.map((l, i) => <div key={i}>{l}</div>)}
            {countdown !== null && countdown >= 0 && (
              <div>Running bot in {countdown} seconds...</div>
            )}
          </div>
        </div>
      ) : (
        <div className="relative z-10 max-w-xl mx-auto my-10 p-6 rounded-xl bg-black/70 border border-cyan-500/50 shadow-2xl">
          <h2 className="text-center text-3xl font-black text-red-500 mb-6 tracking-wide">Signal Analyzer</h2>

          <div className="space-y-4">
            <div>
              <div className="text-center text-white text-sm mb-2">Select Strategy</div>
              <select value={strategy} onChange={(e) => setStrategy(e.target.value)}
                className="w-full bg-black border border-red-500/60 rounded-lg px-4 py-2.5 text-red-400 font-semibold text-center focus:outline-none">
                {STRATEGIES.map((s) => <option key={s} value={s} className="bg-black">{s}</option>)}
              </select>
            </div>

            <div>
              <div className="text-center text-white text-sm mb-2">Select Market</div>
              <select value={market} onChange={(e) => setMarket(e.target.value)}
                className="w-full bg-black border border-red-500/60 rounded-lg px-4 py-2.5 text-red-400 font-semibold text-center focus:outline-none">
                {SIG_MARKETS.map((m) => <option key={m} value={m} className="bg-black">{m}</option>)}
              </select>
            </div>

            <div className="pt-6 text-center space-y-3 font-mono">
              <div className="text-2xl font-bold text-emerald-400">Latest Tick: {latestTick}</div>
              <div className="text-2xl font-bold text-emerald-400">Last Digit: {lastDigit}</div>
            </div>

            <button onClick={runAnalysis} className="w-full mt-4 py-3 rounded-lg bg-gradient-to-r from-red-600 to-red-500 text-white font-bold shadow-lg hover:from-red-500 hover:to-red-400 transition">
              Analyze Signal
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
