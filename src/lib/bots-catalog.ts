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

  // Premium
  { id: "prem-ai-signals", name: "Xenon AI Signals Bot", category: "Premium", strategy: "1326", market: M.V100, stake: 1, duration: "1 tick", description: "Uses AI digit-signal feed to enter Over/Under & Matches trades.", winrate: "78%", premium: true, tag: "Pro" },
  { id: "prem-scalper", name: "Gemini Tick Scalper", category: "Premium", strategy: "oscar", market: M.V10, stake: 1, duration: "1 tick", description: "Scalps 1-second index ticks with adaptive stake sizing.", winrate: "71%", premium: true, tag: "Hot" },
  { id: "prem-safe", name: "Safe Compounder Pro", category: "Premium", strategy: "dalembert", market: M.V25, stake: 1, duration: "5 ticks", description: "Capital-preservation compounder with drawdown guard.", winrate: "68%", premium: true },
];

export const CATEGORIES: BotCategory[] = [
  "Rise/Fall", "Even/Odd", "Over/Under", "Matches/Differs",
  "Higher/Lower", "Touch/No Touch", "Accumulators", "Multipliers",
  "Turbos", "Vanillas", "Premium",
];

export const LOAD_KEY = "digittool.pendingBot";
