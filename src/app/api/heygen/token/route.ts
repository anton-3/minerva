// LiveAvatar session token generation — server-side only
// Calls api.liveavatar.com to get a session access token.
// Tokens are one-time use. Generate a new one for each session.

import { NextResponse } from "next/server";

export async function POST() {
  const apiKey = process.env.HEYGEN_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "HEYGEN_API_KEY not configured" },
      { status: 500 }
    );
  }

  const res = await fetch("https://api.liveavatar.com/v1/sessions/token", {
    method: "POST",
    headers: {
      "X-API-KEY": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      mode: "FULL",
      avatar_id: process.env.HEYGEN_AVATAR_ID,
      // No context_id — disables built-in AI brain.
      // We use Claude as the brain and repeat() for TTS only.
      avatar_persona: {
        voice_id: process.env.HEYGEN_VOICE_ID,
        language: "en",
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error("[heygen/token] Failed to create token:", res.status, body);
    return NextResponse.json(
      { error: "Failed to create LiveAvatar session token" },
      { status: res.status }
    );
  }

  const data = await res.json();
  // LiveAvatar returns { session_token: "..." } or { data: { session_token } }
  const token = data.session_token ?? data.data?.session_token ?? data.token;

  if (!token) {
    console.error("[heygen/token] No token in response:", JSON.stringify(data));
    return NextResponse.json(
      { error: "No session token in LiveAvatar response" },
      { status: 500 }
    );
  }

  return NextResponse.json({ token });
}
