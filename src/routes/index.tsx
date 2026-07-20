import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Zap, Check, Star, Bot, BarChart3, Users, Shield, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { handleLogin, handleSignup } from "@/lib/deriv";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Digittool — Trade with better tools" },
      { name: "description", content: "Professional-grade charts, risk controls, and lightning-fast execution built for serious traders." },
      { property: "og:title", content: "Digittool — Trade with better tools" },
      { property: "og:description", content: "Professional-grade charts, risk controls, and lightning-fast execution built for serious traders." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LandingPage,
});

const testimonials = [
  { initials: "MG", name: "Mark Gonzales", role: "Professional Day Trader", stars: 5, quote: "Digittool transformed my trading. The automated bots handle my strategies flawlessly, and I've seen consistent profits." },
  { initials: "KM", name: "Kelvin Maxwell", role: "Crypto Investor", stars: 5, quote: "Copy trading is incredible! I follow top performers and my portfolio has grown steadily over the past few months." },
  { initials: "DG", name: "Delvoux Glen", role: "Forex Specialist", stars: 5, quote: "Lightning-fast execution and professional-grade tools. The risk management features saved me from major losses." },
  { initials: "AK", name: "Aisha Khan", role: "Algorithmic Trader", stars: 5, quote: "The strategy builder let me automate my setups without writing code, and backtests lined up closely with live results." },
  { initials: "JO", name: "James Okoro", role: "Independent Trader", stars: 5, quote: "Having bots and copy trading in one dashboard saves me hours every week. Withdrawals have always been smooth." },
  { initials: "SL", name: "Sophie Laurent", role: "Options Trader", stars: 5, quote: "The mobile experience is excellent. I can check signals, adjust risk settings, and monitor my bots from anywhere." },
];

const stats = [
  { value: "50K+", label: "Active Traders" },
  { value: "$2.5B+", label: "Volume Traded" },
  { value: "99.9%", label: "Uptime" },
  { value: "150+", label: "Markets" },
];

const features = [
  { icon: Bot, emoji: "🤖", title: "AI-Powered Trading Bots", tagline: "Automate Your Success", desc: "Deploy intelligent trading strategies with our advanced bot system. No coding required — configure, test, and let the bots work 24/7." },
  { icon: BarChart3, emoji: "📊", title: "Real-Time Market Analysis", tagline: "Data-Driven Decisions", desc: "Access professional-grade charts, indicators, and analytics. Track market trends, identify opportunities, and execute with confidence." },
  { icon: Users, emoji: "📄", title: "Copy Trading Network", tagline: "Follow Top Performers", desc: "Mirror successful traders automatically. Transparent performance metrics, full control over your capital, and instant execution." },
  { icon: Shield, emoji: "🛡️", title: "Risk Management Tools", tagline: "Protect Your Capital", desc: "Advanced stop-loss, take-profit, and position sizing tools. Set your risk parameters and trade with peace of mind." },
];

const whyChoose = [
  "Bank-grade security with encrypted sessions",
  "Lightning-fast execution under 50ms",
  "Virtual account for risk-free testing",
  "24/7 customer support and trading resources",
  "Multi-asset trading across forex, crypto, and indices",
  "Mobile-friendly workspace for trading on the go",
];

const typewriterPhrases = ["Digittool", "smarter trading", "automated bots", "your edge"];

function useTypewriter(words: string[]) {
  const [text, setText] = useState("");
  const [wi, setWi] = useState(0);
  const [deleting, setDeleting] = useState(false);
  useEffect(() => {
    const word = words[wi % words.length];
    const speed = deleting ? 55 : 110;
    const t = setTimeout(() => {
      if (!deleting) {
        const next = word.slice(0, text.length + 1);
        setText(next);
        if (next === word) setTimeout(() => setDeleting(true), 1400);
      } else {
        const next = word.slice(0, text.length - 1);
        setText(next);
        if (next === "") { setDeleting(false); setWi((i) => i + 1); }
      }
    }, speed);
    return () => clearTimeout(t);
  }, [text, deleting, wi, words]);
  return text;
}

function LandingPage() {
  const typed = useTypewriter(typewriterPhrases);
  const loop = [...testimonials, ...testimonials];
  return (
    <div className="min-h-screen animate-page-in overflow-x-hidden">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-5 md:px-12">
        <div className="text-2xl font-bold font-display animate-fade-up">
          <span className="text-gradient-brand">Digit</span>
          <span className="text-foreground/90">tool</span>
        </div>
        <a
          href="#login"
          onClick={handleLogin}
          className="inline-flex items-center gap-2 rounded-full bg-background border border-border px-5 py-2.5 text-sm font-semibold hover:bg-secondary hover:scale-105 transition-all duration-300 animate-fade-up"
        >
          Login Now <ArrowRight className="h-4 w-4" />
        </a>

      </nav>

      {/* Hero */}
      <section className="px-6 pt-16 pb-20 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm text-muted-foreground bg-card/40 animate-fade-up">
          <Zap className="h-4 w-4 text-cyan animate-pulse" />
          Trusted by 50,000+ Traders Worldwide
        </div>
        <h1 className="mt-8 text-5xl md:text-7xl font-bold font-display tracking-tight animate-fade-up" style={{ animationDelay: "0.1s" }}>
          <span className="text-gradient-hero">Welcome to </span>
          <span className="text-gradient-hero">{typed}</span>
          <span className="inline-block w-[3px] md:w-1 h-[0.9em] align-middle bg-cyan ml-1 animate-blink" />
        </h1>
        <p className="mt-6 max-w-2xl mx-auto text-lg text-muted-foreground animate-fade-up" style={{ animationDelay: "0.2s" }}>
          Your all-in-one workspace for automated trading, smart bots, and real-time market insights.
        </p>

        <div className="mt-10 flex flex-col items-center gap-3 animate-fade-up" style={{ animationDelay: "0.3s" }}>
          <Link
            to="/app/bot-builder"
            className="inline-flex items-center gap-2 rounded-full bg-gradient-brand-animated px-8 py-4 text-base font-semibold shadow-glow hover:scale-105 hover:shadow-2xl transition-all duration-300 animate-glow"
          >
            Start Trading Now <ArrowRight className="h-4 w-4" />
          </Link>
          <a
            href="#login"
            onClick={handleLogin}
            className="inline-flex items-center gap-2 rounded-full bg-gradient-gold px-8 py-3 text-sm font-semibold text-background hover:opacity-95 hover:scale-105 transition-all duration-300"
          >
            Old Account Login
          </a>
          <a
            href="#signup"
            onClick={handleSignup}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-8 py-3 text-sm font-semibold hover:opacity-95 hover:scale-105 transition-all duration-300"
          >
            Sign Up
          </a>
        </div>


        <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground animate-fade-up" style={{ animationDelay: "0.4s" }}>
          <span className="inline-flex items-center gap-2"><Check className="h-4 w-4 text-cyan" /> No Credit Card Required</span>
          <span className="inline-flex items-center gap-2"><Check className="h-4 w-4 text-cyan" /> $10,000 Virtual Account</span>
        </div>
      </section>

      {/* Testimonials — auto-scrolling marquee */}
      <section className="pb-20 relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-background to-transparent z-10" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-background to-transparent z-10" />
        <div className="flex w-max animate-marquee gap-6 pt-8 hover:[animation-play-state:paused]">
          {loop.map((t, i) => (
            <div key={i} className="glass-card rounded-2xl p-6 pt-12 relative w-[340px] shrink-0 hover:scale-105 hover:border-cyan/40 transition-all duration-300">
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 h-12 w-12 rounded-full bg-gradient-to-br from-primary/70 to-accent/70 flex items-center justify-center text-sm font-bold border border-border shadow-glow">
                {t.initials}
              </div>
              <p className="text-sm italic text-muted-foreground leading-relaxed min-h-[80px]">"{t.quote}"</p>
              <div className="mt-6 text-center">
                <div className="font-semibold">{t.name}</div>
                <div className="text-xs text-cyan mt-0.5">{t.role}</div>
                <div className="mt-2 flex justify-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <Star key={j} className={`h-4 w-4 ${j < Math.floor(t.stars) ? "fill-gold text-gold" : "text-muted"}`} />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Stats */}
      <section className="px-6 pb-24">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-5xl mx-auto">
          {stats.map((s, i) => (
            <div key={s.label} className="glass-card rounded-full aspect-square flex flex-col items-center justify-center animate-float hover:scale-110 transition-transform duration-500" style={{ animationDelay: `${i * 0.3}s` }}>
              <div className="text-3xl md:text-4xl font-bold text-gradient-brand">{s.value}</div>
              <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="px-6 pb-24 max-w-7xl mx-auto">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan/40 bg-cyan/10 px-4 py-1.5 text-xs font-semibold text-cyan uppercase tracking-widest">
            <Sparkles className="h-3.5 w-3.5" /> Platform
          </div>
          <h2 className="mt-5 text-4xl md:text-5xl font-bold font-display">
            <span className="text-gradient-hero">Powerful Features for Modern Traders</span>
          </h2>
          <p className="mt-3 text-muted-foreground">Everything you need to succeed in today's fast-paced markets</p>
          <p className="mt-2 max-w-3xl mx-auto text-sm text-muted-foreground/80">
            Whether you prefer manual decisions, automated bot execution, or copy trading, Digittool gives you practical tools for finding setups, managing risk, and keeping your trading workflow simple.
          </p>
        </div>
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6">
          {features.map((f, i) => (
            <div
              key={f.title}
              className="group glass-card rounded-2xl p-8 relative overflow-hidden hover:scale-[1.02] hover:border-primary/40 transition-all duration-500"
              style={{ animation: `fade-up 0.7s ease-out ${i * 0.1}s both` }}
            >
              <div className="absolute -top-16 -right-16 h-40 w-40 rounded-full bg-gradient-cta opacity-20 blur-3xl group-hover:opacity-40 transition-opacity" />
              <div className="text-4xl mb-4 animate-float inline-block" style={{ animationDelay: `${i * 0.5}s` }}>{f.emoji}</div>
              <h3 className="text-2xl font-bold font-display">{f.title}</h3>
              <div className="mt-1 text-sm font-semibold text-cyan">{f.tagline}</div>
              <p className="mt-4 text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Community */}
      <section className="px-6 pb-24 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-4 py-1.5 text-xs font-semibold text-gold uppercase tracking-widest">
          Community
        </div>
        <h2 className="mt-5 text-4xl md:text-5xl font-bold font-display">
          <span className="text-gradient-brand">Trusted by Traders Worldwide</span>
        </h2>
        <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">
          Join thousands of successful traders who have transformed their trading with Digittool
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-8">
          <div className="flex flex-col items-center">
            <div className="flex gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => <Star key={i} className="h-6 w-6 fill-gold text-gold" />)}
            </div>
            <div className="mt-2 text-sm text-muted-foreground">4.9 average rating</div>
          </div>
          <div className="flex flex-col items-center">
            <div className="text-3xl font-bold text-gradient-brand">50,000+</div>
            <div className="mt-2 text-sm text-muted-foreground">traders</div>
          </div>
          <div className="flex flex-col items-center">
            <div className="text-3xl font-bold text-gradient-brand">100%</div>
            <div className="mt-2 text-sm text-muted-foreground">Verified reviews</div>
          </div>
        </div>
      </section>

      {/* Why Digittool */}
      <section className="px-6 pb-24 max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary uppercase tracking-widest">
            Why Digittool
          </div>
          <h2 className="mt-5 text-4xl md:text-5xl font-bold font-display">
            <span className="text-gradient-hero">Why Choose Digittool?</span>
          </h2>
          <p className="mt-3 text-muted-foreground">Join the platform that's redefining automated trading</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {whyChoose.map((w, i) => (
            <div
              key={w}
              className="glass-card rounded-xl px-5 py-4 flex items-center gap-3 hover:border-cyan/40 hover:translate-x-1 transition-all duration-300"
              style={{ animation: `fade-up 0.6s ease-out ${i * 0.08}s both` }}
            >
              <div className="h-8 w-8 shrink-0 rounded-full bg-gradient-cta grid place-items-center">
                <Check className="h-4 w-4" />
              </div>
              <span className="text-sm">{w}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-6 pb-24">
        <div className="relative max-w-5xl mx-auto glass-card rounded-3xl p-10 md:p-16 text-center overflow-hidden">
          <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-primary/30 blur-3xl animate-float" />
          <div className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-accent/30 blur-3xl animate-float" style={{ animationDelay: "1.5s" }} />
          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Get Started
            </div>
            <h2 className="mt-5 text-4xl md:text-5xl font-bold font-display">
              <span className="text-gradient-hero">Ready to Transform Your Trading?</span>
            </h2>
            <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
              Join 50,000+ traders who are already profiting with Digittool. Start with a free virtual account today.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/app/bot-builder"
                className="inline-flex items-center gap-2 rounded-full bg-gradient-brand-animated px-8 py-4 text-base font-semibold shadow-glow hover:scale-105 transition-all duration-300 animate-glow"
              >
                Start Trading Now <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#signup"
                onClick={handleSignup}
                className="inline-flex items-center gap-2 rounded-full bg-gradient-gold px-8 py-4 text-base font-semibold text-background hover:scale-105 transition-all duration-300"
              >
                Create Free Account
              </a>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-border py-8 px-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Digittool. Trading involves risk.
      </footer>
    </div>
  );
}
