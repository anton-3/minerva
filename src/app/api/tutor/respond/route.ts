// Tutor respond API route — the core brain endpoint
// Accepts TutorBrainRequest, returns SSE stream: speech first, then remaining fields.
// Optionally enriches with Perplexity Sonar for factual grounding (T061)
// Integrates Manim video generation for math animations
// See: specs/001-minerva-mvp/contracts/tutor-brain.md
//
// SSE events:
//   data: {"type":"speech","speech":"..."}       — emitted as soon as speech field is extracted
//   data: {"type":"result","data":{...}}         — remaining fields (canvasCommands, sandboxContent, videoUrl, etc.)
//   data: {"type":"done"}                        — stream complete
//   data: {"type":"error","speech":"..."}        — fallback speech on error
//
// Perplexity enrichment runs BEFORE the stream starts (max 3s race timeout).

import { NextResponse } from "next/server";
import { createTutorBrain, TutorStreamEvent } from "@/lib/claude/client";
import { createKnowledgeLookup } from "@/lib/perplexity/client";
import { createManimClient } from "@/lib/manim/client";
import type { TutorBrainRequest, TutorBrainResponse } from "@/types/session";

// Allow long-running requests for Manim video generation (up to 5 minutes)
export const maxDuration = 300;

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

// If Claude requested a Manim video, resolve the URL
async function handleManimGeneration(
  data: Omit<TutorBrainResponse, "speech">
): Promise<Omit<TutorBrainResponse, "speech">> {
  if (!process.env.NEXT_PUBLIC_MANIM_URL) {
    return data;
  }
  
  // Auto-correct: if Claude provided video content but wrong mode, fix it
  const hasVideoContent = !!(data.manimVideoFile || data.manimPrompt);
  if (hasVideoContent && data.contentMode !== "video") {
    console.log("[api/tutor/respond] Auto-correcting contentMode to 'video' (Claude provided video content)");
    data = { ...data, contentMode: "video" };
  }
  
  // Only handle if video mode requested
  if (data.contentMode !== "video") {
    return data;
  }
  
  const manim = createManimClient();
  
  try {
    // Case 1: Claude specified an existing video file to reuse
    if (data.manimVideoFile) {
      const videoUrl = manim.getVideoUrl(data.manimVideoFile);
      console.log("[api/tutor/respond] Reusing existing video:", videoUrl);
      return { ...data, videoUrl };
    }
    
    // Case 2: Claude wants to generate a new video
    if (data.manimPrompt) {
      console.log("[api/tutor/respond] Generating new video:", data.manimPrompt);
      const videoUrl = await manim.generateVideo(data.manimPrompt);
      console.log("[api/tutor/respond] Manim video generated:", videoUrl);
      return { ...data, videoUrl };
    }
    
    // Case 3: No video specified, try to use first available
    const existingVideos = await manim.getExistingVideos();
    if (existingVideos.length > 0) {
      const videoUrl = manim.getVideoUrl(existingVideos[0].filename);
      console.log("[api/tutor/respond] Fallback to first existing video:", videoUrl);
      return { ...data, videoUrl };
    }
    
    console.log("[api/tutor/respond] No videos available");
    return data;
  } catch (err) {
    console.error("[api/tutor/respond] Manim handling failed:", err);
    return data;
  }
}

export async function POST(request: Request) {
  const t0 = Date.now();
  console.log(`[Latency:server] T0 REQUEST_RECEIVED`);

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

  console.log(
    `[Latency:server] BODY_PARSED +${Date.now() - t0}ms | "${body.studentMessage.slice(0, 80)}"`
  );

  // NOTE: Removed blocking getManimVideosContext() call here — was adding ~800ms latency
  // Claude can still generate new videos on demand via manimPrompt

  // Perplexity enrichment — runs before the stream starts (max 3s)
  const needsPerplexity =
    looksLikeFactualQuestion(body.studentMessage) &&
    !!process.env.PERPLEXITY_API_KEY;

  if (needsPerplexity) {
    console.log(`[Latency:server] PERPLEXITY_START +${Date.now() - t0}ms`);
    try {
      const lookup = createKnowledgeLookup();
      const perplexityResult = await Promise.race([
        lookup.search(body.studentMessage).catch(() => null),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000)),
      ]);

      console.log(
        `[Latency:server] PERPLEXITY_DONE +${Date.now() - t0}ms | result=${perplexityResult ? "yes" : "null"}`
      );

      if (perplexityResult && perplexityResult.answer) {
        const citationsText =
          perplexityResult.citations.length > 0
            ? `\nSources: ${perplexityResult.citations.slice(0, 3).join(", ")}`
            : "";
        body.studentMessage += `\n\n[Knowledge from Perplexity Sonar — use this for factual accuracy, but rephrase in your own Socratic teaching style:]\n${perplexityResult.answer}${citationsText}`;
      }
    } catch {
      console.log(`[Latency:server] PERPLEXITY_FAILED +${Date.now() - t0}ms`);
      // Perplexity failure never blocks the response
    }
  } else {
    console.log(`[Latency:server] PERPLEXITY_SKIPPED +${Date.now() - t0}ms`);
  }

  // Create an AbortController so we can cancel the Claude stream if the client disconnects
  const abortController = new AbortController();

  const brain = createTutorBrain();
  const encoder = new TextEncoder();

  console.log(`[Latency:server] STREAM_SETUP +${Date.now() - t0}ms | starting Claude stream`);

  const stream = new ReadableStream({
    async start(controller) {
      try {
        let firstEvent = true;
        for await (const event of brain.respondStream(body, abortController.signal)) {
          if (firstEvent) {
            console.log(
              `[Latency:server] FIRST_SSE_EVENT +${Date.now() - t0}ms | type=${event.type}`
            );
            firstEvent = false;
          }
          
          if (event.type === "speech") {
            console.log(
              `[Latency:server] SPEECH_SSE_EMIT +${Date.now() - t0}ms | "${(event.speech as string).slice(0, 60)}..."`
            );
            const sseData = `data: ${JSON.stringify(event)}\n\n`;
            controller.enqueue(encoder.encode(sseData));
          } else if (event.type === "result") {
            // Process Manim video generation for result events
            let data = event.data as Omit<TutorBrainResponse, "speech">;
            data = await handleManimGeneration(data);
            
            console.log(
              `[Latency:server] RESULT_SSE_EMIT +${Date.now() - t0}ms | contentMode=${data.contentMode}, hasVideo=${!!data.videoUrl}`
            );
            
            const resultEvent: TutorStreamEvent = { type: "result", data };
            const sseData = `data: ${JSON.stringify(resultEvent)}\n\n`;
            controller.enqueue(encoder.encode(sseData));
          }
        }
        console.log(`[Latency:server] STREAM_DONE +${Date.now() - t0}ms`);
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
