import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef } from "react";

export const Route = createFileRoute("/app/trading-view")({
  head: () => ({ meta: [{ title: "TradingView — Digittool" }] }),
  component: TradingViewPage,
});

function TradingViewPage() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    ref.current.innerHTML = "";
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.async = true;
    script.type = "text/javascript";
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: "OANDA:XAUUSD",
      interval: "1",
      timezone: "Etc/UTC",
      theme: "dark",
      style: "1",
      locale: "en",
      enable_publishing: false,
      allow_symbol_change: true,
      calendar: false,
      studies: ["STD;RSI", "STD;MACD", "STD;Bollinger_Bands"],
      support_host: "https://www.tradingview.com",
    });
    ref.current.appendChild(script);
  }, []);
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">TradingView</h1>
        <span className="text-xs text-white/50">Live streaming charts powered by TradingView</span>
      </div>
      <div className="rounded-xl overflow-hidden border border-white/10 bg-[#0d1220]" style={{ height: "78vh" }}>
        <div ref={ref} className="tradingview-widget-container w-full h-full" />
      </div>
    </div>
  );
}
