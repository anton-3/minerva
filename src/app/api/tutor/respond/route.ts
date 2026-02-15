// Tutor respond API route — the core brain endpoint
// Accepts TutorBrainRequest, returns SSE stream: speech first, then remaining fields.
// Optionally enriches with Perplexity Sonar for factual grounding (T061)
// See: specs/001-minerva-mvp/contracts/tutor-brain.md
//
// SSE events:
//   data: {"type":"speech","speech":"..."}       — emitted as soon as speech field is extracted
//   data: {"type":"result","data":{...}}         — remaining fields (canvasCommands, sandboxHtml, etc.)
//   data: {"type":"done"}                        — stream complete
//   data: {"type":"error","speech":"..."}        — fallback speech on error
//
// Perplexity enrichment runs BEFORE the stream starts (max 3s race timeout).

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
  // Reject oversized payloads (5MB limit for image uploads)
  const contentLength = request.headers.get("content-length");
  if (contentLength && parseInt(contentLength) > 5 * 1024 * 1024) {
    return NextResponse.json(
      { error: "Request too large. Max 5MB." },
      { status: 413 }
    );
  }

  let body: TutorBrainRequest;
  try {
    body = (await request.json()) as TutorBrainRequest;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  if (!body.studentMessage) {
    return NextResponse.json(
      { error: "studentMessage is required" },
      { status: 400 }
    );
  }

  // Perplexity enrichment — runs before the stream starts (max 3s)
  const needsPerplexity =
    looksLikeFactualQuestion(body.studentMessage) &&
    !!process.env.PERPLEXITY_API_KEY;

  if (needsPerplexity) {
    try {
      const lookup = createKnowledgeLookup();
      const perplexityResult = await Promise.race([
        lookup.search(body.studentMessage).catch(() => null),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000)),
      ]);

      if (perplexityResult && perplexityResult.answer) {
        const citationsText =
          perplexityResult.citations.length > 0
            ? `\nSources: ${perplexityResult.citations.slice(0, 3).join(", ")}`
            : "";
        body.studentMessage += `\n\n[Knowledge from Perplexity Sonar — use this for factual accuracy, but rephrase in your own Socratic teaching style:]\n${perplexityResult.answer}${citationsText}`;
      }
    } catch {
      // Perplexity failure never blocks the response
    }
  }

  // Create an AbortController so we can cancel the Claude stream if the client disconnects
  const abortController = new AbortController();

  const brain = createTutorBrain();
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of brain.respondStream(body, abortController.signal)) {
          const sseData = `data: ${JSON.stringify(event)}\n\n`;
          controller.enqueue(encoder.encode(sseData));
        }
        controller.enqueue(encoder.encode('data: {"type":"done"}\n\n'));
      } catch (err) {
        console.error("[api/tutor/respond] Stream error:", err);
        const errorEvent = `data: ${JSON.stringify({
          type: "error",
          speech:
            "I'm having some trouble right now. Can you try saying that again?",
        })}\n\n`;
        controller.enqueue(encoder.encode(errorEvent));
      } finally {
        controller.close();
      }
    },
    cancel() {
      // Client disconnected — abort the Claude stream
      abortController.abort();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
