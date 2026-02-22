// LiveAvatar session token generation — server-side only
// Calls api.liveavatar.com to get a session access token.
// Tokens are one-time use. Generate a new one for each session.
// Retries with exponential backoff on transient errors (concurrency limit, 5xx).

import { NextResponse } from "next/server";

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 2000; // 2s, 4s, 8s backoff

async function fetchToken(apiKey: string, sandbox: boolean) {
  const res = await fetch("https://api.liveavatar.com/v1/sessions/token", {
    method: "POST",
    headers: {
      "X-API-KEY": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      mode: "LITE",
      avatar_id: sandbox ? "dd73ea75-1218-4ef3-92ce-606d5f7fbc0a" : process.env.HEYGEN_AVATAR_ID,
      is_sandbox: sandbox,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    return { ok: false as const, status: res.status, body };
  }

  const data = await res.json();
  const token = data.session_token ?? data.data?.session_token ?? data.token;
  if (!token) {
    return { ok: false as const, status: 500, body: `No token in response: ${JSON.stringify(data)}` };
  }

  return { ok: true as const, token };
}

/** Check if the error is retryable (concurrency limit, server errors, rate limits) */
function isRetryable(status: number, body: string): boolean {
  if (status >= 500) return true; // server errors
  if (status === 429) return true; // rate limited
  if (body.toLowerCase().includes("concurrency limit")) return true;
  if (body.toLowerCase().includes("session not found")) return true;
  return false;
}

/** Classify the error for the client UI */
function classifyError(body: string): string {
  const lower = body.toLowerCase();
  if (lower.includes("concurrency limit")) return "concurrency_limit";
  if (lower.includes("session not found")) return "session_not_found";
  if (lower.includes("rate limit") || lower.includes("too many")) return "rate_limited";
  if (lower.includes("unauthorized") || lower.includes("invalid")) return "auth_error";
  return "unknown";
}

export async function POST() {
  const apiKey = process.env.HEYGEN_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "HEYGEN_API_KEY not configured", code: "config_error" },
      { status: 500 }
    );
  }
  const sandbox = process.env.HEYGEN_SANDBOX === "true";

  let lastError = { status: 500, body: "Unknown error" };

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
      console.log(`[heygen/token] Retry ${attempt}/${MAX_RETRIES - 1} after ${delay}ms...`);
      await new Promise((r) => setTimeout(r, delay));
    }

    const result = await fetchToken(apiKey, sandbox);

    if (result.ok) {
      if (attempt > 0) {
        console.log(`[heygen/token] Succeeded on attempt ${attempt + 1}`);
      }
      return NextResponse.json({ token: result.token });
    }

    lastError = { status: result.status, body: result.body };
    console.error(`[heygen/token] Attempt ${attempt + 1} failed:`, result.status, result.body);

    // Only retry on transient errors
    if (!isRetryable(result.status, result.body)) {
      break;
    }
  }

  const code = classifyError(lastError.body);
  return NextResponse.json(
    { error: "Failed to create LiveAvatar session token", code, detail: lastError.body },
    { status: lastError.status }
  );
}
