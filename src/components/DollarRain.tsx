import { useEffect, useState } from "react";

const bills = Array.from({ length: 24 }, (_, index) => ({
  left: (index * 37 + 11) % 100,
  delay: ((index * 17) % 12) / 10,
  duration: 3 + ((index * 23) % 30) / 10,
  size: 22 + ((index * 19) % 26),
}));

export function DollarRain({ duration = 1600 }: { duration?: number }) {
  const [show, setShow] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setShow(false), duration);
    return () => clearTimeout(t);
  }, [duration]);
  if (!show) return null;
  return (
    <div className="fixed inset-0 z-[100] pointer-events-none overflow-hidden bg-[#0a0e1a]/70 backdrop-blur-sm">
      {bills.map((bill, i) => {
        return (
          <span
            key={i}
            className="absolute animate-dollar-fall select-none"
            style={{
              left: `${bill.left}%`,
              top: "-40px",
              fontSize: `${bill.size}px`,
              animationDelay: `${bill.delay}s`,
              animationDuration: `${bill.duration}s`,
              filter: "drop-shadow(0 4px 12px rgba(16,185,129,0.5))",
            }}
          >
            💵
          </span>
        );
      })}
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto rounded-full border-4 border-emerald-400/30 border-t-emerald-400 animate-spin-slow" />
          <div className="mt-4 font-black text-2xl bg-gradient-to-r from-emerald-300 to-cyan-300 bg-clip-text text-transparent">
            Loading Digittool…
          </div>
        </div>
      </div>
    </div>
  );
}