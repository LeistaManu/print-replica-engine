import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Play, Square, Save, Download, Upload, RotateCcw, RotateCw, ZoomIn, ZoomOut,
  ChevronDown, ChevronRight, Search, Trash2, X, Plus, CheckCircle2, FolderOpen,
  Layers, RefreshCw,
} from "lucide-react";

export const Route = createFileRoute("/app/bot-builder")({
  head: () => ({ meta: [{ title: "Bot Builder — Digittool" }] }),
  component: BotBuilder,
});

/* ---------- Blocks catalog ---------- */
const BLOCKS: Record<string, string[]> = {
  "Trade parameters": ["Market", "Trade Type", "Contract Type", "Candle Interval", "Trade options"],
  "Purchase conditions": ["Purchase Rise", "Purchase Fall", "Purchase Even", "Purchase Odd", "Purchase Higher", "Purchase Lower", "Purchase Over", "Purchase Under"],
  "Sell conditions (optional)": ["Sell at market", "Sell if profit >", "Sell if loss >"],
  "Restart trading conditions": ["Trade again", "Stop bot", "Restart after loss", "Restart after win"],
  "Analysis": ["Last digit", "Moving average", "RSI", "Bollinger bands", "MACD"],
  "Utility": ["Notify", "Log", "Delay", "Repeat", "Math", "Variable"],
};

/* Chained market selectors (like Deriv/dollarprinter) */
const MARKET_CATS = ["Derived", "Forex", "Cryptocurrencies", "Stock Indices", "Commodities"];
const SUBMARKETS: Record<string, string[]> = {
  Derived: ["Continuous Indices", "Crash/Boom", "Jump Indices", "Daily Reset Indices"],
  Forex: ["Major Pairs", "Minor Pairs", "Exotic Pairs"],
  Cryptocurrencies: ["Cryptocurrencies"],
  "Stock Indices": ["American indices", "Asian indices", "European indices"],
  Commodities: ["Metals", "Energy"],
};
const SYMBOLS: Record<string, string[]> = {
  "Continuous Indices": ["Volatility 10 Index", "Volatility 10 (1s) Index", "Volatility 25 Index", "Volatility 25 (1s) Index", "Volatility 50 Index", "Volatility 50 (1s) Index", "Volatility 75 Index", "Volatility 75 (1s) Index", "Volatility 100 Index", "Volatility 100 (1s) Index"],
  "Crash/Boom": ["Boom 500 Index", "Boom 1000 Index", "Crash 500 Index", "Crash 1000 Index"],
  "Jump Indices": ["Jump 10 Index", "Jump 25 Index", "Jump 50 Index", "Jump 75 Index", "Jump 100 Index"],
  "Daily Reset Indices": ["Bull Market Index", "Bear Market Index"],
  "Major Pairs": ["EUR/USD", "GBP/USD", "USD/JPY", "USD/CHF"],
  "Minor Pairs": ["EUR/GBP", "EUR/JPY", "GBP/JPY"],
  "Exotic Pairs": ["USD/TRY", "USD/ZAR"],
  Cryptocurrencies: ["BTC/USD", "ETH/USD", "LTC/USD"],
  "American indices": ["US 500", "US Tech 100", "Wall Street 30"],
  "Asian indices": ["Hong Kong 50", "Japan 225"],
  "European indices": ["Germany 40", "UK 100", "France 40"],
  Metals: ["Gold/USD", "Silver/USD"],
  Energy: ["Oil/USD"],
};

const TRADE_TYPE_CATS = ["Up/Down", "Digits", "Higher/Lower", "Touch/No Touch", "In/Out"];
const TRADE_TYPES: Record<string, string[]> = {
  "Up/Down": ["Rise/Fall", "Higher/Lower"],
  Digits: ["Matches/Differs", "Even/Odd", "Over/Under"],
  "Higher/Lower": ["Higher/Lower"],
  "Touch/No Touch": ["Touch/No Touch"],
  "In/Out": ["Ends Between/Outside", "Stays Between/Goes Outside"],
};

const CONTRACTS_BY_TYPE: Record<string, string[]> = {
  "Rise/Fall": ["Both", "Rise", "Fall"],
  "Matches/Differs": ["Both", "Matches", "Differs"],
  "Even/Odd": ["Both", "Even", "Odd"],
  "Over/Under": ["Both", "Over", "Under"],
  "Higher/Lower": ["Both", "Higher", "Lower"],
  "Touch/No Touch": ["Both", "Touch", "No Touch"],
  "Ends Between/Outside": ["Both", "Ends Between", "Ends Outside"],
  "Stays Between/Goes Outside": ["Both", "Stays Between", "Goes Outside"],
};

const INTERVALS = ["1 tick", "5 ticks", "15 seconds", "1 minute", "5 minutes", "15 minutes", "1 hour"];
const PURCHASES = ["Rise", "Fall", "Even", "Odd", "Over", "Under", "Matches", "Differs"];

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
  const [marketCat, setMarketCat] = useState("Derived");
  const [submarket, setSubmarket] = useState("Continuous Indices");
  const [symbol, setSymbol] = useState("Volatility 100 Index");
  const [tradeCat, setTradeCat] = useState("Digits");
  const [tradeType, setTradeType] = useState("Over/Under");
  const [contract, setContract] = useState("Over");
  const [interval, setIntervalV] = useState("1 minute");
  const [restartOnError, setRestartOnError] = useState(false);
  const [restartLast, setRestartLast] = useState(true);
  const [duration, setDuration] = useState(1);
  const [durationUnit, setDurationUnit] = useState("Ticks");
  const [currency, setCurrency] = useState("USD");
  const [stake, setStake] = useState(1);
  const [prediction, setPrediction] = useState(3);
  const [purchase, setPurchase] = useState(PURCHASES[4]);
  const [restartRule, setRestartRule] = useState("Trade again");

  /* Run-once-at-start variables (like screenshot) */
  const [startMsg, setStartMsg] = useState("Another Day Another Dollar 💵💰 All The Best 📈");
  const [lossLimit, setLossLimit] = useState(1000);
  const [targetProfit, setTargetProfit] = useState(500);
  const [startStake, setStartStake] = useState(50);
  const [stake2, setStake2] = useState(50);

  /* Purchase conditions expand */
  const [purchaseOpen, setPurchaseOpen] = useState(false);

  /* ---------- Runtime ---------- */
  const [botState, setBotState] = useState<BotState>("idle");
  const [tab, setTab] = useState<"Summary" | "Transactions" | "Journal">("Summary");
  const [trades, setTrades] = useState<Trade[]>([]);
  const [journal, setJournal] = useState<string[]>([]);
  const [loadedBotNotice, setLoadedBotNotice] = useState<string | null>(null);
  const tradeId = useRef(0);

  // keep chained selectors coherent
  useEffect(() => { setSubmarket(SUBMARKETS[marketCat][0]); }, [marketCat]);
  useEffect(() => { setSymbol(SYMBOLS[submarket][0]); }, [submarket]);
  useEffect(() => { setTradeType(TRADE_TYPES[tradeCat][0]); }, [tradeCat]);
  useEffect(() => { setContract((CONTRACTS_BY_TYPE[tradeType] ?? ["Both"])[0]); }, [tradeType]);

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
    setJournal((p) => [`[${new Date().toLocaleTimeString()}] ${startMsg}`, ...p]);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [botState, stake, purchase, currency]);

  // Load a bot dropped in from the Trading Bots store (localStorage handoff).
  useEffect(() => {
    try {
      const raw = localStorage.getItem("digittool.pendingBot");
      if (!raw) return;
      const c = JSON.parse(raw) as { name?: string; market?: string; stake?: number; strategy?: string; category?: string };
      if (c.market) {
        // try to place the market string into symbol; find enclosing submarket
        for (const [sub, syms] of Object.entries(SYMBOLS)) {
          if (syms.includes(c.market)) {
            const cat = Object.entries(SUBMARKETS).find(([, subs]) => subs.includes(sub))?.[0];
            if (cat) setMarketCat(cat);
            setSubmarket(sub); setSymbol(c.market); break;
          }
        }
      }
      if (typeof c.stake === "number") setStake(c.stake);
      if (c.category) {
        const map: Record<string, [string, string]> = {
          "Rise/Fall": ["Up/Down", "Rise/Fall"],
          "Even/Odd": ["Digits", "Even/Odd"],
          "Over/Under": ["Digits", "Over/Under"],
          "Matches/Differs": ["Digits", "Matches/Differs"],
          "Higher/Lower": ["Higher/Lower", "Higher/Lower"],
          "Touch/No Touch": ["Touch/No Touch", "Touch/No Touch"],
        };
        const m = map[c.category];
        if (m) { setTradeCat(m[0]); setTradeType(m[1]); }
      }
      const loadedName = c.name ?? "Untitled";
      setLoadedBotNotice(`Successfully loaded bot: ${loadedName}`);
      setJournal((p) => [`[${new Date().toLocaleTimeString()}] Successfully loaded bot "${loadedName}" (${c.strategy ?? "custom"})`, ...p]);
      localStorage.removeItem("digittool.pendingBot");
    } catch {}
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

  const clearAll = () => { setTrades([]); setJournal([]); tradeId.current = 0; };

  const cfg = () => ({
    marketCat, submarket, symbol, tradeCat, tradeType, contract, interval,
    restartOnError, restartLast, duration, durationUnit, currency, stake, prediction,
    purchase, restartRule, startMsg, lossLimit, targetProfit, startStake, stake2,
  });

  const exportBot = () => {
    const blob = new Blob([JSON.stringify(cfg(), null, 2)], { type: "application/json" });
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
        c.marketCat && setMarketCat(c.marketCat);
        c.submarket && setSubmarket(c.submarket);
        c.symbol && setSymbol(c.symbol);
        c.tradeCat && setTradeCat(c.tradeCat);
        c.tradeType && setTradeType(c.tradeType);
        c.contract && setContract(c.contract);
        c.interval && setIntervalV(c.interval);
        typeof c.restartOnError === "boolean" && setRestartOnError(c.restartOnError);
        typeof c.restartLast === "boolean" && setRestartLast(c.restartLast);
        c.duration && setDuration(c.duration);
        c.durationUnit && setDurationUnit(c.durationUnit);
        c.currency && setCurrency(c.currency);
        c.stake && setStake(c.stake);
        typeof c.prediction === "number" && setPrediction(c.prediction);
        c.purchase && setPurchase(c.purchase);
        c.restartRule && setRestartRule(c.restartRule);
        c.startMsg && setStartMsg(c.startMsg);
        typeof c.lossLimit === "number" && setLossLimit(c.lossLimit);
        typeof c.targetProfit === "number" && setTargetProfit(c.targetProfit);
        typeof c.startStake === "number" && setStartStake(c.startStake);
        typeof c.stake2 === "number" && setStake2(c.stake2);
        setJournal((p) => [`[${new Date().toLocaleTimeString()}] Imported bot configuration`, ...p]);
      } catch { alert("Invalid bot file"); }
    };
    r.readAsText(f);
  };

  const fileRef = useRef<HTMLInputElement>(null);

  const contractOptions = CONTRACTS_BY_TYPE[tradeType] ?? ["Both"];
  const isDigits = tradeCat === "Digits";

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

      {/* Left icon rail + blocks menu */}
      <aside className="col-span-12 lg:col-span-3 flex gap-2">
        <div className="hidden lg:flex flex-col gap-1 pt-1">
          <RailBtn icon={RefreshCw} title="Reset workspace" onClick={clearAll} />
          <RailBtn icon={FolderOpen} title="Load" onClick={() => fileRef.current?.click()} />
          <RailBtn icon={Layers} title="Blocks" />
          <RailBtn icon={RotateCcw} title="Undo" />
          <RailBtn icon={RotateCw} title="Redo" />
          <RailBtn icon={ZoomIn} title="Zoom in" />
          <RailBtn icon={ZoomOut} title="Zoom out" />
        </div>
        <div className="flex-1 space-y-3">
          <button onClick={() => setQuickOpen(true)} className="w-full py-3 rounded-lg bg-blue-600 hover:bg-blue-500 font-semibold shadow-[0_6px_20px_rgba(37,99,235,0.35)]">
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
        </div>
      </aside>

      {/* Canvas */}
      <section className="col-span-12 lg:col-span-6">
        <div className="flex items-center gap-2 mb-3 lg:hidden">
          <ToolBtn icon={RotateCcw} title="Undo" />
          <ToolBtn icon={Upload} title="Import" onClick={() => fileRef.current?.click()} />
          <ToolBtn icon={Download} title="Export" onClick={exportBot} />
          <ToolBtn icon={Save} title="Save" onClick={() => { localStorage.setItem("digittool-bot", JSON.stringify(cfg())); setJournal((p) => [`[${new Date().toLocaleTimeString()}] Saved`, ...p]); }} />
          <ToolBtn icon={RotateCw} title="Redo" />
        </div>
        <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={(e) => e.target.files?.[0] && importBot(e.target.files[0])} />

        <div className="hidden lg:flex items-center gap-2 mb-3 justify-end">
          <ToolBtn icon={Upload} title="Import" onClick={() => fileRef.current?.click()} />
          <ToolBtn icon={Download} title="Export" onClick={exportBot} />
          <ToolBtn icon={Save} title="Save" onClick={() => { localStorage.setItem("digittool-bot", JSON.stringify(cfg())); setJournal((p) => [`[${new Date().toLocaleTimeString()}] Saved`, ...p]); }} />
        </div>

        <div className="relative min-h-[560px] rounded-xl bg-[#0d1220] border border-white/10 p-4 md:p-6 overflow-auto"
             style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)", backgroundSize: "20px 20px" }}>
          {/* Row: 1. Trade parameters + 2. Purchase conditions side by side */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
            <BlockGroup title="1. Trade parameters">
              <FieldRow label="Market">
                <Select value={marketCat} onChange={setMarketCat} options={MARKET_CATS} />
                <span className="text-white/50">›</span>
                <Select value={submarket} onChange={setSubmarket} options={SUBMARKETS[marketCat]} />
                <span className="text-white/50">›</span>
                <Select value={symbol} onChange={setSymbol} options={SYMBOLS[submarket] ?? []} />
              </FieldRow>
              <FieldRow label="Trade Type">
                <Select value={tradeCat} onChange={setTradeCat} options={TRADE_TYPE_CATS} />
                <span className="text-white/50">›</span>
                <Select value={tradeType} onChange={setTradeType} options={TRADE_TYPES[tradeCat] ?? []} />
              </FieldRow>
              <FieldRow label="Contract Type">
                <Select value={contract} onChange={setContract} options={contractOptions} />
              </FieldRow>
              <FieldRow label="Default Candle Interval">
                <Select value={interval} onChange={setIntervalV} options={INTERVALS} />
              </FieldRow>
              <label className="flex items-center gap-2 text-xs text-white/70 py-1 cursor-pointer">
                <input type="checkbox" checked={restartOnError} onChange={(e) => setRestartOnError(e.target.checked)} />
                Restart buy/sell on error (disable for better performance)
              </label>
              <label className="flex items-center gap-2 text-xs text-white/70 py-1 cursor-pointer">
                <input type="checkbox" checked={restartLast} onChange={(e) => setRestartLast(e.target.checked)} />
                Restart last trade on error (bot ignores the unsuccessful trade)
              </label>

              {/* Run once at start */}
              <div className="mt-3 border-t border-white/10 pt-3">
                <div className="text-xs font-semibold mb-2">Run once at start:</div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 flex-wrap text-xs bg-yellow-500/15 border border-yellow-500/30 rounded px-2 py-1.5 w-fit">
                    <span className="text-yellow-300 font-semibold">print</span>
                    <input
                      value={startMsg}
                      onChange={(e) => setStartMsg(e.target.value)}
                      className="bg-white/10 rounded px-2 py-0.5 text-white text-xs min-w-[220px]"
                    />
                  </div>
                  <VarRow name="Loss" value={lossLimit} onChange={setLossLimit} />
                  <VarRow name="Target Profit" value={targetProfit} onChange={setTargetProfit} />
                  <VarRow name="Stake" value={startStake} onChange={setStartStake} />
                  <VarRow name="stake 2" value={stake2} onChange={setStake2} />
                </div>
              </div>

              {/* Trade options */}
              <div className="mt-3 border-t border-white/10 pt-3">
                <div className="text-xs font-semibold mb-2">Trade options:</div>
                <div className="flex items-center flex-wrap gap-1.5 text-xs">
                  <span className="text-white/80">Duration:</span>
                  <Select value={durationUnit} onChange={setDurationUnit} options={["Ticks", "Seconds", "Minutes", "Hours"]} />
                  <NumInput value={duration} onChange={setDuration} min={1} />
                  <span className="text-white/80 ml-2">Stake:</span>
                  <Select value={currency} onChange={setCurrency} options={["USD", "KES", "EUR", "GBP", "AUD"]} />
                  <NumInput value={stake} onChange={setStake} min={0.35} step={0.5} />
                  {isDigits && (
                    <>
                      <span className="text-white/80 ml-2">Prediction:</span>
                      <NumInput value={prediction} onChange={(v) => setPrediction(Math.max(0, Math.min(9, Math.floor(v))))} min={0} step={1} />
                    </>
                  )}
                </div>
              </div>
            </BlockGroup>

            {/* 2. Purchase conditions (expandable) — beside Trade parameters */}
            <div className="mb-4">
              <button
                onClick={() => setPurchaseOpen((o) => !o)}
                className="w-full flex items-center justify-between gap-2 rounded-lg bg-gradient-to-r from-blue-700 to-blue-600 px-3 py-2 text-sm font-semibold"
              >
                <span className="inline-flex items-center gap-2">
                  {purchaseOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  2. Purchase conditions
                </span>
                <Plus className="w-4 h-4 opacity-70" />
              </button>
              {purchaseOpen && (
                <div className="bg-blue-900/40 border border-blue-500/40 border-t-0 rounded-b-lg p-3 space-y-1">
                  <FieldRow label="Purchase">
                    <Select value={purchase} onChange={setPurchase} options={PURCHASES} />
                  </FieldRow>
                  <div className="text-[11px] text-white/60">Bot will place a {purchase} order on {symbol}.</div>
                </div>
              )}
            </div>
          </div>


          <BlockGroup title="3. Sell conditions" side>
            <div className="text-xs text-white/80">if <span className="px-2 py-0.5 rounded bg-white/10">Sell is available</span> then</div>
            <div className="h-10" />
          </BlockGroup>

          {/* 4. Restart trading conditions — richer logic block preview */}
          <div className="mb-4 ml-auto max-w-md rounded-lg overflow-hidden border border-blue-500/40">
            <div className="bg-gradient-to-r from-blue-700 to-blue-600 px-3 py-2 text-sm font-semibold">4. Restart trading conditions</div>
            <div className="bg-blue-900/40 p-3 space-y-2 text-xs">
              <div className="text-white/80">if <Chip>Result is</Chip> <Chip>Good ≥</Chip> <Chip>Contract</Chip></div>
              <div className="pl-4">set <Chip>text</Chip> to <Chip>"Notify green"</Chip></div>
              <div className="pl-4">set <Chip>Stake</Chip> to <span className="text-white/60">{startStake}</span></div>
              <div className="text-white/80">else</div>
              <div className="pl-4">set <Chip>text1</Chip> to <Chip>"sorry we lost, absolute"</Chip></div>
              <div className="pl-4">Notify <Chip>yellow</Chip> · change <Chip>Stake</Chip></div>
              <div className="pl-4">set <Chip>text2</Chip> to <Chip>"Total Profit / Loss"</Chip></div>
              <div className="pl-4">Notify <Chip>blue</Chip> profit</div>
              <div className="border-t border-white/10 pt-2">
                <FieldRow label="Rule">
                  <Select value={restartRule} onChange={setRestartRule} options={["Trade again", "Stop bot", "Restart after loss", "Restart after win"]} />
                </FieldRow>
              </div>
            </div>
          </div>

          <button onClick={clearAll} title="Clear results"
            className="absolute bottom-4 right-4 w-10 h-10 rounded-full bg-red-500/20 hover:bg-red-500/30 grid place-items-center">
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
              <button key={t} onClick={() => setTab(t)}
                className={`px-4 py-2 ${tab === t ? "border-b-2 border-cyan-400 font-semibold" : "text-white/60"}`}>
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

      {/* Bottom sticky Run bar (mobile-friendly) */}
      <div className="col-span-12 sticky bottom-2 z-40 mt-2">
        <div className="rounded-2xl bg-[#0f1424]/95 backdrop-blur border border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.4)] flex items-center justify-between px-4 py-3">
          <button
            onClick={() => setBotState((s) => (s === "running" ? "stopped" : "running"))}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold text-sm ${
              botState === "running"
                ? "bg-red-500 hover:bg-red-400 text-white"
                : "bg-emerald-500 hover:bg-emerald-400 text-slate-900"
            }`}
          >
            {botState === "running" ? <><Square className="w-4 h-4" /> Stop</> : <><Play className="w-4 h-4" /> Run</>}
          </button>
          <div className="text-xs md:text-sm text-white/70">
            {botState === "running" ? (
              <span className="inline-flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Bot is running on {symbol}</span>
            ) : (
              <span className="inline-flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-white/40" /> Bot is not running</span>
            )}
          </div>
          <div className="hidden sm:block text-xs text-white/50">
            P/L <span className={`font-bold ${stats.pl >= 0 ? "text-emerald-400" : "text-red-400"}`}>{stats.pl.toFixed(2)} {currency}</span>
          </div>
        </div>
      </div>

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
function RailBtn({ icon: I, title, onClick }: { icon: any; title: string; onClick?: () => void }) {
  return (
    <button onClick={onClick} title={title} className="w-9 h-9 grid place-items-center rounded-lg text-white/60 hover:text-white hover:bg-white/10">
      <I className="w-4 h-4" />
    </button>
  );
}
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
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className="px-2 py-1 rounded bg-white/10 border border-white/10 text-xs focus:outline-none focus:border-cyan-400">
      {options.map((o) => <option key={o} value={o} className="bg-[#0f1424]">{o}</option>)}
    </select>
  );
}
function NumInput({ value, onChange, min, step = 1 }: { value: number; onChange: (v: number) => void; min?: number; step?: number }) {
  return (
    <input type="number" value={value} min={min} step={step} onChange={(e) => onChange(Number(e.target.value))}
      className="w-20 px-2 py-1 rounded bg-white/10 border border-white/10 text-xs focus:outline-none focus:border-cyan-400" />
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
function VarRow({ name, value, onChange }: { name: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-1.5 text-xs bg-blue-800/40 border border-blue-500/30 rounded px-2 py-1 w-fit">
      <span className="text-white/70">set</span>
      <span className="px-2 py-0.5 rounded bg-white/10 text-white font-semibold">{name}</span>
      <span className="text-white/70">to</span>
      <input type="number" value={value} onChange={(e) => onChange(Number(e.target.value))}
        className="w-24 px-2 py-0.5 rounded bg-white/10 text-white text-xs focus:outline-none focus:border-cyan-400 border border-transparent" />
    </div>
  );
}
function Chip({ children }: { children: React.ReactNode }) {
  return <span className="inline-block px-1.5 py-0.5 rounded bg-white/10 text-white/90 text-[11px]">{children}</span>;
}
