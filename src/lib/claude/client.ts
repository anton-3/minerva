// Claude tutor brain — Anthropic SDK wrapper
// Wraps @anthropic-ai/sdk. No Anthropic types leak outside.
// See: specs/001-minerva-mvp/contracts/tutor-brain.md
//
// Uses structured outputs (GA since SDK v0.72.0):
// - output_config.format with zodOutputFormat for typed JSON
// - Response in content[0].text, parsed with JSON.parse
// - Regex fallback for malformed responses

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
  generateSummary(
    transcript: { speaker: string; text: string }[]
  ): Promise<SessionSummary>;
  generateLearningPlan(goals: string[], subject: string): Promise<LearningPlan>;
}

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
  manimVideoUrl: z.string().optional(),
  contentMode: z.enum(["math", "sandbox", "manim"]).optional(),
  sandboxHtml: z.string().optional(),
  sandboxTemplate: z.enum(["centered", "split", "steps", "comparison", "chart", "interactive"]).optional(),
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

export function createTutorBrain(): TutorBrain {
  const client = new Anthropic();

  return {
    async respond(request: TutorBrainRequest): Promise<TutorBrainResponse> {
      // Trim conversation history to last MAX_HISTORY messages
      const recentHistory = request.conversationHistory.slice(-MAX_HISTORY);

      // Build context for Claude
      const contextParts: string[] = [];
      if (request.studentProfile) {
        const p = request.studentProfile;
        contextParts.push(
          `Student: ${p.name}, age ${p.age}, grade ${p.grade}`
        );
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

      // Build user content — text or multimodal (text + image)
      const userText = `${request.studentMessage}${contextBlock}`;
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

      try {
        const hasImage = !!request.imageData;

        // Vision requests: skip output_config (structured outputs can be unreliable with images on Haiku)
        // Instead, append JSON instruction to system prompt and parse manually
        const systemPrompt = hasImage
          ? TUTOR_SYSTEM_PROMPT + `\n\nRESPONSE FORMAT: You MUST respond with a valid JSON object. Example: {"speech": "your spoken response here", "contentMode": "sandbox", "sandboxHtml": "<html>...</html>"}\nOnly output the JSON object, nothing else.`
          : TUTOR_SYSTEM_PROMPT;

        const createParams: Anthropic.MessageCreateParams = {
          model: MODEL_FAST,
          max_tokens: 4096,
          temperature: 0.4,
          system: systemPrompt,
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


    async generateSummary(
      transcript: { speaker: string; text: string }[]
    ): Promise<SessionSummary> {
      const transcriptText = transcript
        .map((t) => `${t.speaker}: ${t.text}`)
        .join("\n");

      const response = await client.messages.create({
        model: MODEL,
        max_tokens: 1024,
        system: SUMMARY_SYSTEM_PROMPT,
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
        system: LEARNING_PLAN_SYSTEM_PROMPT,
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
