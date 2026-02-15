// Claude tutor brain — AI SDK wrapper with Tool Calling
// Uses Vercel AI SDK (@ai-sdk/anthropic, @ai-sdk/google) for multi-model support.
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

import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import { generateObject, streamText, tool, stepCountIs, type ModelMessage, type LanguageModel } from "ai";
import { z } from "zod";
import type {
  TutorBrainRequest,
  SessionSummary,
  LearningPlan,
  AIModelId,
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
      "Display or generate a 3Blue1Brown-style Manim math animation video. Prefer reusing existing videos when available. Only generate new videos when student explicitly requests an animation.",
    inputSchema: z.object({
      existingFile: z.string().optional().describe("Filename of existing video to reuse (e.g., 'abc123.mp4')"),
      generatePrompt: z
        .string()
        .optional()
        .describe("Prompt to generate NEW video (30-120s generation time). End with 'Make a video no longer than 30 seconds.'"),
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

  setContentMode: tool({
    description:
      "Switch the main content panel display mode. Use 'math' for Desmos/GeoGebra, 'sandbox' for HTML content, 'video' for Manim animations, 'welcome' for initial greeting state.",
    inputSchema: z.object({
      mode: z.enum(["welcome", "math", "sandbox", "video"]).describe("Content mode to switch to"),
    }),
    // No execute - client handles UI state
  }),

  getExistingVideos: tool({
    description: "Get a list of existing Manim videos.",
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
  if (request.masteryScores && request.masteryScores.length > 0) {
    const masteryText = request.masteryScores
      .map((m) => `${m.subject}/${m.topic}: ${Math.round(m.score * 100)}%`)
      .join(", ");
    contextParts.push(`Mastery: ${masteryText}`);
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
          temperature: 0.5,
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
        let firstTokenLogged = false;
        let tokenCount = 0;
        let stepNumber = 0;

        // Process the full stream for text and tool events
        // AI SDK fullStream events: start-step, text-start, text-delta, text-end, tool-call, tool-result, finish-step
        // Multi-step flow: After tool with execute() runs, a NEW step starts with Claude's follow-up response
        for await (const chunk of result.fullStream) {
          // Handle start of new step (resets for multi-step tool execution)
          if (chunk.type === "start-step") {
            stepNumber++;
            speechBuffer = ""; // Reset buffer for new step
            console.log(
              `[Latency:claude] START_STEP ${stepNumber} +${Date.now() - streamT0}ms`
            );
          }

          // Handle text deltas (speech)
          if (chunk.type === "text-delta") {
            tokenCount++;
            if (!firstTokenLogged) {
              firstTokenLogged = true;
              console.log(
                `[Latency:claude] FIRST_TOKEN +${Date.now() - streamT0}ms | TTFT (time to first token)`
              );
            }
            speechBuffer += chunk.text;
          }

          // Handle text-end - emit speech for this step
          // This fires when text generation for a step completes (before tool calls execute)
          if (chunk.type === "text-end") {
            if (speechBuffer.trim()) {
              console.log(
                `[Latency:claude] SPEECH_COMPLETE (step ${stepNumber}) +${Date.now() - streamT0}ms | "${speechBuffer.slice(0, 60)}..."`
              );
              yield { type: "speech", speech: speechBuffer.trim() };
              speechBuffer = ""; // Clear after emitting
            }
          }

          // Handle tool calls - emit for frontend/route to process
          if (chunk.type === "tool-call") {
            // Safety: emit any accumulated speech before tool call (in case text-end didn't fire)
            if (speechBuffer.trim()) {
              console.log(
                `[Latency:claude] SPEECH_COMPLETE (before tool) +${Date.now() - streamT0}ms | "${speechBuffer.slice(0, 60)}..."`
              );
              yield { type: "speech", speech: speechBuffer.trim() };
              speechBuffer = "";
            }

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

        // Fallback: emit any remaining speech (shouldn't normally hit this)
        if (speechBuffer.trim()) {
          console.log(
            `[Latency:claude] SPEECH_COMPLETE (fallback) +${Date.now() - streamT0}ms | "${speechBuffer.slice(0, 60)}..."`
          );
          yield { type: "speech", speech: speechBuffer.trim() };
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
