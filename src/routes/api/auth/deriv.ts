// Server-side Deriv OAuth token exchange.
// The browser posts { code, code_verifier, redirect_uri } (or { refresh_token })
// and receives only the token payload. Any client secret stays on the server.

import { createFileRoute } from "@tanstack/react-router";
import { DERIV_CLIENT_ID, DERIV_TOKEN_ENDPOINT } from "@/lib/deriv-config";

interface ExchangeBody {
  code?: string;
  code_verifier?: string;
  redirect_uri?: string;
  refresh_token?: string;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

async function requestToken(form: URLSearchParams) {
  const clientSecret = process.env["DERIV_OAUTH_CLIENT_SECRET"];
  if (clientSecret) form.set("client_secret", clientSecret);

  const res = await fetch(DERIV_TOKEN_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: form.toString(),
  });

  const text = await res.text();
  let payload: Record<string, unknown> | null = null;
  try {
    payload = text ? (JSON.parse(text) as Record<string, unknown>) : null;
  } catch {
    payload = null;
  }

  if (!res.ok || !payload?.["access_token"]) {
    return json(
      {
        error: (payload?.["error"] as string) ?? "token_exchange_failed",
        error_description:
          (payload?.["error_description"] as string) ??
          `Deriv rejected the token request (${res.status}).`,
      },
      res.status === 200 ? 502 : res.status,
    );
  }

  return json(payload);
}

export const Route = createFileRoute("/api/auth/deriv")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: ExchangeBody;
        try {
          body = (await request.json()) as ExchangeBody;
        } catch {
          return json({ error: "invalid_request", error_description: "Malformed JSON body." }, 400);
        }

        try {
          // Refresh flow
          if (body.refresh_token) {
            return await requestToken(
              new URLSearchParams({
                grant_type: "refresh_token",
                client_id: DERIV_CLIENT_ID,
                refresh_token: body.refresh_token,
              }),
            );
          }

          // Authorization code + PKCE flow
          if (!body.code || !body.code_verifier || !body.redirect_uri) {
            return json(
              {
                error: "invalid_request",
                error_description: "code, code_verifier and redirect_uri are required.",
              },
              400,
            );
          }

          return await requestToken(
            new URLSearchParams({
              grant_type: "authorization_code",
              client_id: DERIV_CLIENT_ID,
              code: body.code,
              code_verifier: body.code_verifier,
              redirect_uri: body.redirect_uri,
            }),
          );
        } catch (error) {
          return json(
            {
              error: "network_error",
              error_description:
                error instanceof Error ? error.message : "Could not reach the Deriv OAuth server.",
            },
            502,
          );
        }
      },
    },
  },
});
