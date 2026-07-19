// Catalog of trading bots available in the Digittool Bots Store.
// Mirrors the categories seen on dollarprinter.com: Deriv contract-type bots
// (Rise/Fall, Even/Odd, Over/Under, Matches/Differs, Higher/Lower,
// Touch/No Touch, Accumulators, Multipliers, Turbos, Vanillas) plus the
// classic progression strategies (Martingale, D'Alembert, Oscar's Grind,
// 1-3-2-6, Reverse Martingale, Anti-Martingale, Fibonacci, Fixed Stake, LSS).

export type BotStrategy =
  | "martingale" | "dalembert" | "oscar" | "reverse-martingale"
  | "1326" | "anti-martingale" | "fibonacci" | "fixed" | "lss" | "cutler";

export type BotCategory =
  | "Rise/Fall" | "Even/Odd" | "Over/Under" | "Matches/Differs"
  | "Higher/Lower" | "Touch/No Touch" | "Accumulators" | "Multipliers"
  | "Turbos" | "Vanillas" | "Premium";

export type BotGroup = "Free Bots" | "Scalper Bots" | "SpeedBots";

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
  B500: "Boom 500 Index",
  B1000: "Boom 1000 Index",
  C500: "Crash 500 Index",
  C1000: "Crash 1000 Index",
  J25: "Jump 25 Index",
};

export const BOTS: CatalogBot[] = [
  // Rise / Fall
  { id: "rf-martingale-v75", name: "Rise/Fall Martingale — V75", category: "Rise/Fall", strategy: "martingale", market: M.V75, stake: 1, duration: "1 tick", description: "Classic martingale on Volatility 75. Doubles after each loss.", winrate: "68%", tag: "Hot" },
  { id: "rf-dalembert-v100", name: "Rise/Fall D'Alembert — V100", category: "Rise/Fall", strategy: "dalembert", market: M.V100, stake: 1, duration: "5 ticks", description: "Smooth D'Alembert progression on V100.", winrate: "61%" },
  { id: "rf-oscar-v50", name: "Rise/Fall Oscar's Grind — V50", category: "Rise/Fall", strategy: "oscar", market: M.V50, stake: 1, duration: "1 tick", description: "Slow, steady recovery of small losses.", winrate: "63%" },
  { id: "rf-reverse-v10", name: "Rise/Fall Reverse Martingale — V10", category: "Rise/Fall", strategy: "reverse-martingale", market: M.V10, stake: 0.5, duration: "1 tick", description: "Doubles after wins; reset on loss.", winrate: "57%" },

  // Even / Odd
  { id: "eo-martingale-v100", name: "Even/Odd Martingale — V100", category: "Even/Odd", strategy: "martingale", market: M.V100, stake: 1, duration: "1 tick", description: "Buys Even after 3 consecutive Odd digits.", winrate: "66%", tag: "Hot" },
  { id: "eo-antimg-v25", name: "Even/Odd Anti-Martingale — V25", category: "Even/Odd", strategy: "anti-martingale", market: M.V25, stake: 1, duration: "1 tick", description: "Compounds winning streaks on parity.", winrate: "59%" },
  { id: "eo-fibonacci-v75", name: "Even/Odd Fibonacci — V75", category: "Even/Odd", strategy: "fibonacci", market: M.V75, stake: 1, duration: "1 tick", description: "Fibonacci stake progression after losses.", winrate: "62%" },

  // Over / Under
  { id: "ou-under6-v100", name: "Digits Under 6 — V100", category: "Over/Under", strategy: "martingale", market: M.V100, stake: 1, duration: "1 tick", description: "Trades Under 6 with martingale recovery.", winrate: "70%", tag: "Pro" },
  { id: "ou-over3-v10", name: "Digits Over 3 — V10", category: "Over/Under", strategy: "dalembert", market: M.V10, stake: 1, duration: "1 tick", description: "Over 3 with D'Alembert on 1-second index.", winrate: "67%" },
  { id: "ou-under5-v25", name: "Digits Under 5 — V25", category: "Over/Under", strategy: "fixed", market: M.V25, stake: 2, duration: "1 tick", description: "Fixed stake Under 5 sniper.", winrate: "58%" },

  // Matches / Differs
  { id: "md-differs-v50", name: "Differs Sniper — V50", category: "Matches/Differs", strategy: "1326", market: M.V50, stake: 1, duration: "1 tick", description: "Targets the least frequent digit with 1-3-2-6 progression.", winrate: "72%", tag: "Hot" },
  { id: "md-matches-v75", name: "Matches Hunter — V75", category: "Matches/Differs", strategy: "martingale", market: M.V75, stake: 1, duration: "1 tick", description: "Buys Matches on the most frequent last digit.", winrate: "55%" },

  // Higher / Lower
  { id: "hl-lss-v100", name: "Higher/Lower LSS — V100", category: "Higher/Lower", strategy: "lss", market: M.V100, stake: 2, duration: "5 ticks", description: "Level Stake System on barrier trades.", winrate: "60%" },
  { id: "hl-oscar-b500", name: "Higher/Lower Oscar — Boom 500", category: "Higher/Lower", strategy: "oscar", market: M.B500, stake: 1, duration: "5 ticks", description: "Oscar's Grind on Boom 500 spikes.", winrate: "64%" },

  // Touch / No Touch
  { id: "tn-notouch-c1000", name: "No Touch — Crash 1000", category: "Touch/No Touch", strategy: "fixed", market: M.C1000, stake: 5, duration: "1 minute", description: "Fixed stake No-Touch during quiet ranges.", winrate: "69%", tag: "Pro" },
  { id: "tn-touch-b1000", name: "Touch — Boom 1000", category: "Touch/No Touch", strategy: "martingale", market: M.B1000, stake: 2, duration: "1 minute", description: "Touch trades ahead of Boom 1000 spikes.", winrate: "58%" },

  // Accumulators
  { id: "acc-slow-v75", name: "Accumulator Slow — V75", category: "Accumulators", strategy: "fixed", market: M.V75, stake: 10, duration: "growth 1%", description: "Low-growth accumulator with take-profit.", winrate: "74%", tag: "New" },
  { id: "acc-fast-v100", name: "Accumulator Fast — V100", category: "Accumulators", strategy: "fixed", market: M.V100, stake: 10, duration: "growth 5%", description: "High-growth accumulator for aggressive traders.", winrate: "51%" },

  // Multipliers
  { id: "mul-x100-v10", name: "Multiplier x100 — V10", category: "Multipliers", strategy: "fixed", market: M.V10, stake: 5, duration: "open", description: "x100 multiplier with trailing stop.", winrate: "56%" },
  { id: "mul-x500-v25", name: "Multiplier x500 — V25", category: "Multipliers", strategy: "fixed", market: M.V25, stake: 2, duration: "open", description: "High-leverage x500 with tight stop-loss.", winrate: "49%" },

  // Turbos & Vanillas
  { id: "turbo-up-v75", name: "Turbo Long — V75", category: "Turbos", strategy: "fixed", market: M.V75, stake: 3, duration: "5 minutes", description: "Turbo up with fixed stake and payout target.", winrate: "60%" },
  { id: "van-call-v100", name: "Vanilla Call — V100", category: "Vanillas", strategy: "fixed", market: M.V100, stake: 5, duration: "15 minutes", description: "Vanilla call on strong upward momentum.", winrate: "62%" },

  // Premium (dollarprinter.com free/scalper/speed bots — all premium, all "Load Premium Bot")
  // Free Bots
  { id: "prem-alpha-2026", name: "Alpha Version 2026 Edition", category: "Premium", strategy: "1326", market: M.V100, stake: 1, duration: "1 tick", description: "Alpha Version 2026 Edition — Premium trading bot with cutting-edge 2026 algorithms. Features advanced market analysis and automated execution for consistent profits.", winrate: "78%", premium: true, group: "Free Bots", tag: "Pro" },
  { id: "prem-ai-signal-scanner", name: "AI SIGNAL SCANNER", category: "Premium", strategy: "1326", market: M.V75, stake: 1, duration: "1 tick", description: "AI Signal Scanner — Intelligent market scanner that detects high-probability setups and automates trade execution with built-in risk controls.", winrate: "82%", premium: true, group: "Free Bots", tag: "Hot" },
  { id: "prem-binary-expert-v6", name: "Binary Expert V6 pro", category: "Premium", strategy: "martingale", market: M.V100, stake: 1, duration: "1 tick", description: "Binary Expert V6 Pro — Professional-grade binary trading bot. Advanced version 6 with expert-level strategies and high-accuracy signal processing.", winrate: "75%", premium: true, group: "Free Bots" },
  { id: "prem-dp-bot11", name: "DOLLAR PRINTER BOT11", category: "Premium", strategy: "dalembert", market: M.V50, stake: 1, duration: "1 tick", description: "Professional Dollar Printer bot version 11. Advanced automated trading system designed for consistent profits with intelligent risk management.", winrate: "73%", premium: true, group: "Free Bots" },
  { id: "prem-dp-ai-2026", name: "Dollar Print Ai Version 2026", category: "Premium", strategy: "1326", market: M.V75, stake: 1, duration: "1 tick", description: "AI-powered Dollar Print trading bot 2026 Edition. Features machine learning algorithms for optimal entry and exit points with automated profit taking.", winrate: "79%", premium: true, group: "Free Bots", tag: "New" },
  { id: "prem-dp-entry-v1", name: "Dp Entry point Bot V1", category: "Premium", strategy: "oscar", market: M.V25, stake: 1, duration: "1 tick", description: "Entry Point Bot V1 — Smart entry detection system. Identifies optimal trading opportunities with precision timing and risk management.", winrate: "71%", premium: true, group: "Free Bots" },
  { id: "prem-expert-speed-v1", name: "Expert Speed Bot V1 2026", category: "Premium", strategy: "martingale", market: M.V100, stake: 1, duration: "1 tick", description: "Expert Speed Bot V1 2026 — Next-generation high-speed execution bot. Optimized for rapid trades with 2026 advanced profit strategies and smart risk.", winrate: "80%", premium: true, group: "SpeedBots", tag: "Hot" },
  { id: "prem-maziwa-2026", name: "Maziwa Bot 2026 Version", category: "Premium", strategy: "fibonacci", market: M.V75, stake: 1, duration: "1 tick", description: "Maziwa Bot 2026 Version — Powerful and reliable automated trading bot. Built for consistent market performance with intelligent entry and exit management.", winrate: "76%", premium: true, group: "Free Bots" },
  { id: "prem-signalsniper", name: "SignalSniper AutoBot (1)", category: "Premium", strategy: "1326", market: M.V100, stake: 1, duration: "1 tick", description: "Signal Sniper AutoBot — Automated signal detection and execution. Captures trading opportunities instantly with intelligent pattern recognition.", winrate: "77%", premium: true, group: "Free Bots", tag: "Hot" },

  // Scalper Bots — 1-tick scalper bots with martingale recovery, TP/SL, and volatility switching.
  { id: "scalp-even",       name: "Even Scalper",          category: "Premium", strategy: "martingale", market: M.V100, stake: 1, duration: "1 tick", description: "High-speed even-digit scalper. Trades every tick on volatility indices with martingale recovery.", winrate: "72%", premium: true, group: "Scalper Bots", tag: "Hot" },
  { id: "scalp-odd",        name: "Odd Scalper",           category: "Premium", strategy: "martingale", market: M.V100, stake: 1, duration: "1 tick", description: "High-speed odd-digit scalper. Trades every tick on volatility indices with martingale recovery.", winrate: "71%", premium: true, group: "Scalper Bots" },
  { id: "scalp-even-multi", name: "Even Multiple Scalper", category: "Premium", strategy: "martingale", market: M.V75,  stake: 1, duration: "1 tick", description: "Multi-market even scalper with volatility switching and 1-tick execution speed.", winrate: "70%", premium: true, group: "Scalper Bots" },
  { id: "scalp-odd-multi",  name: "Odd Multiple Scalper",  category: "Premium", strategy: "martingale", market: M.V75,  stake: 1, duration: "1 tick", description: "Multi-market odd scalper with volatility switching and 1-tick execution speed.", winrate: "70%", premium: true, group: "Scalper Bots" },
  { id: "scalp-over2",      name: "Over 2 Scalper",        category: "Premium", strategy: "martingale", market: M.V10,  stake: 1, duration: "1 tick", description: "Over 2 scalper built for 1HZ10V with fast tick entries and smart recovery logic.", winrate: "74%", premium: true, group: "Scalper Bots", tag: "Pro" },
  { id: "scalp-over4",      name: "Over 4 Scalper",        category: "Premium", strategy: "martingale", market: M.V25,  stake: 1, duration: "1 tick", description: "Over 4 scalper optimized for rapid over trades with TP/SL and martingale support.", winrate: "68%", premium: true, group: "Scalper Bots" },
  { id: "scalp-under5",     name: "Under 5 Scalper",       category: "Premium", strategy: "martingale", market: M.V50,  stake: 1, duration: "1 tick", description: "Under 5 scalper for fast under-digit entries on synthetic volatility markets.", winrate: "73%", premium: true, group: "Scalper Bots" },
  { id: "scalp-under7",     name: "Under 7 Scalper",       category: "Premium", strategy: "martingale", market: M.V75,  stake: 1, duration: "1 tick", description: "Under 7 scalper with 1-tick speed, market switching, and loss recovery controls.", winrate: "75%", premium: true, group: "Scalper Bots", tag: "Hot" },
  { id: "scalp-rise",       name: "Rise Scalper",          category: "Premium", strategy: "martingale", market: M.V100, stake: 1, duration: "1 tick", description: "Rise scalper for quick directional entries across volatility indices every tick.", winrate: "66%", premium: true, group: "Scalper Bots" },
  { id: "scalp-fall",       name: "Fall Scalper",          category: "Premium", strategy: "martingale", market: M.V100, stake: 1, duration: "1 tick", description: "Fall scalper for quick directional entries across volatility indices every tick.", winrate: "66%", premium: true, group: "Scalper Bots" },

  // SpeedBots — Matches / Diffbot / Hyperbot / SpeedBot family
  { id: "speed-matches-gc", name: "Matches Game Changer",  category: "Premium", strategy: "1326",       market: M.V75,  stake: 1, duration: "1 tick", description: "Matches Game Changer — Trade most or least appearing digits with alternating mode, entry-point conditions, TP/SL, and multi-market support.", winrate: "79%", premium: true, group: "SpeedBots", tag: "Hot" },
  { id: "speed-diffbot",    name: "Diffbot",               category: "Premium", strategy: "1326",       market: M.V50,  stake: 1, duration: "1 tick", description: "Diffbot — Differs-focused speed bot that targets least-appearing digits across Volatility and Jump indices.", winrate: "74%", premium: true, group: "SpeedBots" },
  { id: "speed-hyperbot",   name: "Hyperbot",              category: "Premium", strategy: "martingale", market: M.V100, stake: 1, duration: "1 tick", description: "Hyperbot — Ultra-fast execution engine with predictive digit selection and adaptive stake scaling.", winrate: "76%", premium: true, group: "SpeedBots", tag: "Pro" },
  { id: "speed-speedbot",   name: "SpeedBot",              category: "Premium", strategy: "dalembert",  market: M.V25,  stake: 1, duration: "1 tick", description: "SpeedBot — Baseline high-speed trading engine with configurable stake, take profit, and stop loss.", winrate: "72%", premium: true, group: "SpeedBots" },
  { id: "speed-turbobot",   name: "TurboBot",              category: "Premium", strategy: "martingale", market: M.V75,  stake: 1, duration: "1 tick", description: "TurboBot — Turbo-charged execution with alternating digit modes and instant recovery.", winrate: "73%", premium: true, group: "SpeedBots" },
  { id: "speed-quantum",    name: "Quantum Speed Bot",     category: "Premium", strategy: "1326",       market: M.V100, stake: 1, duration: "1 tick", description: "Quantum Speed Bot — Quantum-inspired predictive engine for ultra-fast digit trades.", winrate: "77%", premium: true, group: "SpeedBots", tag: "New" },

  // Additional Free Bots imported from dollarprinter.com trading bots section
  { id: "prem-golden-eagle", name: "Golden Eagle Pro 2026", category: "Premium", strategy: "1326", market: M.V100, stake: 1, duration: "1 tick", description: "Golden Eagle Pro 2026 — Premium eagle-eye trading bot with sharp signal detection and precision entries across all volatility indices.", winrate: "81%", premium: true, group: "Free Bots", tag: "Pro" },
  { id: "prem-money-maker", name: "Money Maker Elite",     category: "Premium", strategy: "martingale", market: M.V75, stake: 1, duration: "1 tick", description: "Money Maker Elite — Elite-tier automated trading bot engineered for consistent profit generation with adaptive risk controls.", winrate: "74%", premium: true, group: "Free Bots" },
  { id: "prem-neo-trader",  name: "Neo Trader X",          category: "Premium", strategy: "dalembert", market: M.V50, stake: 1, duration: "1 tick", description: "Neo Trader X — Next-gen neural trading bot with reinforcement-learning inspired stake progression.", winrate: "76%", premium: true, group: "Free Bots", tag: "New" },
  { id: "prem-sniper-x",    name: "Sniper X Pro",          category: "Premium", strategy: "oscar", market: M.V25, stake: 1, duration: "1 tick", description: "Sniper X Pro — Precision sniper bot that waits for high-probability setups then fires with tight risk management.", winrate: "78%", premium: true, group: "Free Bots" },
  { id: "prem-cashflow",    name: "CashFlow Bot 2026",     category: "Premium", strategy: "fibonacci", market: M.V10, stake: 1, duration: "1 tick", description: "CashFlow Bot 2026 — Steady cashflow engine with Fibonacci recovery and daily take-profit locks.", winrate: "72%", premium: true, group: "Free Bots" },

  // Additional Scalper Bots
  { id: "scalp-matches",    name: "Matches Scalper",       category: "Premium", strategy: "1326",       market: M.V75,  stake: 1, duration: "1 tick", description: "Matches Scalper — 1-tick matches sniper targeting the most frequent last digit with recovery.", winrate: "70%", premium: true, group: "Scalper Bots" },
  { id: "scalp-differs",    name: "Differs Scalper",       category: "Premium", strategy: "1326",       market: M.V50,  stake: 1, duration: "1 tick", description: "Differs Scalper — 1-tick differs sniper aimed at the least frequent last digit.", winrate: "76%", premium: true, group: "Scalper Bots", tag: "Pro" },
  { id: "scalp-higher",     name: "Higher Scalper",        category: "Premium", strategy: "martingale", market: M.V100, stake: 1, duration: "5 ticks", description: "Higher Scalper — Barrier scalper for quick higher entries with martingale recovery.", winrate: "68%", premium: true, group: "Scalper Bots" },
  { id: "scalp-lower",      name: "Lower Scalper",         category: "Premium", strategy: "martingale", market: M.V100, stake: 1, duration: "5 ticks", description: "Lower Scalper — Barrier scalper for quick lower entries with martingale recovery.", winrate: "68%", premium: true, group: "Scalper Bots" },
];

export const CATEGORIES: BotCategory[] = [
  "Rise/Fall", "Even/Odd", "Over/Under", "Matches/Differs",
  "Higher/Lower", "Touch/No Touch", "Accumulators", "Multipliers",
  "Turbos", "Vanillas", "Premium",
];

export const LOAD_KEY = "digittool.pendingBot";
