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
  const sandbox = process.env.HEYGEN_SANDBOX === "true";

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
      // LITE mode: avatar rendering + lip-sync only.
      // We bring our own ASR (Deepgram) and TTS (ElevenLabs).
      // Audio sent via repeatAudio() → agent.speak WebSocket events.
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
