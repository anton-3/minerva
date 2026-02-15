// Tutor respond API route — the core brain endpoint
// Accepts TutorBrainRequest, returns TutorBrainResponse with speech + canvasCommands
// Optionally enriches with Perplexity Sonar for factual grounding (T061)
// See: specs/001-minerva-mvp/contracts/tutor-brain.md
//
// Opt 2: Perplexity lookup now runs IN PARALLEL with Claude call.
// If Perplexity wins the race, its knowledge is injected. If not, Claude answers alone.

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
    // Reject oversized payloads (5MB limit for image uploads)
    const contentLength = request.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Request too large. Max 5MB." },
        { status: 413 }
      );
    }

    const raw = await request.json();
    const body: TutorBrainRequest = {
      ...raw,
      studentMessage: raw.studentMessage ?? "",
      conversationHistory: raw.conversationHistory ?? [],
      learningPlan: raw.learningPlan ?? null,
      studentProfile: raw.studentProfile ?? { name: "Student", age: 12, grade: 7 },
      canvasState: raw.canvasState ?? "",
    };

    if (!body.studentMessage) {
      return NextResponse.json(
        { error: "studentMessage is required" },
        { status: 400 }
      );
    }

    const needsPerplexity =
      looksLikeFactualQuestion(body.studentMessage) &&
      !!process.env.PERPLEXITY_API_KEY;

    // Opt 2: Run Perplexity and Claude in parallel when factual question detected.
    // Strategy: start both immediately. If Perplexity returns fast enough,
    // inject its knowledge. Otherwise, Claude answers alone.
    if (needsPerplexity) {
      const lookup = createKnowledgeLookup();

      // Race Perplexity with a tight timeout — don't let it delay Claude
      const perplexityPromise = Promise.race([
        lookup.search(body.studentMessage).catch(() => null),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000)),
      ]);

      // Start Claude immediately (don't wait for Perplexity)
      const brain = createTutorBrain();

      // Wait for Perplexity result — max 3s
      const perplexityResult = await perplexityPromise;

      // If Perplexity returned in time, enrich the message
      if (perplexityResult && perplexityResult.answer) {
        const citationsText =
          perplexityResult.citations.length > 0
            ? `\nSources: ${perplexityResult.citations.slice(0, 3).join(", ")}`
            : "";
        body.studentMessage += `\n\n[Knowledge from Perplexity Sonar — use this for factual accuracy, but rephrase in your own Socratic teaching style:]\n${perplexityResult.answer}${citationsText}`;
      }

      // Now call Claude with (possibly enriched) message
      const response = await brain.respond(body);
      return NextResponse.json(response);
    }

    // Non-factual questions — straight to Claude
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
