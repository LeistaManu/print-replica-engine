// Catalog of premium trading bots — mirrors dollarprinter.com Trading Bots
// section (Alpha Version 2026 Edition → CashFlow Bot 2026). All entries are
// premium "Load Premium Bot" cards.

export type BotStrategy =
  | "martingale" | "dalembert" | "oscar" | "reverse-martingale"
  | "1326" | "anti-martingale" | "fibonacci" | "fixed" | "lss" | "cutler";

export type BotCategory = "Premium";
export type BotGroup = "Free Bots";

export interface CatalogBot {
  id: string;
  name: string;
  category: BotCategory;
  strategy: BotStrategy;
  market: string;
  stake: number;
  duration: string;
  description: string;
  winrate: string;
  premium?: boolean;
  group?: BotGroup;
  tag?: "New" | "Hot" | "Pro" | "Free";
}

const M = {
  V10: "Volatility 10 (1s) Index",
  V25: "Volatility 25 Index",
  V50: "Volatility 50 Index",
  V75: "Volatility 75 Index",
  V100: "Volatility 100 Index",
};

export const BOTS: CatalogBot[] = [
  { id: "prem-alpha-2026", name: "Alpha Version 2026 Edition", category: "Premium", strategy: "1326", market: M.V100, stake: 1, duration: "1 tick", description: "Alpha Version 2026 Edition — Premium trading bot with cutting-edge 2026 algorithms. Advanced market analysis and automated execution for consistent profits.", winrate: "78%", premium: true, group: "Free Bots", tag: "Pro" },
  { id: "prem-ai-signal-scanner", name: "AI SIGNAL SCANNER", category: "Premium", strategy: "1326", market: M.V75, stake: 1, duration: "1 tick", description: "AI Signal Scanner — Intelligent market scanner that detects high-probability setups and automates trade execution with built-in risk controls.", winrate: "82%", premium: true, group: "Free Bots", tag: "Hot" },
  { id: "prem-binary-expert-v6", name: "Binary Expert V6 Pro", category: "Premium", strategy: "martingale", market: M.V100, stake: 1, duration: "1 tick", description: "Binary Expert V6 Pro — Professional-grade binary trading bot. Advanced v6 with expert-level strategies and high-accuracy signal processing.", winrate: "75%", premium: true, group: "Free Bots" },
  { id: "prem-dp-bot11", name: "DOLLAR PRINTER BOT11", category: "Premium", strategy: "dalembert", market: M.V50, stake: 1, duration: "1 tick", description: "Professional Dollar Printer bot version 11. Advanced automated trading system designed for consistent profits with intelligent risk management.", winrate: "73%", premium: true, group: "Free Bots" },
  { id: "prem-dp-ai-2026", name: "Dollar Print Ai Version 2026", category: "Premium", strategy: "1326", market: M.V75, stake: 1, duration: "1 tick", description: "AI-powered Dollar Print trading bot 2026 Edition. Machine-learning-inspired entries and exits with automated profit taking.", winrate: "79%", premium: true, group: "Free Bots", tag: "New" },
  { id: "prem-dp-entry-v1", name: "Dp Entry Point Bot V1", category: "Premium", strategy: "oscar", market: M.V25, stake: 1, duration: "1 tick", description: "Entry Point Bot V1 — Smart entry detection system. Identifies optimal trading opportunities with precision timing and risk management.", winrate: "71%", premium: true, group: "Free Bots" },
  { id: "prem-expert-speed-v1", name: "Expert Speed Bot V1 2026", category: "Premium", strategy: "martingale", market: M.V100, stake: 1, duration: "1 tick", description: "Expert Speed Bot V1 2026 — Next-generation high-speed execution bot. Optimized for rapid trades with 2026 advanced profit strategies.", winrate: "80%", premium: true, group: "Free Bots", tag: "Hot" },
  { id: "prem-maziwa-2026", name: "Maziwa Bot 2026 Version", category: "Premium", strategy: "fibonacci", market: M.V75, stake: 1, duration: "1 tick", description: "Maziwa Bot 2026 Version — Powerful and reliable automated trading bot. Built for consistent performance with intelligent entry and exit management.", winrate: "76%", premium: true, group: "Free Bots" },
  { id: "prem-signalsniper", name: "SignalSniper AutoBot", category: "Premium", strategy: "1326", market: M.V100, stake: 1, duration: "1 tick", description: "Signal Sniper AutoBot — Automated signal detection and execution. Captures trading opportunities instantly with intelligent pattern recognition.", winrate: "77%", premium: true, group: "Free Bots", tag: "Hot" },
  { id: "prem-golden-eagle", name: "Golden Eagle Pro 2026", category: "Premium", strategy: "1326", market: M.V100, stake: 1, duration: "1 tick", description: "Golden Eagle Pro 2026 — Premium eagle-eye trading bot with sharp signal detection and precision entries across all volatility indices.", winrate: "81%", premium: true, group: "Free Bots", tag: "Pro" },
  { id: "prem-money-maker", name: "Money Maker Elite", category: "Premium", strategy: "martingale", market: M.V75, stake: 1, duration: "1 tick", description: "Money Maker Elite — Elite-tier automated trading bot engineered for consistent profit generation with adaptive risk controls.", winrate: "74%", premium: true, group: "Free Bots" },
  { id: "prem-neo-trader", name: "Neo Trader X", category: "Premium", strategy: "dalembert", market: M.V50, stake: 1, duration: "1 tick", description: "Neo Trader X — Next-gen neural trading bot with reinforcement-learning inspired stake progression.", winrate: "76%", premium: true, group: "Free Bots", tag: "New" },
  { id: "prem-sniper-x", name: "Sniper X Pro", category: "Premium", strategy: "oscar", market: M.V25, stake: 1, duration: "1 tick", description: "Sniper X Pro — Precision sniper bot that waits for high-probability setups then fires with tight risk management.", winrate: "78%", premium: true, group: "Free Bots" },
  { id: "prem-cashflow", name: "CashFlow Bot 2026", category: "Premium", strategy: "fibonacci", market: M.V10, stake: 1, duration: "1 tick", description: "CashFlow Bot 2026 — Steady cashflow engine with Fibonacci recovery and daily take-profit locks.", winrate: "72%", premium: true, group: "Free Bots" },
];

export const CATEGORIES: BotCategory[] = ["Premium"];
export const LOAD_KEY = "digittool.pendingBot";
