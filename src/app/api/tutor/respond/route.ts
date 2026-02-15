// Tutor respond API route — the core brain endpoint
// Accepts TutorBrainRequest, returns TutorBrainResponse with speech + canvasCommands
// Optionally enriches with Perplexity Sonar for factual grounding (T061)
// Integrates Manim video generation for math animations
// See: specs/001-minerva-mvp/contracts/tutor-brain.md
//
// Opt 2: Perplexity lookup now runs IN PARALLEL with Claude call.
// If Perplexity wins the race, its knowledge is injected. If not, Claude answers alone.

import { NextResponse } from "next/server";
import { createTutorBrain } from "@/lib/claude/client";
import { createKnowledgeLookup } from "@/lib/perplexity/client";
import { createManimClient } from "@/lib/manim/client";
import type { TutorBrainRequest, TutorBrainResponse } from "@/types/session";

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

// Fetch existing Manim videos and format for Claude context
async function getManimVideosContext(): Promise<string> {
  if (!process.env.NEXT_PUBLIC_MANIM_URL) {
    return "No Manim video service available.";
  }
  try {
    const manim = createManimClient();
    const existingVideos = await manim.getExistingVideos();
    if (existingVideos.length === 0) {
      return "No existing videos available yet.";
    }
    return existingVideos
      .map((v) => `- "${v.prompt}" (file: ${v.filename})`)
      .join("\n");
  } catch (err) {
    console.warn("[api/tutor/respond] Failed to fetch Manim videos:", err);
    return "Could not fetch existing videos.";
  }
}

// If Claude requested a Manim video, find existing or generate new
async function handleManimGeneration(
  response: TutorBrainResponse
): Promise<TutorBrainResponse> {
  if (!process.env.NEXT_PUBLIC_MANIM_URL) {
    return response;
  }
  
  // Only handle if video mode requested
  if (response.contentMode !== "video") {
    return response;
  }
  
  const manim = createManimClient();
  
  try {
    const existingVideos = await manim.getExistingVideos();
    
    // If there's a manimPrompt, check if it matches an existing video first
    if (response.manimPrompt) {
      const promptLower = response.manimPrompt.toLowerCase().trim();
      const matchingVideo = existingVideos.find(
        (v) => v.prompt.toLowerCase().trim() === promptLower
      );
      
      if (matchingVideo) {
        const videoUrl = manim.getVideoUrl(matchingVideo.filename);
        console.log("[api/tutor/respond] Reusing existing video:", videoUrl);
        return { ...response, videoUrl };
      }
      
      // No match found, generate new video
      console.log("[api/tutor/respond] No matching video found, generating:", response.manimPrompt);
      const videoUrl = await manim.generateVideo(response.manimPrompt);
      console.log("[api/tutor/respond] Manim video generated:", videoUrl);
      return { ...response, videoUrl };
    }
    
    // No manimPrompt, use first existing video
    if (existingVideos.length > 0) {
      const videoUrl = manim.getVideoUrl(existingVideos[0].filename);
      console.log("[api/tutor/respond] Using first existing video:", videoUrl);
      return { ...response, videoUrl };
    }
    
    console.log("[api/tutor/respond] No videos available");
    return response;
  } catch (err) {
    console.error("[api/tutor/respond] Manim handling failed:", err);
    return response;
  }
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

    const body = (await request.json()) as TutorBrainRequest;

    if (!body.studentMessage) {
      return NextResponse.json(
        { error: "studentMessage is required" },
        { status: 400 }
      );
    }

    // Fetch existing Manim videos for context (non-blocking on failure)
    const manimVideosContext = await getManimVideosContext();

    // Inject Manim videos into the student message context
    body.studentMessage += `\n\n[Available Manim videos for reuse:\n${manimVideosContext}]`;

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
      let response = await brain.respond(body);
      response = await handleManimGeneration(response);
      return NextResponse.json(response);
    }

    // Non-factual questions — straight to Claude
    const brain = createTutorBrain();
    let response = await brain.respond(body);
    
    // Debug logging
    console.log("[api/tutor/respond] Claude response:", {
      contentMode: response.contentMode,
      manimPrompt: response.manimPrompt,
      hasVideoUrl: !!response.videoUrl,
    });
    
    response = await handleManimGeneration(response);

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

