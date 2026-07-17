import { createFileRoute } from "@tanstack/react-router";
import { Play, Square, Plus, RefreshCw, Eye, EyeOff, Trash2, PlayCircle, BookOpen } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/app/copy-trading")({
  head: () => ({ meta: [{ title: "Copy Trading — Digittool" }] }),
  component: CopyTrading,
});

type Token = { id: string; token: string; account: "Real" | "Demo"; label?: string };

function mask(t: string) {
  if (!t) return "";
  return "*".repeat(Math.min(t.length, 6));
}

function CopyTrading() {
  const [tokens, setTokens] = useState<Token[]>([
    { id: "1", token: "abc123xyz", account: "Real", label: "Master" },
  ]);
  const [input, setInput] = useState("");
  const [account, setAccount] = useState<"Real" | "Demo">("Real");
  const [running, setRunning] = useState(false);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [journal, setJournal] = useState<string[]>([]);

  function add() {
    const v = input.trim();
    if (!v) return;
    setTokens((t) => [...t, { id: crypto.randomUUID(), token: v, account }]);
    setInput("");
    setJournal((j) => [`[${new Date().toLocaleTimeString()}] Added ${account} token ${mask(v)}`, ...j]);
  }
  function remove(id: string) {
    setTokens((t) => t.filter((x) => x.id !== id));
  }
  function sync() {
    setJournal((j) => [`[${new Date().toLocaleTimeString()}] Synced ${tokens.length} account(s)`, ...j]);
  }
  function toggleRun() {
    setRunning((r) => !r);
    setJournal((j) => [
      `[${new Date().toLocaleTimeString()}] Copy trading ${!running ? "started" : "stopped"}`,
      ...j,
    ]);
  }

  return (
    <div className="space-y-4">
      {/* Header row: Copy trading badge + Tutorial + Run panel */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded bg-emerald-500 text-slate-900 font-bold text-sm">Copy Trading</span>
          <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-white/5 border border-white/10 text-sm hover:bg-white/10">
            <BookOpen className="w-4 h-4 text-cyan-400" /> Tutorial
          </button>
        </div>

        <div className="flex items-center gap-0 rounded-lg overflow-hidden border border-white/10">
          <button
            onClick={toggleRun}
            className={`px-6 py-2.5 font-bold inline-flex items-center gap-2 ${
              running ? "bg-red-500 hover:bg-red-400 text-white" : "bg-emerald-500 hover:bg-emerald-400 text-slate-900"
            }`}
          >
            {running ? <><Square className="w-4 h-4" /> Stop</> : <><Play className="w-4 h-4" /> Run</>}
          </button>
          <div className="px-6 py-2.5 bg-white text-slate-900 font-semibold text-sm min-w-[200px] text-center">
            {running ? "Bot is running…" : "Bot is not running"}
          </div>
        </div>
      </div>

      {/* Master token row */}
      <div className="rounded-lg bg-white/5 border border-white/10 p-3 flex items-center justify-end">
        <span className="text-white/70 font-mono tracking-widest">******</span>
      </div>

      {/* Add token row */}
      <div className="rounded-lg bg-white/5 border border-white/10 p-3 flex items-center gap-3 flex-wrap">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="token (PAT, trade scope)"
          className="flex-1 min-w-[220px] bg-transparent outline-none px-2 py-1.5 text-sm text-white placeholder:text-white/40"
        />
        <select
          value={account}
          onChange={(e) => setAccount(e.target.value as "Real" | "Demo")}
          className="bg-[#0f1424] border border-white/10 rounded px-3 py-1.5 text-sm"
        >
          <option value="Real">Real</option>
          <option value="Demo">Demo</option>
        </select>
        <button onClick={add} className="px-4 py-1.5 rounded bg-blue-500 hover:bg-blue-400 text-white text-sm font-semibold inline-flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> Add
        </button>
        <button onClick={sync} className="px-4 py-1.5 rounded bg-white/10 hover:bg-white/20 text-white text-sm font-semibold inline-flex items-center gap-1.5">
          <RefreshCw className="w-4 h-4" /> Sync
        </button>
      </div>

      {/* Tokens list */}
      <div className="rounded-lg bg-white/5 border border-white/10 divide-y divide-white/5">
        {tokens.length === 0 && (
          <div className="p-6 text-center text-white/50 text-sm">No copier tokens added yet.</div>
        )}
        {tokens.map((t) => (
          <div key={t.id} className="p-3 flex items-center gap-3 text-sm">
            <PlayCircle className="w-5 h-5 text-cyan-400" />
            <div className="flex-1 font-mono">{revealed[t.id] ? t.token : mask(t.token)}</div>
            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${t.account === "Real" ? "bg-emerald-500/20 text-emerald-300" : "bg-yellow-500/20 text-yellow-300"}`}>
              {t.account}
            </span>
            <button onClick={() => setRevealed((r) => ({ ...r, [t.id]: !r[t.id] }))} className="p-1.5 rounded hover:bg-white/10">
              {revealed[t.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
            <button onClick={() => remove(t.id)} className="p-1.5 rounded hover:bg-red-500/20 text-red-400">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Journal */}
      <div className="rounded-lg bg-white/5 border border-white/10 p-4">
        <div className="text-sm font-semibold mb-2 text-white/80">Journal</div>
        <div className="space-y-1 text-xs font-mono text-white/60 max-h-48 overflow-auto">
          {journal.length === 0 ? <div className="text-white/40">No activity yet.</div> : journal.map((l, i) => <div key={i}>{l}</div>)}
        </div>
      </div>

      <p className="text-[11px] text-white/40">
        Add a Deriv API token with <b>Trade</b> scope for each copier account. When the master account trades, the same
        trade will be mirrored on every synced copier account.
      </p>
    </div>
  );
}
