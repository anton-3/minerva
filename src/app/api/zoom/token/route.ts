// Zoom Video SDK JWT token generation
// Server-side only — creates short-lived session tokens
// See: https://developers.zoom.us/docs/video-sdk/auth/

import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";

export async function POST(request: Request) {
  const sdkKey = process.env.ZOOM_SDK_KEY;
  const sdkSecret = process.env.ZOOM_SDK_SECRET;

  if (!sdkKey || !sdkSecret) {
    return NextResponse.json(
      { error: "Zoom SDK credentials not configured" },
      { status: 500 }
    );
  }

  const body = await request.json();
  const { topic, role = 1 } = body as { topic?: string; role?: number };

  if (!topic) {
    return NextResponse.json(
      { error: "Session topic is required" },
      { status: 400 }
    );
  }

  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + 60 * 60 * 2; // 2 hour expiry

  const payload = {
    app_key: sdkKey,
    tpc: topic,
    role_type: role, // 1 = host, 0 = participant
    version: 1,
    iat,
    exp,
  };

  const token = jwt.sign(payload, sdkSecret, { algorithm: "HS256" });

  return NextResponse.json({ token });
}
