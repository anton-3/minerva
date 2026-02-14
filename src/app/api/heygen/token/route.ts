// HeyGen access token generation — server-side only
// Tokens are one-time use. Generate a new one for each session.
// See: specs/001-minerva-mvp/contracts/avatar.md

import { NextResponse } from "next/server";

export async function POST() {
  const apiKey = process.env.HEYGEN_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "HEYGEN_API_KEY not configured" },
      { status: 500 }
    );
  }

  const res = await fetch("https://api.heygen.com/v1/streaming.create_token", {
    method: "POST",
    headers: { "x-api-key": apiKey },
  });

  if (!res.ok) {
    const body = await res.text();
    console.error("[heygen/token] Failed to create token:", res.status, body);
    return NextResponse.json(
      { error: "Failed to create HeyGen token" },
      { status: res.status }
    );
  }

  const data = await res.json();
  return NextResponse.json(data);
}
