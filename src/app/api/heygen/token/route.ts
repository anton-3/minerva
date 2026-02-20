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
      mode: "FULL",
      avatar_id: sandbox ? "dd73ea75-1218-4ef3-92ce-606d5f7fbc0a" : process.env.HEYGEN_AVATAR_ID,
      is_sandbox: sandbox,
      // FULL mode: avatar rendering + built-in TTS via session.repeat(text).
      // We only use repeat() for TTS — LLM is Claude, ASR is HeyGen's built-in STT.
      // No context_id → disables HeyGen's built-in LLM. Avatar still emits
      // USER_TRANSCRIPTION events and supports repeat() for TTS.
      avatar_persona: {
        voice_id: process.env.HEYGEN_VOICE_ID,
        language: "en",
      },
      video_settings: {
        quality: "high", // 720p — best balance of quality vs latency
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
