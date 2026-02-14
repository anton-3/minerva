// Tutor respond API route — the core brain endpoint
// Accepts TutorBrainRequest, returns TutorBrainResponse with speech + canvasCommands
// See: specs/001-minerva-mvp/contracts/tutor-brain.md

import { NextResponse } from "next/server";
import { createTutorBrain } from "@/lib/claude/client";
import type { TutorBrainRequest } from "@/types/session";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as TutorBrainRequest;

    if (!body.studentMessage) {
      return NextResponse.json(
        { error: "studentMessage is required" },
        { status: 400 }
      );
    }

    const brain = createTutorBrain();
    const response = await brain.respond(body);

    return NextResponse.json(response);
  } catch (err) {
    console.error("[api/tutor/respond] Error:", err);
    return NextResponse.json(
      {
        speech:
          "I'm having some trouble right now. Can you try saying that again?",
      },
      { status: 500 }
    );
  }
}
