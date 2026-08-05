import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Loader2, ShieldCheck, TriangleAlert } from "lucide-react";
import { consumeReturnTo, exchangeCode } from "@/lib/deriv-auth";
import { POST_LOGIN_PATH } from "@/lib/deriv-config";

export const Route = createFileRoute("/auth/callback")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Signing you in — Digittool" },
      { name: "description", content: "Completing your secure Deriv sign in." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Signing you in — Digittool" },
      { property: "og:description", content: "Completing your secure Deriv sign in." },
    ],
  }),
  component: AuthCallback,
});

function AuthCallback() {
  const router = useRouter();
  const [status, setStatus] = useState<"working" | "error">("working");
  const [message, setMessage] = useState("Verifying your Deriv authorization…");
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const params = new URLSearchParams(window.location.search);
    const oauthError = params.get("error");
    const code = params.get("code");
    const state = params.get("state");

    if (oauthError) {
      setStatus("error");
      setMessage(params.get("error_description") || `Deriv returned an error: ${oauthError}`);
      return;
    }
    if (!code) {
      // Deriv sometimes returns the classic acct1/token1 params instead of a
      // PKCE code — accept those so the session is still established.
      const legacy = captureRedirectTokens();
      if (legacy) {
        void router.navigate({ to: consumeReturnTo() || POST_LOGIN_PATH, replace: true });
        return;
      }
      setStatus("error");
      setMessage("No authorization code was returned by Deriv.");
      return;
    }


    (async () => {
      try {
        setMessage("Exchanging the authorization code securely…");
        await exchangeCode(code, state);
        // Strip the sensitive query string from history before navigating on.
        window.history.replaceState({}, "", window.location.pathname);
        const target = consumeReturnTo() || POST_LOGIN_PATH;
        await router.navigate({ to: target, replace: true });
      } catch (e) {
        setStatus("error");
        setMessage(e instanceof Error ? e.message : "Sign in could not be completed.");
      }
    })();
  }, [router]);

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white grid place-items-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0f1424] p-8 text-center">
        {status === "working" ? (
          <>
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-cyan-400" />
            <h1 className="mt-5 text-xl font-bold">Signing you in</h1>
            <p className="mt-2 text-sm text-white/60">{message}</p>
            <p className="mt-4 inline-flex items-center gap-1.5 text-xs text-white/40">
              <ShieldCheck className="h-3.5 w-3.5" /> Secured with OAuth 2.0 + PKCE
            </p>
          </>
        ) : (
          <>
            <TriangleAlert className="mx-auto h-10 w-10 text-red-400" />
            <h1 className="mt-5 text-xl font-bold">We couldn't sign you in</h1>
            <p className="mt-2 text-sm text-white/60">{message}</p>
            <div className="mt-6 flex justify-center gap-2">
              <a
                href="/"
                className="rounded-lg border border-white/20 px-4 py-2 text-sm hover:bg-white/10"
              >
                Back home
              </a>
              <a
                href="/app/dashboard"
                className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-cyan-400"
              >
                Try again
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
