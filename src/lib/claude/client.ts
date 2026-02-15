// Claude tutor brain — Anthropic SDK wrapper
// Wraps @anthropic-ai/sdk. No Anthropic types leak outside.
// See: specs/001-minerva-mvp/contracts/tutor-brain.md
//
// Uses structured outputs (GA since SDK v0.72.0):
// - output_config.format with zodOutputFormat for typed JSON
// - Response in content[0].text, parsed with JSON.parse
// - Regex fallback for malformed responses
//
// Latency optimizations:
// - Module-level Anthropic client singleton (reuses HTTP connections, avoids TLS handshake per request)
// - Prompt caching via cache_control: { type: "ephemeral" } on all system prompts
//   (after first request, subsequent requests skip re-processing the system prompt — saves ~200-500ms)

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import type {
  TutorBrainRequest,
  TutorBrainResponse,
  SessionSummary,
  LearningPlan,
} from "@/types/session";
import {
  TUTOR_SYSTEM_PROMPT,
  SUMMARY_SYSTEM_PROMPT,
  LEARNING_PLAN_SYSTEM_PROMPT,
} from "./prompts";

export interface TutorBrain {
  respond(request: TutorBrainRequest): Promise<TutorBrainResponse>;
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
  | { type: "result"; data: Omit<TutorBrainResponse, "speech"> };

// Zod schemas for structured output
// Multi-tool canvas commands: Desmos, Desmos 3D, GeoGebra
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

const TutorResponseSchema = z.object({
  speech: z.string(),
  canvasCommands: z.array(CanvasCommandSchema).optional(),
  progressUpdate: z
    .object({
      topic: z.string(),
      score: z.number(),
      velocity: z.enum(["improving", "plateau", "struggling"]).optional(),
    })
    .optional(),
  contentMode: z.enum(["welcome", "math", "sandbox", "video"]).optional(),
  sandboxContent: z.string().optional(),
  sandboxAccent: z.string().optional(),
  manimVideoFile: z.string().optional(),
  manimPrompt: z.string().optional(),
});

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

// Try to parse JSON from text that might have extra content around it
function tryParseJson(text: string): TutorBrainResponse | null {
  // Direct parse first
  try {
    const obj = JSON.parse(text);
    if (obj && typeof obj.speech === "string") return obj as TutorBrainResponse;
  } catch {
    // fall through
  }

  // Try extracting JSON object from text (Claude sometimes wraps with text)
  const jsonMatch = text.match(/\{[\s\S]*"speech"\s*:[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const obj = JSON.parse(jsonMatch[0]);
      if (obj && typeof obj.speech === "string") return obj as TutorBrainResponse;
    } catch {
      // fall through
    }
  }

  // Extract speech field via regex as last structured attempt
  const speechMatch = text.match(/"speech"\s*:\s*"([^"]*(?:\\.[^"]*)*)"/);
  if (speechMatch) {
    return { speech: speechMatch[1].replace(/\\"/g, '"') };
  }

  return null;
}

// Extract speech from malformed responses via regex
function extractSpeechFallback(text: string): TutorBrainResponse {
  return tryParseJson(text) ?? { speech: text.slice(0, 500) || "I'm having trouble right now. Can you try again?" };
}

// Haiku for real-time tutoring (fast TTFT ~300ms vs Sonnet's ~1.5s)
// Sonnet for non-latency-critical tasks (summaries, learning plans)
const MODEL_FAST = "claude-haiku-4-5-20251001";
const MODEL = "claude-sonnet-4-5-20250929";
const MAX_HISTORY = 20;

// Module-level singleton — reuses underlying HTTP connections across requests
// (avoids TLS handshake per request when createTutorBrain() is called repeatedly)
const client = new Anthropic();

// Helper: build Claude request from TutorBrainRequest (shared by respond + respondStream)
function buildClaudeRequest(request: TutorBrainRequest): {
  messages: Anthropic.MessageParam[];
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
      `Learning Plan: ${lp.subject} — Current topic: "${lp.currentTopic}". Goals: ${lp.goals.join(", ")}`
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

  const userContent: Anthropic.ContentBlockParam[] = request.imageData
    ? [
        {
          type: "image" as const,
          source: {
            type: "base64" as const,
            media_type: request.imageData.mediaType,
            data: request.imageData.base64,
          },
        },
        { type: "text" as const, text: userText },
      ]
    : [{ type: "text" as const, text: userText }];

  const messages: Anthropic.MessageParam[] = [
    ...recentHistory.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    {
      role: "user" as const,
      content: userContent,
    },
  ];

  const systemPrompt = hasImage
    ? TUTOR_SYSTEM_PROMPT +
      `\n\nRESPONSE FORMAT: You MUST respond with a valid JSON object. Example: {"speech": "your spoken response here", "contentMode": "sandbox", "sandboxContent": "<div>...</div>", "sandboxAccent": "physics"}\nOnly output the JSON object, nothing else.`
    : TUTOR_SYSTEM_PROMPT;

  return { messages, systemPrompt, hasImage };
}

export function createTutorBrain(): TutorBrain {
  return {
    async respond(request: TutorBrainRequest): Promise<TutorBrainResponse> {
      const { messages, systemPrompt, hasImage } = buildClaudeRequest(request);

      try {
        const createParams: Anthropic.MessageCreateParams = {
          model: MODEL_FAST,
          max_tokens: 4096,
          temperature: 0.4,
          system: [
            {
              type: "text" as const,
              text: systemPrompt,
              cache_control: { type: "ephemeral" as const },
            },
          ],
          messages,
          ...(hasImage
            ? {}
            : {
                output_config: {
                  format: zodOutputFormat(TutorResponseSchema),
                },
                thinking: {
                  type: "disabled" as const,
                },
              }),
        };

        const response = await client.messages.create(createParams);

        const text =
          response.content[0].type === "text" ? response.content[0].text : "";

        // Try robust parsing (handles extra text, partial JSON, etc.)
        const robust = tryParseJson(text);
        if (robust) {
          const parsed = TutorResponseSchema.safeParse(robust);
          return (parsed.success ? parsed.data : robust) as TutorBrainResponse;
        }

        // Direct Zod parse as fallback
        const parsed = TutorResponseSchema.safeParse(JSON.parse(text));
        if (parsed.success) {
          return parsed.data as TutorBrainResponse;
        }

        console.warn("[tutor] Zod validation failed, using raw parse");
        return JSON.parse(text) as TutorBrainResponse;
      } catch (err) {
        console.error("[tutor] Error calling Claude:", err);
        // Regex fallback for malformed responses
        if (err instanceof SyntaxError) {
          return extractSpeechFallback(String(err));
        }
        return {
          speech:
            "I'm having a little trouble right now. Can you repeat what you said?",
        };
      }
    },

    async *respondStream(
      request: TutorBrainRequest,
      signal?: AbortSignal
    ): AsyncGenerator<TutorStreamEvent> {
      const streamT0 = Date.now();
      console.log(`[Latency:claude] RESPOND_STREAM_START +0ms`);

      const { messages, systemPrompt, hasImage } = buildClaudeRequest(request);
      const SPEECH_REGEX = /"speech"\s*:\s*"((?:[^"\\]|\\.)*)"\s*[,}]/;

      console.log(
        `[Latency:claude] REQUEST_BUILT +${Date.now() - streamT0}ms | model=${MODEL_FAST} history=${messages.length} msgs`
      );

      try {
        const stream = client.messages.stream(
          {
            model: MODEL_FAST,
            max_tokens: 4096,
            system: [
              {
                type: "text" as const,
                text: systemPrompt,
                cache_control: { type: "ephemeral" as const },
              },
            ],
            messages,
            ...(hasImage
              ? {}
              : {
                  output_config: {
                    format: zodOutputFormat(TutorResponseSchema),
                  },
                  thinking: { type: "disabled" as const },
                }),
          },
          signal ? { signal } : undefined
        );

        console.log(
          `[Latency:claude] STREAM_CREATED +${Date.now() - streamT0}ms | waiting for first token...`
        );

        let buffer = "";
        let speechEmitted = false;
        let firstTokenLogged = false;
        let tokenCount = 0;

        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            tokenCount++;
            if (!firstTokenLogged) {
              firstTokenLogged = true;
              console.log(
                `[Latency:claude] FIRST_TOKEN +${Date.now() - streamT0}ms | TTFT (time to first token)`
              );
            }

            buffer += event.delta.text;

            if (!speechEmitted) {
              const match = buffer.match(SPEECH_REGEX);
              if (match) {
                speechEmitted = true;
                console.log(
                  `[Latency:claude] SPEECH_EXTRACTED +${Date.now() - streamT0}ms | tokens so far: ${tokenCount}`
                );
                // Use JSON.parse for proper unescape of JSON string values
                let speech: string;
                try {
                  speech = JSON.parse(`"${match[1]}"`);
                } catch {
                  speech = match[1]
                    .replace(/\\"/g, '"')
                    .replace(/\\n/g, "\n")
                    .replace(/\\\\/g, "\\");
                }
                yield { type: "speech", speech };
              }
            }
          }
        }

        console.log(
          `[Latency:claude] STREAM_COMPLETE +${Date.now() - streamT0}ms | total tokens: ${tokenCount}`
        );

        // Stream finished — parse full response for remaining fields
        const fullResponse = tryParseJson(buffer);
        if (fullResponse) {
          if (!speechEmitted) {
            yield { type: "speech", speech: fullResponse.speech };
          }
          const { speech: _, ...rest } = fullResponse;
          console.log(
            `[Latency:claude] RESULT_YIELDED +${Date.now() - streamT0}ms | keys: ${Object.keys(rest).join(",") || "none"}`
          );
          yield { type: "result", data: rest };
        } else if (!speechEmitted) {
          yield {
            type: "speech",
            speech:
              buffer.slice(0, 500) ||
              "I'm having trouble right now. Can you try again?",
          };
        }
      } catch (err) {
        if (signal?.aborted) return;
        console.error("[tutor] Stream error:", err);
        yield {
          type: "speech",
          speech:
            "I'm having a little trouble right now. Can you repeat what you said?",
        };
      }
    },

    async generateSummary(
      transcript: { speaker: string; text: string }[]
    ): Promise<SessionSummary> {
      const transcriptText = transcript
        .map((t) => `${t.speaker}: ${t.text}`)
        .join("\n");

      const response = await client.messages.create({
        model: MODEL,
        max_tokens: 1024,
        system: [
          {
            type: "text" as const,
            text: SUMMARY_SYSTEM_PROMPT,
            cache_control: { type: "ephemeral" as const },
          },
        ],
        messages: [
          {
            role: "user",
            content: `Generate a summary for this tutoring session transcript:\n\n${transcriptText}`,
          },
        ],
        output_config: {
          format: zodOutputFormat(SessionSummarySchema),
        },
      });

      const text =
        response.content[0].type === "text" ? response.content[0].text : "{}";
      return JSON.parse(text) as SessionSummary;
    },

    async generateLearningPlan(
      goals: string[],
      subject: string
    ): Promise<LearningPlan> {
      const response = await client.messages.create({
        model: MODEL,
        max_tokens: 1024,
        system: [
          {
            type: "text" as const,
            text: LEARNING_PLAN_SYSTEM_PROMPT,
            cache_control: { type: "ephemeral" as const },
          },
        ],
        messages: [
          {
            role: "user",
            content: `Subject: ${subject}\nGoals:\n${goals.map((g) => `- ${g}`).join("\n")}\n\nGenerate a structured learning plan.`,
          },
        ],
        output_config: {
          format: zodOutputFormat(LearningPlanSchema),
        },
      });

      const text =
        response.content[0].type === "text" ? response.content[0].text : "{}";
      return JSON.parse(text) as LearningPlan;
    },
  };
}
