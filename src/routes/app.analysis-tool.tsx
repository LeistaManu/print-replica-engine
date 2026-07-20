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
              <div
                className="pointer-events-none absolute bottom-0 z-20 w-12 -translate-x-1/2 transition-[left] duration-500 ease-out"
                style={{ left: `calc(${current * 10 + 5}% - ${current === 0 ? "0px" : current === 9 ? "0px" : "0px"})` }}
                aria-hidden="true"
              >
                <div className="mx-auto h-2 w-12 rounded-full bg-red-600 shadow-[0_0_14px_rgba(220,38,38,0.95)]" />
                <div className="mx-auto h-0 w-0 border-l-[8px] border-r-[8px] border-b-[10px] border-l-transparent border-r-transparent border-b-red-600" />
              </div>
              <div className="grid grid-cols-10 gap-2 md:gap-4">
              {dist.map((pct, d) => {
                const isCurrent = d === current;
                const isMax = d === ranked.mostIdx;
                const isMin = d === ranked.leastIdx;
                return (
                  <div key={d} className="flex flex-col items-center gap-2 relative">
                    <div className={`absolute -top-6 transition-opacity ${isCurrent ? "opacity-100" : "opacity-0"}`}>
                      <div className="text-purple-500 text-2xl leading-none">▼</div>
                    </div>
                    <div className={`w-16 h-16 rounded-full grid place-items-center font-black text-2xl transition-all duration-300 ${digitStyle(d)}`}>
                      {d}
                    </div>
                    <div className="text-[11px] font-semibold text-white/80">{pct.toFixed(1)}%</div>
                    <div className="h-4 text-[10px] text-center">
                      {isMax && <span className="text-emerald-400 font-semibold">most</span>}
                      {!isMax && isMin && <span className="text-red-400 font-semibold">least frequency</span>}
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
    const dominatePct = (Math.random() * 30 + 45).toFixed(2);
    const dominateType = strategy.includes("Even") ? (Math.random() > 0.5 ? "EVEN" : "ODD")
      : strategy.includes("Over") ? (Math.random() > 0.5 ? "OVER" : "UNDER")
      : strategy.includes("Rise") ? (Math.random() > 0.5 ? "RISE" : "FALL")
      : (Math.random() > 0.5 ? "MATCH" : "DIFFER");
    const digits = Array.from({ length: 3 }, () => Math.floor(Math.random() * 10));
    const marketCode = market.match(/\d+/)?.[0] ?? "10";
    const lines = [
      `Analysis Dashboard - ${strategy} on R_${marketCode}`,
      `Analysis Complete!`,
      `${dominateType} numbers dominate (${dominatePct}%)`,
      digits.join(", "),
      `Entry Point: Run your bot whenever a ${dominateType.toLowerCase()} signal appears after a sequence of 3 or more consecutive opposite signals.`,
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
