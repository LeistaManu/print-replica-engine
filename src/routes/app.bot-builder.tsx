import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Play, Square, Save, Download, Upload, RotateCcw, RotateCw, ZoomIn, ZoomOut,
  ChevronDown, ChevronRight, Search, Trash2, X, Plus, CheckCircle2,
} from "lucide-react";

export const Route = createFileRoute("/app/bot-builder")({
  head: () => ({ meta: [{ title: "Bot Builder — Digittool" }] }),
  component: BotBuilder,
});

/* ---------- Blocks catalog ---------- */
const BLOCKS: Record<string, string[]> = {
  "Trade parameters": ["Market", "Trade Type", "Contract Type", "Candle Interval", "Trade options"],
  "Purchase conditions": ["Purchase Rise", "Purchase Fall", "Purchase Even", "Purchase Odd", "Purchase Higher", "Purchase Lower"],
  "Sell conditions (optional)": ["Sell at market", "Sell if profit >", "Sell if loss >"],
  "Restart trading conditions": ["Trade again", "Stop bot", "Restart after loss", "Restart after win"],
  "Analysis": ["Last digit", "Moving average", "RSI", "Bollinger bands", "MACD"],
  "Utility": ["Notify", "Log", "Delay", "Repeat", "Math", "Variable"],
};

const MARKETS = [
  "Volatility 10 (1s) Index", "Volatility 25 Index", "Volatility 50 Index",
  "Volatility 75 Index", "Volatility 100 Index", "Boom 500 Index",
  "Boom 1000 Index", "Crash 500 Index", "Crash 1000 Index", "Jump 25 Index",
];
const TRADE_TYPES = ["Rise/Fall", "Higher/Lower", "Even/Odd", "Matches/Differs", "Over/Under", "Touch/No Touch"];
const CONTRACTS = ["Both", "Rise", "Fall"];
const INTERVALS = ["1 tick", "5 ticks", "15 seconds", "1 minute", "5 minutes", "15 minutes", "1 hour"];
const PURCHASES = ["Rise", "Fall", "Even", "Odd"];

const QUICK_STRATEGIES = [
  { id: "martingale", name: "Martingale", desc: "Double stake after each loss until a win recovers all losses." },
  { id: "dalembert", name: "D'Alembert", desc: "Increase stake by 1 unit after loss, decrease by 1 after win." },
  { id: "oscar", name: "Oscar's Grind", desc: "Slow, conservative recovery of small losses." },
  { id: "reverse-martingale", name: "Reverse Martingale", desc: "Double stake after each win, reset after loss." },
  { id: "1326", name: "1-3-2-6", desc: "Positive progression sequence for compounding wins." },
  { id: "cutler", name: "Cutler's Cross", desc: "Enter based on moving-average crossover signals." },
];

type BotState = "idle" | "running" | "stopped";
type Trade = { id: number; time: string; type: string; stake: number; payout: number; pl: number; win: boolean };

function BotBuilder() {
  /* ---------- Left menu ---------- */
  const [openCat, setOpenCat] = useState<Record<string, boolean>>({ "Trade parameters": true });
  const [search, setSearch] = useState("");
  const [quickOpen, setQuickOpen] = useState(false);

  /* ---------- Config (canvas) ---------- */
  const [market, setMarket] = useState(MARKETS[0]);
  const [tradeType, setTradeType] = useState(TRADE_TYPES[0]);
  const [contract, setContract] = useState(CONTRACTS[0]);
  const [interval, setInterval] = useState(INTERVALS[3]);
  const [restartOnError, setRestartOnError] = useState(false);
  const [restartLast, setRestartLast] = useState(true);
  const [duration, setDuration] = useState(1);
  const [durationUnit, setDurationUnit] = useState("Ticks");
  const [currency, setCurrency] = useState("KES");
  const [stake, setStake] = useState(1);
  const [purchase, setPurchase] = useState(PURCHASES[0]);
  const [restartRule, setRestartRule] = useState("Trade again");

  /* ---------- Runtime ---------- */
  const [botState, setBotState] = useState<BotState>("idle");
  const [tab, setTab] = useState<"Summary" | "Transactions" | "Journal">("Summary");
  const [trades, setTrades] = useState<Trade[]>([]);
  const [journal, setJournal] = useState<string[]>([]);
  const [loadedBotNotice, setLoadedBotNotice] = useState<string | null>(null);
  const tradeId = useRef(0);

  const stats = useMemo(() => {
    const totalStake = trades.reduce((s, t) => s + t.stake, 0);
    const totalPayout = trades.reduce((s, t) => s + t.payout, 0);
    const won = trades.filter((t) => t.win).length;
    const lost = trades.length - won;
    const pl = totalPayout - totalStake;
    return { totalStake, totalPayout, count: trades.length, won, lost, pl };
  }, [trades]);

  useEffect(() => {
    if (botState !== "running") return;
    const id = window.setInterval(() => {
      const win = Math.random() > 0.45;
      const payout = win ? +(stake * 1.92).toFixed(2) : 0;
      const t: Trade = {
        id: ++tradeId.current,
        time: new Date().toLocaleTimeString(),
        type: purchase,
        stake,
        payout,
        pl: +(payout - stake).toFixed(2),
        win,
      };
      setTrades((prev) => [t, ...prev].slice(0, 200));
      setJournal((prev) => [`[${t.time}] ${win ? "WON" : "LOST"} ${purchase} · stake ${stake} ${currency} · P/L ${t.pl}`, ...prev].slice(0, 200));
    }, 2200);
    return () => window.clearInterval(id);
  }, [botState, stake, purchase, currency]);

  // Load a bot dropped in from the Trading Bots store (localStorage handoff).
  useEffect(() => {
    try {
      const raw = localStorage.getItem("digittool.pendingBot");
      if (!raw) return;
      const c = JSON.parse(raw) as { name?: string; market?: string; stake?: number; duration?: string; strategy?: string; category?: string };
      if (c.market) setMarket(c.market);
      if (typeof c.stake === "number") setStake(c.stake);
      if (c.category) {
        const cat = c.category;
        const map: Record<string, string> = {
          "Rise/Fall": "Rise/Fall", "Even/Odd": "Even/Odd", "Over/Under": "Over/Under",
          "Matches/Differs": "Matches/Differs", "Higher/Lower": "Higher/Lower", "Touch/No Touch": "Touch/No Touch",
        };
        if (map[cat]) setTradeType(map[cat]);
      }
      const loadedName = c.name ?? "Untitled";
      setLoadedBotNotice(`Successfully loaded bot: ${loadedName}`);
      setJournal((p) => [`[${new Date().toLocaleTimeString()}] Successfully loaded bot "${loadedName}" from Store (${c.strategy ?? "custom"} on ${c.market ?? "?"})`, ...p]);
      localStorage.removeItem("digittool.pendingBot");
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleCat = (c: string) => setOpenCat((p) => ({ ...p, [c]: !p[c] }));

  const filteredCats = useMemo(() => {
    if (!search.trim()) return BLOCKS;
    const q = search.toLowerCase();
    const out: Record<string, string[]> = {};
    Object.entries(BLOCKS).forEach(([k, v]) => {
      const items = v.filter((i) => i.toLowerCase().includes(q));
      if (k.toLowerCase().includes(q) || items.length) out[k] = items.length ? items : v;
    });
    return out;
  }, [search]);

  const applyQuick = (id: string) => {
    const s = QUICK_STRATEGIES.find((x) => x.id === id)!;
    setJournal((p) => [`[${new Date().toLocaleTimeString()}] Loaded quick strategy: ${s.name}`, ...p]);
    setQuickOpen(false);
  };

  const clearAll = () => {
    setTrades([]);
    setJournal([]);
    tradeId.current = 0;
  };

  const exportBot = () => {
    const cfg = { market, tradeType, contract, interval, restartOnError, restartLast, duration, durationUnit, currency, stake, purchase, restartRule };
    const blob = new Blob([JSON.stringify(cfg, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "digittool-bot.json"; a.click();
    URL.revokeObjectURL(url);
  };

  const importBot = (f: File) => {
    const r = new FileReader();
    r.onload = () => {
      try {
        const c = JSON.parse(String(r.result));
        c.market && setMarket(c.market);
        c.tradeType && setTradeType(c.tradeType);
        c.contract && setContract(c.contract);
        c.interval && setInterval(c.interval);
        typeof c.restartOnError === "boolean" && setRestartOnError(c.restartOnError);
        typeof c.restartLast === "boolean" && setRestartLast(c.restartLast);
        c.duration && setDuration(c.duration);
        c.durationUnit && setDurationUnit(c.durationUnit);
        c.currency && setCurrency(c.currency);
        c.stake && setStake(c.stake);
        c.purchase && setPurchase(c.purchase);
        c.restartRule && setRestartRule(c.restartRule);
        setJournal((p) => [`[${new Date().toLocaleTimeString()}] Imported bot configuration`, ...p]);
      } catch { alert("Invalid bot file"); }
    };
    r.readAsText(f);
  };

  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <div className="grid grid-cols-12 gap-4">
      {loadedBotNotice && (
        <div className="col-span-12 rounded-xl border border-emerald-400/40 bg-emerald-500/15 px-4 py-3 text-emerald-100 shadow-[0_0_24px_rgba(16,185,129,0.18)] flex items-center justify-between gap-3 animate-page-in">
          <div className="inline-flex items-center gap-2 text-sm font-bold">
            <CheckCircle2 className="h-5 w-5 text-emerald-300" />
            {loadedBotNotice}
          </div>
          <button onClick={() => setLoadedBotNotice(null)} className="grid h-7 w-7 place-items-center rounded-lg bg-white/10 text-white/70 hover:bg-white/20 hover:text-white" aria-label="Dismiss loaded bot message">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      {/* Left panel */}
      <aside className="col-span-12 lg:col-span-3 space-y-3">
        <button onClick={() => setQuickOpen(true)} className="w-full py-3 rounded-lg bg-blue-600 hover:bg-blue-500 font-semibold">
          Quick strategy
        </button>
        <div className="rounded-lg bg-white/5 border border-white/10 p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold">Blocks menu</span>
            <ChevronDown className="w-4 h-4" />
          </div>
          <div className="relative mb-3">
            <Search className="w-4 h-4 absolute left-2 top-2.5 text-white/40" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-2 py-2 rounded bg-white/5 border border-white/10 text-sm"
              placeholder="Search"
            />
          </div>
          <ul className="space-y-1 text-sm">
            {Object.entries(filteredCats).map(([cat, items]) => (
              <li key={cat}>
                <button
                  onClick={() => toggleCat(cat)}
                  className="w-full flex items-center justify-between px-2 py-2 rounded hover:bg-white/5"
                >
                  {cat}
                  {openCat[cat] ? <ChevronDown className="w-3 h-3 text-white/40" /> : <ChevronRight className="w-3 h-3 text-white/40" />}
                </button>
                {openCat[cat] && (
                  <ul className="ml-3 my-1 space-y-0.5">
                    {items.map((i) => (
                      <li key={i}>
                        <button
                          onClick={() => setJournal((p) => [`[${new Date().toLocaleTimeString()}] Added block: ${i}`, ...p])}
                          className="w-full text-left flex items-center gap-2 px-2 py-1.5 rounded text-xs text-white/70 hover:bg-blue-500/20 hover:text-white"
                        >
                          <Plus className="w-3 h-3" /> {i}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </div>
      </aside>

      {/* Canvas */}
      <section className="col-span-12 lg:col-span-6">
        <div className="flex items-center gap-2 mb-3">
          <ToolBtn icon={RotateCcw} title="Undo" onClick={() => setJournal((p) => [`[${new Date().toLocaleTimeString()}] Undo`, ...p])} />
          <ToolBtn icon={Upload} title="Import" onClick={() => fileRef.current?.click()} />
          <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={(e) => e.target.files?.[0] && importBot(e.target.files[0])} />
          <ToolBtn icon={Download} title="Export" onClick={exportBot} />
          <ToolBtn icon={Save} title="Save" onClick={() => { localStorage.setItem("digittool-bot", JSON.stringify({ market, tradeType, contract, interval, stake, purchase })); setJournal((p) => [`[${new Date().toLocaleTimeString()}] Saved`, ...p]); }} />
          <ToolBtn icon={RotateCw} title="Redo" />
          <ToolBtn icon={ZoomIn} title="Zoom in" />
          <ToolBtn icon={ZoomOut} title="Zoom out" />
        </div>

        <div className="relative min-h-[600px] rounded-xl bg-[#0d1220] border border-white/10 p-6 overflow-auto"
             style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)", backgroundSize: "20px 20px" }}>
          <BlockGroup title="1. Trade parameters">
            <FieldRow label="Market">
              <Select value={market} onChange={setMarket} options={MARKETS} />
            </FieldRow>
            <FieldRow label="Trade Type">
              <Select value={tradeType} onChange={setTradeType} options={TRADE_TYPES} />
            </FieldRow>
            <FieldRow label="Contract Type">
              <Select value={contract} onChange={setContract} options={CONTRACTS} />
            </FieldRow>
            <FieldRow label="Default Candle Interval">
              <Select value={interval} onChange={setInterval} options={INTERVALS} />
            </FieldRow>
            <label className="flex items-center gap-2 text-xs text-white/70 py-1 cursor-pointer">
              <input type="checkbox" checked={restartOnError} onChange={(e) => setRestartOnError(e.target.checked)} />
              Restart buy/sell on error (disable for better performance)
            </label>
            <label className="flex items-center gap-2 text-xs text-white/70 py-1 cursor-pointer">
              <input type="checkbox" checked={restartLast} onChange={(e) => setRestartLast(e.target.checked)} />
              Restart last trade on error (bot ignores the unsuccessful trade)
            </label>
            <div className="mt-3 border-t border-white/10 pt-3 space-y-1">
              <div className="text-xs font-semibold">Trade options:</div>
              <div className="flex items-center flex-wrap gap-1.5 text-xs">
                <span className="text-white/80">Duration:</span>
                <Select value={durationUnit} onChange={setDurationUnit} options={["Ticks", "Seconds", "Minutes", "Hours"]} />
                <NumInput value={duration} onChange={setDuration} min={1} />
                <span className="text-white/80 ml-2">Stake:</span>
                <Select value={currency} onChange={setCurrency} options={["KES", "USD", "EUR", "GBP", "AUD"]} />
                <NumInput value={stake} onChange={setStake} min={0.35} step={0.5} />
              </div>
            </div>
          </BlockGroup>

          <BlockGroup title="2. Purchase conditions">
            <FieldRow label="Purchase">
              <Select value={purchase} onChange={setPurchase} options={PURCHASES} />
            </FieldRow>
          </BlockGroup>

          <BlockGroup title="3. Sell conditions" side>
            <div className="text-xs text-white/80">if <span className="px-2 py-0.5 rounded bg-white/10">Sell is available</span> then</div>
            <div className="h-10" />
          </BlockGroup>

          <BlockGroup title="4. Restart trading conditions" side>
            <FieldRow label="">
              <Select value={restartRule} onChange={setRestartRule} options={["Trade again", "Stop bot", "Restart after loss", "Restart after win"]} />
            </FieldRow>
          </BlockGroup>

          <button
            onClick={clearAll}
            title="Clear results"
            className="absolute bottom-4 right-4 w-10 h-10 rounded-full bg-red-500/20 hover:bg-red-500/30 grid place-items-center"
          >
            <Trash2 className="w-4 h-4 text-red-400" />
          </button>
        </div>
      </section>

      {/* Right panel */}
      <aside className="col-span-12 lg:col-span-3">
        <div className="rounded-xl bg-white/5 border border-white/10 overflow-hidden">
          <div className="flex items-center gap-2 p-3 border-b border-white/10">
            {botState === "running" ? (
              <button onClick={() => setBotState("stopped")} className="flex items-center gap-1 px-3 py-1.5 rounded bg-red-500/20 text-red-300 text-sm font-semibold">
                <Square className="w-4 h-4" /> Stop
              </button>
            ) : (
              <button onClick={() => setBotState("running")} className="flex items-center gap-1 px-3 py-1.5 rounded bg-emerald-500/20 text-emerald-300 text-sm font-semibold">
                <Play className="w-4 h-4" /> Run
              </button>
            )}
            <span className="text-xs text-white/60">
              {botState === "running" ? "Bot is running…" : "Bot is not running"}
            </span>
          </div>
          <div className="flex text-sm border-b border-white/10">
            {(["Summary", "Transactions", "Journal"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2 ${tab === t ? "border-b-2 border-cyan-400 font-semibold" : "text-white/60"}`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="p-4 min-h-[220px] text-sm">
            {tab === "Summary" && trades.length === 0 && (
              <div className="text-center text-white/70 py-10">
                When you're ready to trade, hit <strong>Run</strong>.<br />
                You'll be able to track your bot's performance here.
              </div>
            )}
            {tab === "Summary" && trades.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs text-white/60">Last trade</div>
                <div className={`p-2 rounded ${trades[0].win ? "bg-emerald-500/10 text-emerald-300" : "bg-red-500/10 text-red-300"}`}>
                  {trades[0].win ? "WON" : "LOST"} · {trades[0].type} · {trades[0].pl} {currency}
                </div>
              </div>
            )}
            {tab === "Transactions" && (
              <div className="max-h-[220px] overflow-auto">
                {trades.length === 0 && <div className="text-white/50 text-xs">No transactions yet.</div>}
                {trades.map((t) => (
                  <div key={t.id} className="flex justify-between text-xs py-1 border-b border-white/5">
                    <span className="text-white/60">{t.time}</span>
                    <span>{t.type}</span>
                    <span className={t.win ? "text-emerald-400" : "text-red-400"}>{t.pl}</span>
                  </div>
                ))}
              </div>
            )}
            {tab === "Journal" && (
              <div className="max-h-[220px] overflow-auto text-xs space-y-1">
                {journal.length === 0 && <div className="text-white/50">Journal is empty.</div>}
                {journal.map((l, i) => <div key={i} className="text-white/70">{l}</div>)}
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3 p-4 border-t border-white/10 text-xs">
            <Stat label="Total stake" value={`${stats.totalStake.toFixed(2)} ${currency}`} />
            <Stat label="Total payout" value={`${stats.totalPayout.toFixed(2)} ${currency}`} />
            <Stat label="No." value={String(stats.count)} />
            <Stat label="Contracts lost" value={String(stats.lost)} />
            <Stat label="Contracts won" value={String(stats.won)} />
            <Stat label="Total profit/loss" value={`${stats.pl.toFixed(2)} ${currency}`} color={stats.pl >= 0 ? "text-emerald-400" : "text-red-400"} />
          </div>
        </div>
      </aside>

      {/* Quick strategy modal */}
      {quickOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 grid place-items-center p-4" onClick={() => setQuickOpen(false)}>
          <div className="bg-[#0f1424] border border-white/10 rounded-xl w-full max-w-2xl p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Quick strategy</h3>
              <button onClick={() => setQuickOpen(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {QUICK_STRATEGIES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => applyQuick(s.id)}
                  className="text-left p-4 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-cyan-400/40"
                >
                  <div className="font-semibold">{s.name}</div>
                  <div className="text-xs text-white/60 mt-1">{s.desc}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- helpers ---------- */
function ToolBtn({ icon: I, title, onClick }: { icon: any; title: string; onClick?: () => void }) {
  return (
    <button onClick={onClick} title={title} className="w-9 h-9 grid place-items-center rounded bg-white/5 hover:bg-white/10 border border-white/10">
      <I className="w-4 h-4" />
    </button>
  );
}

function BlockGroup({ title, children, side }: { title: string; children: React.ReactNode; side?: boolean }) {
  return (
    <div className={`mb-4 rounded-lg overflow-hidden border border-blue-500/40 ${side ? "ml-auto max-w-md" : "max-w-xl"}`}>
      <div className="bg-gradient-to-r from-blue-700 to-blue-600 px-3 py-2 text-sm font-semibold">{title}</div>
      <div className="bg-blue-900/40 p-3 space-y-1">{children}</div>
    </div>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center flex-wrap gap-1.5 text-xs">
      {label && <span className="text-white/80">{label}:</span>}
      {children}
    </div>
  );
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="px-2 py-1 rounded bg-white/10 border border-white/10 text-xs focus:outline-none focus:border-cyan-400"
    >
      {options.map((o) => <option key={o} value={o} className="bg-[#0f1424]">{o}</option>)}
    </select>
  );
}

function NumInput({ value, onChange, min, step = 1 }: { value: number; onChange: (v: number) => void; min?: number; step?: number }) {
  return (
    <input
      type="number"
      value={value}
      min={min}
      step={step}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-20 px-2 py-1 rounded bg-white/10 border border-white/10 text-xs focus:outline-none focus:border-cyan-400"
    />
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <div className="text-white/50">{label}</div>
      <div className={`font-semibold ${color ?? ""}`}>{value}</div>
    </div>
  );
}
