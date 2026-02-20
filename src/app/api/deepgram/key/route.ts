// Deepgram API key endpoint — server-side only
// Returns the Deepgram API key for client-side WebSocket connection.
// In production, this should generate scoped temporary keys.

import { NextResponse } from "next/server";

export async function POST() {
  const apiKey = process.env.DEEPGRAM_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "DEEPGRAM_API_KEY not configured" },
      { status: 500 }
    );
  }

  // For MVP: return the key directly.
  // TODO: Use Deepgram's key management API to create scoped, short-lived keys.
  return NextResponse.json({ key: apiKey });
}
