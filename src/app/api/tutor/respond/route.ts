// Tutor respond API route — the core brain endpoint
// Accepts TutorBrainRequest, returns TutorBrainResponse with speech + canvasCommands
// Optionally enriches with Perplexity Sonar for factual grounding (T061)
// See: specs/001-minerva-mvp/contracts/tutor-brain.md

import { NextResponse } from "next/server";
import { createTutorBrain } from "@/lib/claude/client";
import { createKnowledgeLookup } from "@/lib/perplexity/client";
import type { TutorBrainRequest } from "@/types/session";

// Simple heuristic to detect factual questions that benefit from Perplexity
const FACTUAL_PATTERNS = [
  /what (?:is|are|was|were)\b/i,
  /how (?:does|do|did|can|could)\b/i,
  /why (?:is|are|does|do|did)\b/i,
  /explain\b/i,
  /define\b/i,
  /who (?:is|are|was|were)\b/i,
  /when (?:did|was|were|is)\b/i,
  /tell me about\b/i,
];

function looksLikeFactualQuestion(message: string): boolean {
  return FACTUAL_PATTERNS.some((pattern) => pattern.test(message));
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as TutorBrainRequest;

    if (!body.studentMessage) {
      return NextResponse.json(
        { error: "studentMessage is required" },
        { status: 400 }
      );
    }

    // Optionally enrich with Perplexity Sonar for factual questions
    if (
      looksLikeFactualQuestion(body.studentMessage) &&
      process.env.PERPLEXITY_API_KEY
    ) {
      try {
        const lookup = createKnowledgeLookup();
        const { answer, citations } = await lookup.search(body.studentMessage);

        if (answer) {
          // Append Perplexity knowledge to the student message as context
          const citationsText =
            citations.length > 0
              ? `\nSources: ${citations.slice(0, 3).join(", ")}`
              : "";
          body.studentMessage += `\n\n[Knowledge from Perplexity Sonar — use this for factual accuracy, but rephrase in your own Socratic teaching style:]\n${answer}${citationsText}`;
        }
      } catch (err) {
        // Perplexity failure is non-blocking — Claude can still answer
        console.warn("[api/tutor/respond] Perplexity lookup failed:", err);
      }
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
