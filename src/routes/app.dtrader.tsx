import { createFileRoute } from "@tanstack/react-router";
import { ChevronDown, Maximize2, Sun, Share2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export const Route = createFileRoute("/app/dtrader")({
  head: () => ({ meta: [{ title: "DTrader — Digittool" }] }),
  component: DTrader,
});

const TRADE_TYPES = [
  { key: "Even/Odd", hot: true },
  { key: "Over/Under" },
  { key: "Matches/Differs" },
  { key: "Rise/Fall", hot: true },
  { key: "Accumulators", hot: true },
  { key: "Multipliers" },
  { key: "Turbos" },
  { key: "Vanillas" },
  { key: "Higher/Lower" },
  { key: "Touch/No Touch" },
];

const SYMBOLS = [
  "Volatility 10 (1s) Index",
  "Volatility 25 (1s) Index",
  "Volatility 50 (1s) Index",
  "Volatility 75 (1s) Index",
  "Volatility 100 (1s) Index",
  "Boom 1000 Index",
  "Crash 1000 Index",
  "Jump 100 Index",
];

function DTrader() {
  const [trade, setTrade] = useState("Rise/Fall");
  const [symbol, setSymbol] = useState("Volatility 100 (1s) Index");
  const [symOpen, setSymOpen] = useState(false);
  const [side, setSide] = useState<"Rise" | "Fall">("Rise");
  const [evenOdd, setEvenOdd] = useState<"Even" | "Odd">("Even");
  const [overUnder, setOverUnder] = useState<"Over" | "Under">("Over");
  const [matchDiffer, setMatchDiffer] = useState<"Matches" | "Differs">("Matches");
  const [prediction, setPrediction] = useState(6);
  const [duration, setDuration] = useState(5);
  const [durUnit, setDurUnit] = useState<"ticks" | "min">("ticks");
  const [stake, setStake] = useState(10);
  const [allowEquals, setAllowEquals] = useState(false);
  const [ticks, setTicks] = useState<number[]>(() =>
    Array.from({ length: 80 }, (_, i) => 905 + Math.sin(i / 5) * 1.2 + Math.random() * 0.6)
  );
  const priceRef = useRef(905);


  useEffect(() => {
    const id = setInterval(() => {
      priceRef.current += (Math.random() - 0.5) * 0.35;
      setTicks((t) => [...t.slice(-119), priceRef.current]);
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const price = ticks[ticks.length - 1] ?? 905;
  const min = Math.min(...ticks) - 0.3;
  const max = Math.max(...ticks) + 0.3;
  const W = 1000, H = 480;
  const x = (i: number) => (i / (ticks.length - 1)) * W;
  const y = (v: number) => ((max - v) / (max - min)) * H;
  const path = ticks.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const area = `${path} L${W},${H} L0,${H} Z`;

  const payout = (stake * 1.82).toFixed(2);
  const now = new Date();
  const timeStr = now.toISOString().slice(11, 19) + " GMT";
  const dateStr = now.toUTCString().slice(5, 16);

  // Digit distribution for Even/Odd, Over/Under, Matches/Differs overlays
  const showDigits = trade === "Even/Odd" || trade === "Over/Under" || trade === "Matches/Differs";
  const digitCounts = Array(10).fill(0) as number[];
  ticks.forEach((v) => {
    const d = Math.abs(Math.round(v * 100)) % 10;
    digitCounts[d] += 1;
  });
  const digitTotal = digitCounts.reduce((s, n) => s + n, 0) || 1;
  const digitPct = digitCounts.map((c) => (c / digitTotal) * 100);
  const maxPct = Math.max(...digitPct);
  const minPct = Math.min(...digitPct);
  const currentDigit = Math.abs(Math.round(price * 100)) % 10;

  return (
    <div className="grid grid-cols-12 gap-4">
      {/* Left: chart */}
      <div className="col-span-12 lg:col-span-9">
        {/* Trade type tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-3 border-b border-white/10">
          {TRADE_TYPES.map((t) => {
            const active = trade === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTrade(t.key)}
                className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-semibold transition ${
                  active ? "bg-slate-900 text-white ring-2 ring-cyan-400" : "bg-white/5 text-white/80 hover:bg-white/10"
                }`}
              >
                {t.key} {t.hot && "🔥"}
              </button>
            );
          })}
        </div>

        {/* Symbol + chart */}
        <div className="rounded-xl bg-white text-slate-900 relative overflow-hidden" style={{ minHeight: 520 }}>
          <div className="absolute top-3 left-3 z-10">
            <button
              onClick={() => setSymOpen((v) => !v)}
              className="bg-white shadow border border-slate-200 rounded-lg px-3 py-2 text-left min-w-[220px]"
            >
              <div className="font-bold text-sm truncate">{symbol}</div>
              <div className="text-xs text-emerald-600">
                {price.toFixed(2)} - 0.03 (0.00%) ▲
              </div>
            </button>
            {symOpen && (
              <div className="mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-64 overflow-auto w-[260px]">
                {SYMBOLS.map((s) => (
                  <button
                    key={s}
                    onClick={() => { setSymbol(s); setSymOpen(false); }}
                    className={`block w-full text-left px-3 py-2 text-sm hover:bg-slate-100 ${s === symbol ? "bg-slate-50 font-semibold" : ""}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 bg-emerald-500 text-white text-xs font-semibold rounded px-2 py-1">
            0.01%
          </div>

          <svg viewBox={`0 0 ${W} ${H + 60}`} className="w-full">
            <defs>
              <linearGradient id="areaFill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#94a3b8" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
              </linearGradient>
            </defs>
            {/* gridlines */}
            {[0.2, 0.4, 0.6, 0.8].map((p) => (
              <line key={p} x1="0" x2={W} y1={H * p} y2={H * p} stroke="#e2e8f0" strokeDasharray="4 4" />
            ))}
            <path d={area} fill="url(#areaFill)" />
            <path d={path} stroke="#0f172a" strokeWidth="2" fill="none" />
            {/* current price marker */}
            <line x1={x(ticks.length - 1)} x2={W} y1={y(price)} y2={y(price)} stroke="#0f172a" strokeDasharray="3 3" />
            <circle cx={x(ticks.length - 1)} cy={y(price)} r="5" fill="#0f172a" />
            <g transform={`translate(${W - 70}, ${y(price) - 12})`}>
              <rect width="70" height="24" rx="4" fill="#0f172a" />
              <text x="35" y="16" textAnchor="middle" fill="#fff" fontSize="12" fontWeight="700">{price.toFixed(2)}</text>
            </g>
            {/* Gemini bubble */}
            <g transform={`translate(${W - 140}, 90)`}>
              <circle r="34" fill="#ef4444" opacity="0.85" />
              <circle r="34" fill="none" stroke="#ef4444" strokeWidth="8" opacity="0.35" />
              <circle cx="20" cy="-24" r="4" fill="#22c55e" />
              <text textAnchor="middle" y="5" fill="#fff" fontSize="12" fontWeight="900">GEMINI</text>
            </g>
            {/* time axis */}
            <g fontSize="10" fill="#64748b">
              {[0, 0.25, 0.5, 0.75, 1].map((p, i) => {
                const t = new Date(Date.now() - (1 - p) * ticks.length * 1000);
                return <text key={i} x={W * p} y={H + 20} textAnchor="middle">{t.toISOString().slice(11, 19)}</text>;
              })}
            </g>
          </svg>

          {showDigits && (
            <div className="absolute bottom-12 left-0 right-0 flex items-end justify-center gap-2 md:gap-3 px-4 pointer-events-none">
              {digitPct.map((pct, d) => {
                const isCurrent = d === currentDigit;
                const isMax = pct === maxPct;
                const isMin = pct === minPct;
                const outer = isMax
                  ? "bg-emerald-100 ring-2 ring-emerald-500"
                  : isMin
                    ? "bg-red-100 ring-2 ring-red-500"
                    : "bg-slate-100 ring-2 ring-slate-300";
                const text = isMax ? "text-emerald-700" : isMin ? "text-red-700" : "text-slate-700";
                return (
                  <div key={d} className="flex flex-col items-center">
                    {/* Outer visibility layer + inner digit chip = "second layer" */}
                    <div className={`relative w-12 h-12 md:w-14 md:h-14 rounded-full ${outer} grid place-items-center shadow-md`}>
                      <div className={`w-9 h-9 md:w-11 md:h-11 rounded-full bg-white border-2 border-slate-200 grid place-items-center ${isCurrent ? "shadow-[0_0_0_3px_rgba(6,182,212,0.55)] ring-2 ring-cyan-500" : ""}`}>
                        <span className={`text-xs md:text-sm font-bold leading-none ${text}`}>{d}</span>
                      </div>
                      <span className={`absolute -bottom-4 text-[10px] md:text-[11px] font-semibold ${text}`}>
                        {pct.toFixed(1)}%
                      </span>
                    </div>
                    {isCurrent && (
                      <svg width="12" height="8" viewBox="0 0 12 8" className="mt-5">
                        <polygon points="6,0 12,8 0,8" fill="#0f172a" />
                      </svg>
                    )}
                  </div>
                );
              })}
            </div>
          )}


          <div className="absolute bottom-2 left-3">
            <span className="inline-block bg-yellow-300 text-slate-900 text-xs font-bold px-3 py-1 rounded">Risk Disclaimer</span>
          </div>
          <div className="absolute bottom-2 right-3 flex items-center gap-3 text-xs text-slate-500">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            <span>{now.toISOString().slice(0, 10)} {timeStr}</span>
            <Sun className="w-4 h-4" />
            <Share2 className="w-4 h-4" />
            <Maximize2 className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Right: trade panel — content varies by trade type */}
      <div className="col-span-12 lg:col-span-3">
        <div className="rounded-xl bg-white text-slate-900 p-4 space-y-4 shadow">
          {/* Top toggle: varies by trade type */}
          {trade === "Even/Odd" && (
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-full">
              {(["Even", "Odd"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setEvenOdd(s)}
                  className={`py-2 rounded-full text-sm font-bold transition ${
                    evenOdd === s ? "bg-white text-emerald-600 shadow" : "text-slate-500"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {trade === "Over/Under" && (
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-full">
              {(["Over", "Under"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setOverUnder(s)}
                  className={`py-2 rounded-full text-sm font-bold transition ${
                    overUnder === s ? "bg-white text-emerald-600 shadow" : "text-slate-500"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {trade === "Matches/Differs" && (
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-full">
              {(["Matches", "Differs"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setMatchDiffer(s)}
                  className={`py-2 rounded-full text-sm font-bold transition ${
                    matchDiffer === s ? "bg-white text-emerald-600 shadow" : "text-slate-500"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {trade === "Rise/Fall" && (
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-lg">
              {(["Rise", "Fall"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSide(s)}
                  className={`py-2 rounded-md text-sm font-bold transition ${
                    side === s
                      ? s === "Rise" ? "bg-white text-emerald-600 shadow" : "bg-white text-red-600 shadow"
                      : "text-slate-500"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Last digit prediction — Over/Under & Matches/Differs */}
          {(trade === "Over/Under" || trade === "Matches/Differs") && (
            <div className="rounded-lg bg-slate-50 p-3">
              <div className="text-xs text-slate-500 mb-2">Last digit prediction</div>
              <div className="grid grid-cols-5 gap-2">
                {Array.from({ length: 10 }, (_, d) => {
                  const pct = digitPct[d];
                  const isMax = pct === maxPct;
                  const isMin = pct === minPct;
                  const selected = prediction === d;
                  const pctColor = isMax ? "text-emerald-600" : isMin ? "text-red-600" : "text-slate-400";
                  return (
                    <button
                      key={d}
                      onClick={() => setPrediction(d)}
                      className="flex flex-col items-center gap-0.5"
                    >
                      <div className={`w-9 h-9 rounded-md grid place-items-center text-sm font-bold border transition ${
                        selected ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-800 border-slate-200 hover:border-slate-400"
                      }`}>
                        {d}
                      </div>
                      <span className={`text-[10px] font-semibold ${pctColor}`}>{pct.toFixed(1)}%</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <label className="block bg-slate-50 rounded-lg p-3">
            <div className="text-xs text-slate-500">Duration</div>
            <div className="flex items-center gap-2 mt-1">
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(+e.target.value)}
                className="w-full text-lg font-semibold outline-none bg-transparent"
              />
              <select
                value={durUnit}
                onChange={(e) => setDurUnit(e.target.value as "ticks" | "min")}
                className="text-sm bg-transparent outline-none"
              >
                <option value="ticks">ticks</option>
                <option value="min">min</option>
              </select>
            </div>
          </label>

          <label className="block bg-slate-50 rounded-lg p-3">
            <div className="text-xs text-slate-500">Stake</div>
            <div className="flex items-center gap-2 mt-1">
              <input
                type="number"
                value={stake}
                onChange={(e) => setStake(+e.target.value)}
                className="w-full text-lg font-semibold outline-none bg-transparent"
              />
              <span className="text-sm text-slate-500">USD</span>
            </div>
          </label>

          {trade === "Rise/Fall" && (
            <div className="flex items-center justify-between">
              <span className="text-sm">Allow equals</span>
              <button
                onClick={() => setAllowEquals((v) => !v)}
                className={`w-10 h-5 rounded-full transition relative ${allowEquals ? "bg-emerald-500" : "bg-slate-300"}`}
              >
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition ${allowEquals ? "left-5" : "left-0.5"}`} />
              </button>
            </div>
          )}

          <button
            className={`w-full py-3 rounded-full font-bold text-white ${
              trade === "Rise/Fall" && side === "Fall"
                ? "bg-red-500 hover:bg-red-600"
                : "bg-emerald-500 hover:bg-emerald-600"
            }`}
          >
            <div>Buy</div>
            <div className="text-xs font-normal opacity-90">Payout {payout} USD</div>
          </button>

          <div className="text-[11px] text-slate-500 text-center">{dateStr} {timeStr}</div>
        </div>
      </div>

    </div>
  );
}
