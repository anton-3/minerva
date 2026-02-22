// Claude tutor brain — AI SDK wrapper with Tool Calling
// Uses Vercel AI SDK (@ai-sdk/anthropic, @ai-sdk/google, @ai-sdk/openai) for multi-model support.
// See: specs/001-minerva-mvp/contracts/tutor-brain.md
//
// Architecture:
// - Speech is generated as text (streamed for early extraction)
// - Actions are tool calls: executeCanvasCommands, showSandbox, showVideo, updateProgress, setContentMode
// - generateObject() for non-streaming structured outputs (summaries, learning plans)
//
// Latency optimizations:
// - Prompt caching via providerOptions.anthropic.cacheControl: { type: "ephemeral" }
// - Text streams first for early speech → avatar speaks while tools execute
//
// Multi-model support:
// - Anthropic: Claude Sonnet 4.5, Claude Haiku 4.5
// - Google: Gemini 3 Pro, Gemini 3 Flash
// - OpenAI: GPT-5 Nano, GPT-5.2 Chat

import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
import { generateObject, streamText, tool, stepCountIs, type ModelMessage, type LanguageModel } from "ai";
import { z } from "zod";
import type {
  TutorBrainRequest,
  SessionSummary,
  LearningPlan,
  AIModelId,
  ContentStep,
} from "@/types/session";
import { DEFAULT_MODEL } from "@/types/session";
import {
  TUTOR_SYSTEM_PROMPT,
  SUMMARY_SYSTEM_PROMPT,
  LEARNING_PLAN_SYSTEM_PROMPT,
} from "./prompts";
import { createManimClient } from "../manim/client";

export interface TutorBrain {
  respondStream(
    request: TutorBrainRequest,
    signal?: AbortSignal
  ): AsyncGenerator<TutorStreamEvent>;
  generateSummary(
    transcript: { speaker: string; text: string }[]
  ): Promise<SessionSummary>;
  generateLearningPlan(goals: string[], subject: string): Promise<LearningPlan>;
}

// SSE stream events emitted by respondStream()
export type TutorStreamEvent =
  | { type: "speech"; speech: string }
  | { type: "tts-sentence"; sentence: string }
  | { type: "tool-call"; toolName: string; toolCallId: string; input: unknown }
  | { type: "tool-result"; toolName: string; toolCallId: string; output: unknown }
  | { type: "done" };

// Zod schemas for tool inputs
const MathToolSchema = z.enum(["desmos", "desmos3d", "geogebra"]);

const CanvasCommandSchema = z.discriminatedUnion("action", [
  // Meta commands
  z.object({ action: z.literal("clear") }),
  z.object({ action: z.literal("setTool"), tool: MathToolSchema }),

  // Desmos 2D commands
  z.object({
    action: z.literal("desmos.setExpression"),
    id: z.string().optional(),
    latex: z.string(),
    color: z.string().optional(),
    hidden: z.boolean().optional(),
  }),
  z.object({
    action: z.literal("desmos.removeExpression"),
    id: z.string(),
  }),
  z.object({
    action: z.literal("desmos.setViewport"),
    left: z.number(),
    right: z.number(),
    top: z.number(),
    bottom: z.number(),
  }),
  z.object({ action: z.literal("desmos.clear") }),

  // Desmos 3D commands
  z.object({
    action: z.literal("desmos3d.setExpression"),
    id: z.string().optional(),
    latex: z.string(),
    color: z.string().optional(),
  }),
  z.object({
    action: z.literal("desmos3d.removeExpression"),
    id: z.string(),
  }),
  z.object({ action: z.literal("desmos3d.clear") }),

  // GeoGebra commands
  z.object({
    action: z.literal("geogebra.evalCommand"),
    command: z.string(),
  }),
  z.object({
    action: z.literal("geogebra.setCoords"),
    name: z.string(),
    x: z.number(),
    y: z.number(),
  }),
  z.object({
    action: z.literal("geogebra.deleteObject"),
    name: z.string(),
  }),
  z.object({ action: z.literal("geogebra.clear") }),
]);

// Schemas for generateObject (summaries, learning plans)
const SessionSummarySchema = z.object({
  summary: z.string(),
  topicsCovered: z.array(z.string()),
  strengths: z.array(z.string()),
  areasForImprovement: z.array(z.string()),
  engagementScore: z.number(),
  comprehensionScore: z.number(),
});

const LearningPlanSchema = z.object({
  subject: z.string(),
  topics: z.array(
    z.object({
      name: z.string(),
      description: z.string(),
      prerequisites: z.array(z.string()),
    })
  ),
  currentTopic: z.string(),
});

// Define tutor tools for AI SDK
// NOTE: Tools without execute() are client-side (frontend handles them)
// Tools with execute() run server-side
const tutorTools = {
  executeCanvasCommands: tool({
    description:
      "Execute math visualization commands on Desmos (2D graphing), Desmos 3D (3D graphing), or GeoGebra (geometry). Use for pure math problems like graphing functions, plotting points, constructing geometric figures.",
    inputSchema: z.object({
      commands: z.array(CanvasCommandSchema).describe("Array of canvas commands to execute"),
    }),
    // No execute - client handles DOM operations
  }),

  showSandbox: tool({
    description:
      "Display interactive HTML content for non-math subjects: physics, chemistry, biology, history, geography, etc. The content will be rendered in a sandboxed iframe. Include all CSS inline. No external resources.",
    inputSchema: z.object({
      content: z.string().describe("HTML content body (will be wrapped with dark theme template)"),
      accent: z
        .string()
        .describe("Subject for accent color: physics, chemistry, biology, history, literature, geography, economics"),
    }),
    // No execute - client handles DOM rendering
  }),

  showVideo: tool({
    description:
      "Present a 3Blue1Brown-style math animation to teach a concept. Use existingFile to present an available animation. Only use generatePrompt if the student explicitly asks for a custom animation (takes 30-120s).",
    inputSchema: z.object({
      existingFile: z.string().optional().describe("Filename of animation to present (e.g., 'abc123.mp4')"),
      generatePrompt: z
        .string()
        .optional()
        .describe("Prompt to generate NEW animation (30-120s). End with 'Make a video no longer than 30 seconds.'"),
    }),
    // Has execute - server calls Manim API (handled in route.ts)
  }),

  updateProgress: tool({
    description: "Record student mastery progress on a topic. Call this after the student demonstrates understanding or struggles with a concept.",
    inputSchema: z.object({
      topic: z.string().describe("The topic being assessed"),
      score: z.number().min(0).max(1).describe("Mastery score from 0.0 to 1.0"),
      velocity: z
        .enum(["improving", "plateau", "struggling"])
        .optional()
        .describe("Learning velocity trend"),
    }),
    // Has execute - server writes to DB (handled in route.ts)
  }),

  showSteps: tool({
    description:
      "Draw on Minerva's whiteboard. Write equations, text, diagrams, and annotate previous content with circles, arrows, underlines, boxes. Each element animates as if being written/drawn. Use this as your PRIMARY teaching tool for step-by-step instruction.",
    inputSchema: z.object({
      steps: z.array(z.discriminatedUnion("type", [
        z.object({ type: z.literal("clear") }),
        z.object({
          type: z.literal("step"),
          label: z.string().optional().describe("Label like 'Step 1', 'Given', 'Answer'"),
          math: z.string().optional().describe("LaTeX math expression (e.g., '2x + 5 = 13')"),
          text: z.string().optional().describe("Plain text explanation"),
        }),
        z.object({
          type: z.literal("diagram"),
          svg: z.string().describe("SVG markup string for hand-drawn diagram"),
        }),
        z.object({
          type: z.literal("numberLine"),
          min: z.number().describe("Left end of number line"),
          max: z.number().describe("Right end of number line"),
          highlights: z.array(z.number()).optional().describe("Numbers to highlight on the line"),
        }),
        z.object({
          type: z.literal("divider"),
          label: z.string().optional().describe("Optional section heading"),
        }),
        // Inline content blocks — unified board (replaces separate content modes)
        z.object({
          type: z.literal("graph"),
          tool: MathToolSchema.describe("Which graphing tool: desmos, desmos3d, or geogebra"),
          expressions: z.array(z.object({
            latex: z.string().describe("Math expression in LaTeX"),
            id: z.string().optional().describe("Unique ID for this expression"),
            color: z.string().optional().describe("Expression color (CSS color)"),
          })).optional().describe("Math expressions to plot"),
          viewport: z.object({
            left: z.number(), right: z.number(), top: z.number(), bottom: z.number(),
          }).optional().describe("Visible viewport bounds"),
        }),
        z.object({
          type: z.literal("sandbox"),
          html: z.string().describe("HTML content (will be rendered in sandboxed iframe)"),
          accent: z.string().optional().describe("Subject: physics, chemistry, biology, history, etc."),
          height: z.number().optional().describe("Height in pixels (default: 400)"),
        }),
        z.object({
          type: z.literal("video"),
          url: z.string().describe("Video URL to play"),
          autoPlay: z.boolean().optional().describe("Auto-play the video (default: true)"),
        }),
        z.object({
          type: z.literal("image"),
          src: z.string().describe("Image URL"),
          alt: z.string().optional().describe("Alt text description"),
          width: z.number().optional().describe("Display width in pixels"),
        }),
        z.object({
          type: z.literal("code"),
          language: z.string().describe("Programming language (python, javascript, etc.)"),
          code: z.string().describe("Source code to display"),
        }),
        // Annotation types — reference previous content elements by index
        z.object({
          type: z.literal("circle"),
          target: z.number().describe("Index of content element to circle (0-based)"),
          color: z.string().optional().describe("Circle color (default: red)"),
        }),
        z.object({
          type: z.literal("underline"),
          target: z.number().describe("Index of content element to underline (0-based)"),
          color: z.string().optional().describe("Underline color (default: blue)"),
        }),
        z.object({
          type: z.literal("arrow"),
          from: z.number().describe("Index of source element"),
          to: z.number().describe("Index of target element"),
          label: z.string().optional().describe("Text label on the arrow"),
        }),
        z.object({
          type: z.literal("box"),
          target: z.number().describe("Index of content element to box (0-based)"),
          color: z.string().optional().describe("Box color (default: green)"),
        }),
        z.object({
          type: z.literal("crossOut"),
          target: z.number().describe("Index of content element to cross out (0-based)"),
        }),
        z.object({
          type: z.literal("highlight"),
          stepIndex: z.number().describe("Index of step to highlight (0-based)"),
          color: z.string().optional().describe("Highlight color (CSS color)"),
        }),
      ])).describe("Array of whiteboard commands: content elements, inline blocks, and annotations"),
    }),
    // No execute - client handles rendering
  }),

  setContentMode: tool({
    description:
      "Switch the main content panel display mode. Use 'math' for Desmos/GeoGebra, 'sandbox' for HTML content, 'video' for Manim animations, 'steps' for step-by-step tutoring, 'welcome' for initial greeting state.",
    inputSchema: z.object({
      mode: z.enum(["welcome", "math", "sandbox", "video", "steps"]).describe("Content mode to switch to"),
    }),
    // No execute - client handles UI state
  }),

  getExistingVideos: tool({
    description: "Check what math animation videos are available to present. Call this when introducing a new math topic to see if a relevant animation exists.",
    inputSchema: z.object({}),
    execute: async () => {
      const manim = createManimClient();
      const videos = await manim.getExistingVideos();
      console.log("Existing videos:", videos);
      return videos;
    },
  }),
};

// Type for tool inputs (used by route.ts)
export type TutorTools = typeof tutorTools;

// Model selection helper — returns the correct provider instance for the given model ID
function getModel(modelId: AIModelId = DEFAULT_MODEL): LanguageModel {
  // Anthropic models
  if (modelId.startsWith("claude-")) {
    return anthropic(modelId);
  }
  // Google Gemini models
  if (modelId.startsWith("gemini-")) {
    return google(modelId);
  }
  // OpenAI models
  if (modelId.startsWith("gpt-")) {
    return openai(modelId);
  }
  // Fallback to default
  console.warn(`[tutor] Unknown model ID: ${modelId}, falling back to default`);
  return anthropic(DEFAULT_MODEL);
}

// Get provider-specific options for the model
function getProviderOptions(modelId: AIModelId = DEFAULT_MODEL) {
  if (modelId.startsWith("claude-")) {
    return {
      anthropic: {
        cacheControl: { type: "ephemeral" as const },
        thinkingConfig: { type: "disabled" as const },
      },
    };
  }
  // Google models don't need special options - return undefined instead of empty object
  return undefined;
}

const MAX_HISTORY = 20;

// Serialize contentSteps into compact text so the model knows what's on the whiteboard.
// Follows the ChatGPT Canvas / Khanmigo pattern: inject structured state each turn.
// Format: indexed lines so the model can reference steps by number for annotations.
function serializeSteps(steps: ContentStep[]): string {
  if (!steps || steps.length === 0) return "";

  const lines: string[] = [];
  let contentIndex = 0; // Only content elements get indices (not annotations)

  for (const s of steps) {
    switch (s.type) {
      case "step": {
        const parts: string[] = [];
        if (s.label) parts.push(s.label + ":");
        if (s.math) parts.push(s.math);
        if (s.text) parts.push(`(${s.text})`);
        lines.push(`[${contentIndex}] ${parts.join(" ")}`);
        contentIndex++;
        break;
      }
      case "divider":
        lines.push(`[${contentIndex}] ─── ${s.label || "section"} ───`);
        contentIndex++;
        break;
      case "numberLine":
        lines.push(`[${contentIndex}] numberLine: ${s.min} to ${s.max}${s.highlights ? `, highlights: ${s.highlights.join(", ")}` : ""}`);
        contentIndex++;
        break;
      case "diagram":
        lines.push(`[${contentIndex}] [diagram]`);
        contentIndex++;
        break;
      // Inline content blocks
      case "graph":
        lines.push(`[${contentIndex}] [${s.tool} graph${s.expressions ? `: ${s.expressions.map(e => e.latex).join(", ")}` : ""}]`);
        contentIndex++;
        break;
      case "sandbox":
        lines.push(`[${contentIndex}] [sandbox${s.accent ? ` (${s.accent})` : ""}]`);
        contentIndex++;
        break;
      case "video":
        lines.push(`[${contentIndex}] [video: ${s.url}]`);
        contentIndex++;
        break;
      case "image":
        lines.push(`[${contentIndex}] [image${s.alt ? `: ${s.alt}` : ""}]`);
        contentIndex++;
        break;
      case "code":
        lines.push(`[${contentIndex}] [code (${s.language}): ${s.code.slice(0, 80)}${s.code.length > 80 ? "..." : ""}]`);
        contentIndex++;
        break;
      // Annotations reference content by index
      case "circle":
        lines.push(`  ↳ [${s.target}] circled${s.color ? ` (${s.color})` : ""}`);
        break;
      case "underline":
        lines.push(`  ↳ [${s.target}] underlined${s.color ? ` (${s.color})` : ""}`);
        break;
      case "box":
        lines.push(`  ↳ [${s.target}] boxed${s.color ? ` (${s.color})` : ""}`);
        break;
      case "arrow":
        lines.push(`  ↳ arrow [${s.from}]→[${s.to}]${s.label ? ` "${s.label}"` : ""}`);
        break;
      case "crossOut":
        lines.push(`  ↳ [${s.target}] crossed out`);
        break;
      case "highlight":
        lines.push(`  ↳ [${s.stepIndex}] highlighted${s.color ? ` (${s.color})` : ""}`);
        break;
      // skip "clear" — already handled by store
    }
  }

  return `Whiteboard (${contentIndex} items):\n${lines.join("\n")}`;
}

// Extract readable text from sandbox HTML (strip tags, scripts, styles).
// Returns a compact summary so the model knows what content the student sees.
function summarizeSandbox(html: string, accent?: string | null): string {
  // Strip <script> and <style> blocks entirely
  let text = html.replace(/<script[\s\S]*?<\/script>/gi, "");
  text = text.replace(/<style[\s\S]*?<\/style>/gi, "");
  // Strip all HTML tags
  text = text.replace(/<[^>]+>/g, " ");
  // Collapse whitespace
  text = text.replace(/\s+/g, " ").trim();
  // Truncate to ~500 chars
  if (text.length > 500) text = text.slice(0, 500) + "...";
  const subject = accent ? ` (${accent})` : "";
  return `Sandbox content${subject}: ${text || "[interactive visualization]"}`;
}

// Helper: build AI SDK messages from TutorBrainRequest
function buildAIMessages(request: TutorBrainRequest): {
  messages: ModelMessage[];
  systemPrompt: string;
  hasImage: boolean;
} {
  const recentHistory = request.conversationHistory.slice(-MAX_HISTORY);

  const contextParts: string[] = [];
  if (request.studentProfile) {
    const p = request.studentProfile;
    contextParts.push(`Student: ${p.name}, age ${p.age}, grade ${p.grade}`);
  }
  if (request.learningPlan) {
    const lp = request.learningPlan;
    contextParts.push(
      `Learning Plan: ${lp.subject} - Current topic: "${lp.currentTopic}". Goals: ${lp.goals.join(", ")}`
    );
  }
  if (request.canvasState) {
    contextParts.push(`Math Canvas:\n${request.canvasState}`);
  }
  if (request.contentSteps && request.contentSteps.length > 0) {
    contextParts.push(serializeSteps(request.contentSteps));
  }
  if (request.sandboxContent && request.contentMode === "sandbox") {
    contextParts.push(summarizeSandbox(request.sandboxContent, request.sandboxAccent));
  }
  if (request.videoUrl && request.contentMode === "video") {
    contextParts.push(`Video playing: ${request.videoUrl}`);
  }
  if (request.masteryScores && request.masteryScores.length > 0) {
    const masteryText = request.masteryScores
      .map((m) => `${m.subject}/${m.topic}: ${Math.round(m.score * 100)}%`)
      .join(", ");
    contextParts.push(`Mastery: ${masteryText}`);
  }
  if (request.contentMode) {
    const modeDescriptions: Record<string, string> = {
      steps: "Step-by-step whiteboard is visible (student sees the content listed above)",
      math: "Math canvas (Desmos/GeoGebra) is visible",
      sandbox: "Interactive HTML sandbox is visible (student sees the content summarized above)",
      video: "A math animation video is playing",
      welcome: "Welcome screen is showing",
    };
    contextParts.push(`Screen: ${modeDescriptions[request.contentMode] || request.contentMode}`);
  }

  const contextBlock =
    contextParts.length > 0
      ? `\n\n--- Context ---\n${contextParts.join("\n")}\n--- End Context ---`
      : "";

  const userText = `${request.studentMessage}${contextBlock}`;
  const hasImage = !!request.imageData;

  // Build user content with optional image
  const userContent = request.imageData
    ? [
        {
          type: "image" as const,
          image: `data:${request.imageData.mediaType};base64,${request.imageData.base64}`,
        },
        { type: "text" as const, text: userText },
      ]
    : userText;

  // Convert conversation history to AI SDK format
  const historyMessages: ModelMessage[] = recentHistory.map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  const messages: ModelMessage[] = [
    ...historyMessages,
    {
      role: "user" as const,
      content: userContent,
    },
  ];

  return { messages, systemPrompt: TUTOR_SYSTEM_PROMPT, hasImage };
}

export function createTutorBrain(): TutorBrain {
  return {
    async *respondStream(
      request: TutorBrainRequest,
      signal?: AbortSignal
    ): AsyncGenerator<TutorStreamEvent> {
      const streamT0 = Date.now();
      console.log(`[Latency:claude] RESPOND_STREAM_START +0ms`);

      const { messages, systemPrompt } = buildAIMessages(request);
      const modelId = request.modelId || DEFAULT_MODEL;
      const model = getModel(modelId);

      console.log(
        `[Latency:claude] REQUEST_BUILT +${Date.now() - streamT0}ms | model=${modelId} history=${messages.length} msgs`
      );

      try {
        // Use streamText with tools for hybrid text + tool calling
        const result = streamText({
          model,
          maxOutputTokens: 4096,
          temperature: 0,
          abortSignal: signal,
          system: systemPrompt,
          messages,
          tools: tutorTools,
          stopWhen: stepCountIs(8), // Allow multi-step tool use
          providerOptions: getProviderOptions(modelId),
        });

        console.log(
          `[Latency:claude] STREAM_CREATED +${Date.now() - streamT0}ms | waiting for first token...`
        );

        let speechBuffer = "";
        let sentenceBuffer = ""; // Accumulates tokens until sentence boundary
        let firstTokenLogged = false;
        let tokenCount = 0;
        let stepNumber = 0;
        let anySpeechEmitted = false; // Track if any speech was generated across all steps
        let toolCallsSeen: string[] = []; // Track tool calls for fallback speech

        // Process the full stream for text and tool events
        // AI SDK fullStream events: start-step, text-start, text-delta, text-end, tool-call, tool-result, finish-step
        // Multi-step flow: After tool with execute() runs, a NEW step starts with Claude's follow-up response
        for await (const chunk of result.fullStream) {
          // Handle start of new step (resets for multi-step tool execution)
          if (chunk.type === "start-step") {
            stepNumber++;
            speechBuffer = "";
            sentenceBuffer = "";
            console.log(
              `[Latency:claude] START_STEP ${stepNumber} +${Date.now() - streamT0}ms`
            );
          }

          // Handle text deltas — detect sentence boundaries for early TTS
          if (chunk.type === "text-delta") {
            tokenCount++;
            if (!firstTokenLogged) {
              firstTokenLogged = true;
              console.log(
                `[Latency:claude] FIRST_TOKEN +${Date.now() - streamT0}ms | TTFT (time to first token)`
              );
            }
            speechBuffer += chunk.text;
            sentenceBuffer += chunk.text;

            // Check for sentence boundary: .!? followed by space or end
            // This lets us start TTS on the first sentence while Claude is still generating
            const sentenceMatch = sentenceBuffer.match(/^([\s\S]*?[.!?])\s+([\s\S]*)/);
            if (sentenceMatch) {
              const completeSentence = sentenceMatch[1].trim();
              sentenceBuffer = sentenceMatch[2]; // Keep remainder
              if (completeSentence.length > 0) {
                console.log(
                  `[Latency:claude] TTS_SENTENCE +${Date.now() - streamT0}ms | "${completeSentence.slice(0, 50)}..."`
                );
                yield { type: "tts-sentence", sentence: completeSentence };
              }
            }
          }

          // Handle text-end — emit full speech for chat + flush remaining sentence
          if (chunk.type === "text-end") {
            // Flush any remaining text as final TTS sentence
            if (sentenceBuffer.trim()) {
              console.log(
                `[Latency:claude] TTS_SENTENCE (final) +${Date.now() - streamT0}ms | "${sentenceBuffer.trim().slice(0, 50)}..."`
              );
              yield { type: "tts-sentence", sentence: sentenceBuffer.trim() };
              sentenceBuffer = "";
            }

            // Emit full speech text for chat display
            if (speechBuffer.trim()) {
              anySpeechEmitted = true;
              console.log(
                `[Latency:claude] SPEECH_COMPLETE (step ${stepNumber}) +${Date.now() - streamT0}ms | "${speechBuffer.slice(0, 60)}..."`
              );
              yield { type: "speech", speech: speechBuffer.trim() };
              speechBuffer = "";
            }
          }

          // Handle tool calls - emit for frontend/route to process
          if (chunk.type === "tool-call") {
            // Flush remaining sentence buffer before tool call
            if (sentenceBuffer.trim()) {
              yield { type: "tts-sentence", sentence: sentenceBuffer.trim() };
              sentenceBuffer = "";
            }
            // Safety: emit any accumulated speech before tool call
            if (speechBuffer.trim()) {
              anySpeechEmitted = true;
              console.log(
                `[Latency:claude] SPEECH_COMPLETE (before tool) +${Date.now() - streamT0}ms | "${speechBuffer.slice(0, 60)}..."`
              );
              yield { type: "speech", speech: speechBuffer.trim() };
              speechBuffer = "";
            }

            toolCallsSeen.push(chunk.toolName);
            console.log(
              `[Latency:claude] TOOL_CALL +${Date.now() - streamT0}ms | ${chunk.toolName}`
            );
            yield {
              type: "tool-call",
              toolName: chunk.toolName,
              toolCallId: chunk.toolCallId,
              input: chunk.input,
            };
          }

          // Handle tool results (from server-executed tools with execute())
          if (chunk.type === "tool-result") {
            console.log(
              `[Latency:claude] TOOL_RESULT +${Date.now() - streamT0}ms | ${chunk.toolName}`
            );
            yield {
              type: "tool-result",
              toolName: chunk.toolName,
              toolCallId: chunk.toolCallId,
              output: chunk.output,
            };
          }
        }

        // Fallback: flush any remaining buffers (shouldn't normally hit this)
        if (sentenceBuffer.trim()) {
          anySpeechEmitted = true;
          yield { type: "tts-sentence", sentence: sentenceBuffer.trim() };
          sentenceBuffer = "";
        }
        if (speechBuffer.trim()) {
          anySpeechEmitted = true;
          console.log(
            `[Latency:claude] SPEECH_COMPLETE (fallback) +${Date.now() - streamT0}ms | "${speechBuffer.slice(0, 60)}..."`
          );
          yield { type: "speech", speech: speechBuffer.trim() };
        }

        // Safety net: if tools were called but no speech was generated,
        // emit fallback speech so the avatar has something to say.
        // GPT-4.1 sometimes calls tools without generating text.
        if (!anySpeechEmitted && toolCallsSeen.length > 0) {
          // Pick contextual fallback based on what tools were called
          const fallbacks: Record<string, string[]> = {
            showSteps: [
              "ok watch the board",
              "here, let me write this out",
              "take a look at this",
              "let me show you what I mean",
            ],
            executeCanvasCommands: [
              "let's see what this looks like on the graph",
              "check out this visualization",
            ],
            showSandbox: [
              "here's what this looks like",
              "take a look at this",
            ],
          };
          const primaryTool = toolCallsSeen[0];
          const options = fallbacks[primaryTool] || ["ok let's take a look at this"];
          const fallback = options[Math.floor(Math.random() * options.length)];
          console.warn(
            `[Latency:claude] NO_SPEECH_FALLBACK +${Date.now() - streamT0}ms | tools=${toolCallsSeen.join(",")} — emitting fallback: "${fallback}"`
          );
          yield { type: "tts-sentence", sentence: fallback };
          yield { type: "speech", speech: fallback };
        }

        console.log(
          `[Latency:claude] STREAM_COMPLETE +${Date.now() - streamT0}ms | total tokens: ${tokenCount}`
        );

        yield { type: "done" };
      } catch (err) {
        if (signal?.aborted) return;
        console.error("[tutor] Stream error:", err);
        yield {
          type: "speech",
          speech:
            "I'm having a little trouble right now. Can you repeat what you said?",
        };
        yield { type: "done" };
      }
    },

    async generateSummary(
      transcript: { speaker: string; text: string }[]
    ): Promise<SessionSummary> {
      const transcriptText = transcript
        .map((t) => `${t.speaker}: ${t.text}`)
        .join("\n");

      // Use default model for summaries (non-latency-critical)
      const { object } = await generateObject({
        model: getModel(DEFAULT_MODEL),
        schema: SessionSummarySchema,
        maxOutputTokens: 1024,
        system: SUMMARY_SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: `Generate a summary for this tutoring session transcript:\n\n${transcriptText}`,
          },
        ],
        providerOptions: getProviderOptions(DEFAULT_MODEL),
      });

      return object as SessionSummary;
    },

    async generateLearningPlan(
      goals: string[],
      subject: string
    ): Promise<LearningPlan> {
      // Use default model for learning plans (non-latency-critical)
      const { object } = await generateObject({
        model: getModel(DEFAULT_MODEL),
        schema: LearningPlanSchema,
        maxOutputTokens: 1024,
        system: LEARNING_PLAN_SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: `Subject: ${subject}\nGoals:\n${goals.map((g) => `- ${g}`).join("\n")}\n\nGenerate a structured learning plan.`,
          },
        ],
        providerOptions: getProviderOptions(DEFAULT_MODEL),
      });

      return object as LearningPlan;
    },
  };
}
