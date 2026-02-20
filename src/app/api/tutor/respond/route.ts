// Tutor respond API route — the core brain endpoint
// Accepts TutorBrainRequest, returns SSE stream with tool calling.
// Optionally enriches with Perplexity Sonar for factual grounding (T061)
// See: specs/001-minerva-mvp/contracts/tutor-brain.md
//
// SSE events:
//   data: {"type":"speech","speech":"..."}                    — text speech from Claude
//   data: {"type":"audio","audio":"<base64 PCM 24kHz>"}      — TTS audio chunk (ElevenLabs)
//   data: {"type":"audio-end"}                                — end of audio for current speech
//   data: {"type":"tool-call","toolName":"...","input":{...}} — tool invocation
//   data: {"type":"tool-result","toolName":"...","output":{}} — server-executed tool result
//   data: {"type":"done"}                                     — stream complete
//   data: {"type":"error","speech":"..."}                     — fallback speech on error
//
// Tool execution:
//   - showVideo: Server-side (calls Manim API)
//   - updateProgress: Server-side (writes to DB)
//   - executeCanvasCommands, showSandbox, setContentMode: Client-side (streamed to frontend)
//
// Perplexity enrichment runs BEFORE the stream starts (max 3s race timeout).

import { NextResponse } from "next/server";
import { createTutorBrain, TutorStreamEvent } from "@/lib/ai/client";
import { createManimClient } from "@/lib/manim/client";
import { createTTSClient } from "@/lib/elevenlabs/client";
import type { TutorBrainRequest } from "@/types/session";

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

// Handle showVideo tool calls (server-side Manim API)
async function handleShowVideoTool(
  input: { existingFile?: string; generatePrompt?: string }
): Promise<{ videoUrl?: string; error?: string }> {
  if (!process.env.NEXT_PUBLIC_MANIM_URL) {
    return { error: "Manim API not configured" };
  }

  const manim = createManimClient();

  try {
    // Case 1: Claude specified an existing video file to reuse
    if (input.existingFile) {
      const videoUrl = manim.getVideoUrl(input.existingFile);
      console.log("[api/tutor/respond] Reusing existing video:", videoUrl);
      return { videoUrl };
    }

    // Case 2: Claude wants to generate a new video
    if (input.generatePrompt) {
      console.log("[api/tutor/respond] Generating new video:", input.generatePrompt);
      const videoUrl = await manim.generateVideo(input.generatePrompt);
      console.log("[api/tutor/respond] Manim video generated:", videoUrl);
      return { videoUrl };
    }

    // Case 3: No video specified, try to use first available
    const existingVideos = await manim.getExistingVideos();
    if (existingVideos.length > 0) {
      const videoUrl = manim.getVideoUrl(existingVideos[0].filename);
      console.log("[api/tutor/respond] Fallback to first existing video:", videoUrl);
      return { videoUrl };
    }

    return { error: "No video specified and no existing videos available" };
  } catch (err) {
    console.error("[api/tutor/respond] Manim handling failed:", err);
    return { error: "Video generation failed" };
  }
}

// Handle updateProgress tool calls (server-side DB write)
async function handleUpdateProgressTool(
  input: { topic: string; score: number; velocity?: string },
  sessionId: string | null,
  learningPlanSubject: string | null
): Promise<{ success: boolean }> {
  if (!sessionId || !learningPlanSubject) {
    console.log("[api/tutor/respond] Skipping progress update - no session context");
    return { success: false };
  }

  try {
    await fetch(`${process.env.NEXT_PUBLIC_URL || "http://localhost:3000"}/api/progress`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        child_id: sessionId,
        subject: learningPlanSubject,
        topic: input.topic,
        score: input.score,
      }),
    });
    console.log("[api/tutor/respond] Progress saved:", input.topic, input.score);
    return { success: true };
  } catch (err) {
    console.error("[api/tutor/respond] Progress save failed:", err);
    return { success: false };
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

  let body: TutorBrainRequest & { sessionId?: string; learningPlanSubject?: string };
  try {
    body = await request.json();
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
    `[Latency:server] BODY_PARSED +${Date.now() - t0}ms | model=${body.modelId ?? "default"} "${body.studentMessage.slice(0, 80)}"`
  );

  // Create an AbortController so we can cancel the Claude stream if the client disconnects
  const abortController = new AbortController();

  const brain = createTutorBrain();
  const tts = createTTSClient();
  const encoder = new TextEncoder();

  console.log(`[Latency:server] STREAM_SETUP +${Date.now() - t0}ms | starting Claude stream | TTS=${tts.available ? "on" : "off"}`);


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

          // tts-sentence: Claude finished a sentence — TTS it immediately
          // (emitted DURING Claude streaming, before full text is complete)
          if (event.type === "tts-sentence" && tts.available) {
            const sentence = event.sentence;
            try {
              const sentT0 = Date.now();
              const pcmChunks: Uint8Array[] = [];
              let totalBytes = 0;
              for await (const chunk of tts.streamSpeech(sentence)) {
                pcmChunks.push(chunk);
                totalBytes += chunk.length;
              }
              const fullPcm = Buffer.concat(pcmChunks);
              const b64 = fullPcm.toString("base64");
              console.log(
                `[Latency:server] TTS_SENTENCE +${Date.now() - t0}ms (${Date.now() - sentT0}ms TTS) | ${totalBytes} bytes "${sentence.slice(0, 40)}..."`
              );

              // Emit audio immediately — client plays this while we TTS the next sentence
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: "audio", audio: b64 })}\n\n`)
              );
              controller.enqueue(
                encoder.encode('data: {"type":"audio-end"}\n\n')
              );
            } catch (ttsErr) {
              console.error("[api/tutor/respond] TTS sentence error:", ttsErr);
            }
          }

          // speech: full text for chat display (TTS already handled by tts-sentence events)
          if (event.type === "speech") {
            console.log(
              `[Latency:server] SPEECH_SSE_EMIT +${Date.now() - t0}ms | "${event.speech.slice(0, 60)}..."`
            );
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
          } else if (event.type === "tool-call") {
            // Handle server-side tool execution
            if (event.toolName === "showVideo") {
              console.log(`[Latency:server] EXECUTING_TOOL +${Date.now() - t0}ms | showVideo`);
              const result = await handleShowVideoTool(
                event.input as { existingFile?: string; generatePrompt?: string }
              );
              // Emit the tool result
              const resultEvent: TutorStreamEvent = {
                type: "tool-result",
                toolName: "showVideo",
                toolCallId: event.toolCallId,
                output: result,
              };
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(resultEvent)}\n\n`));
            } else if (event.toolName === "updateProgress") {
              console.log(`[Latency:server] EXECUTING_TOOL +${Date.now() - t0}ms | updateProgress`);
              const result = await handleUpdateProgressTool(
                event.input as { topic: string; score: number; velocity?: string },
                body.sessionId ?? null,
                body.learningPlan?.subject ?? null
              );
              // Emit the tool result (non-blocking)
              const resultEvent: TutorStreamEvent = {
                type: "tool-result",
                toolName: "updateProgress",
                toolCallId: event.toolCallId,
                output: result,
              };
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(resultEvent)}\n\n`));
            } else {
              // Client-side tools: forward the tool-call event to frontend
              console.log(
                `[Latency:server] TOOL_CALL_SSE_EMIT +${Date.now() - t0}ms | ${event.toolName}`
              );
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
            }
          } else if (event.type === "tool-result") {
            // Forward tool results (from AI SDK auto-execution if any)
            console.log(
              `[Latency:server] TOOL_RESULT_SSE_EMIT +${Date.now() - t0}ms | ${event.toolName}`
            );
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
          } else if (event.type === "done") {
            console.log(`[Latency:server] STREAM_DONE +${Date.now() - t0}ms`);
            controller.enqueue(encoder.encode('data: {"type":"done"}\n\n'));
          }
        }
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
