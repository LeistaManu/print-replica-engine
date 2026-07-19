import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/app/bulk-trader")({
  head: () => ({ meta: [{ title: "Bulk Trader — Digittool" }] }),
  component: BulkTrader,
});

const MARKETS = [
  "Volatility 100 Index",
  "Volatility 75 Index",
  "Volatility 50 Index",
  "Volatility 25 Index",
  "Volatility 10 Index",
  "Boom 500 Index",
  "Crash 500 Index",
];
const TRADE_TYPES = ["Even/Odd", "Rise/Fall", "Over/Under", "Matches/Differs"];

function BulkTrader() {
  const [market, setMarket] = useState(MARKETS[0]);
  const [tradeType, setTradeType] = useState("Even/Odd");
  const [ticksCount, setTicksCount] = useState(1000);
  const [ticks, setTicks] = useState(1);
  const [stake, setStake] = useState(0.5);
  const [trades, setTrades] = useState(1);
  const [current, setCurrent] = useState(489.39);
  const [currentDigit, setCurrentDigit] = useState(5);
  const [dist, setDist] = useState<number[]>([10.8, 9.6, 8.6, 9.6, 9.3, 9.9, 11.4, 9.5, 10.3, 11.0]);
  const [history, setHistory] = useState<("E" | "O")[]>(["E", "O", "O", "O", "O", "O", "O", "O"]);
  const evenPct = 50.4;
  const oddPct = 49.6;

  useEffect(() => {
    const id = setInterval(() => {
      const next = +(current + (Math.random() - 0.5) * 3).toFixed(2);
      setCurrent(next);
      const nd = Math.floor(Math.random() * 10);
      setCurrentDigit(nd);
      setHistory((h) => [(nd % 2 === 0 ? "E" : "O") as "E" | "O", ...h].slice(0, 8));
      setDist((d) => d.map((v) => Math.max(6, Math.min(14, v + (Math.random() - 0.5) * 0.3))));
    }, 1300);
    return () => clearInterval(id);
  }, [current]);

  return (
    <div className="space-y-6">
      {/* Market + trade type */}
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-widest text-white/50 mb-2">Market</div>
          <select
            value={market}
            onChange={(e) => setMarket(e.target.value)}
            className="w-full bg-white text-slate-900 font-bold rounded-lg px-4 py-3 text-center"
          >
            {MARKETS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <div className="text-[11px] font-bold uppercase tracking-widest text-white/50 mb-2">Trade Type</div>
          <select
            value={tradeType}
            onChange={(e) => setTradeType(e.target.value)}
            className="w-full bg-white text-slate-900 font-bold rounded-lg px-4 py-3 text-center"
          >
            {TRADE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      {/* Number of ticks */}
      <div>
        <div className="text-[11px] font-bold uppercase tracking-widest text-white/50 mb-2">Number of Ticks</div>
        <input
          type="number"
          value={ticksCount}
          onChange={(e) => setTicksCount(Number(e.target.value))}
          className="w-full bg-white text-slate-900 font-bold rounded-lg px-4 py-3 text-center"
        />
      </div>

      {/* Current tick */}
      <div className="text-center space-y-1">
        <div className="text-[11px] font-bold uppercase tracking-widest text-white/50">Current Tick</div>
        <div className="text-5xl font-black text-blue-400 tabular-nums">{current.toFixed(2)}</div>
      </div>

      {/* Digit circles */}
      <div className="grid grid-cols-5 md:grid-cols-10 gap-3">
        {dist.map((pct, d) => (
          <div key={d} className="flex flex-col items-center">
            <div className="relative w-16 h-16 rounded-full border-4 border-slate-300 grid place-items-center bg-white text-slate-900">
              <div className="absolute inset-0 rounded-full" style={{
                background: `conic-gradient(#64748b ${pct * 3.6}deg, transparent 0)`,
                maskImage: "radial-gradient(circle, transparent 55%, black 56%)",
                WebkitMaskImage: "radial-gradient(circle, transparent 55%, black 56%)",
              }} />
              <div className="relative font-black text-lg">{d}</div>
            </div>
            <div className="text-xs font-semibold mt-1 text-white/80">{pct.toFixed(2)}%</div>
          </div>
        ))}
      </div>

      {/* History strip */}
      <div className="flex justify-center gap-1.5">
        {history.map((h, i) => (
          <div
            key={i}
            className={`w-8 h-8 rounded grid place-items-center font-black text-white text-sm ${
              h === "E" ? "bg-teal-500" : "bg-red-500"
            }`}
          >
            {h}
          </div>
        ))}
      </div>

      {/* Inputs */}
      <div className="grid md:grid-cols-3 gap-4">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-widest text-white/50 mb-2">Ticks</div>
          <input type="number" value={ticks} onChange={(e) => setTicks(+e.target.value)}
            className="w-full bg-white text-slate-900 font-bold rounded-lg px-4 py-3 text-center" />
        </div>
        <div>
          <div className="text-[11px] font-bold uppercase tracking-widest text-white/50 mb-2">Stake</div>
          <input type="number" step="0.1" value={stake} onChange={(e) => setStake(+e.target.value)}
            className="w-full bg-white text-slate-900 font-bold rounded-lg px-4 py-3 text-center" />
        </div>
        <div>
          <div className="text-[11px] font-bold uppercase tracking-widest text-white/50 mb-2">No of Trades</div>
          <input type="number" value={trades} onChange={(e) => setTrades(+e.target.value)}
            className="w-full bg-white text-slate-900 font-bold rounded-lg px-4 py-3 text-center" />
        </div>
      </div>

      {/* Even / Odd big buttons */}
      <div className="grid md:grid-cols-2 gap-4">
        <button className="rounded-lg bg-teal-500 hover:bg-teal-400 text-white font-black text-xl py-6 shadow-lg transition-transform hover:scale-[1.02]">
          <div>Even</div>
          <div className="text-lg font-bold mt-1 opacity-90">{evenPct.toFixed(2)}%</div>
        </button>
        <button className="rounded-lg bg-red-500 hover:bg-red-400 text-white font-black text-xl py-6 shadow-lg transition-transform hover:scale-[1.02]">
          <div>Odd</div>
          <div className="text-lg font-bold mt-1 opacity-90">{oddPct.toFixed(2)}%</div>
        </button>
      </div>

      <div className="pt-2">
        <button className="px-4 py-2 rounded-lg bg-yellow-400 text-slate-900 font-bold text-xs">
          Risk Disclaimer
        </button>
      </div>
    </div>
  );
}