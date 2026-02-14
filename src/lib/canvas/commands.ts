// Canvas module — command executor + math templates
// Translates CanvasCommand objects into tldraw Editor API calls.
// No tldraw types leak outside this module.
// See: specs/001-minerva-mvp/contracts/canvas.md
//
// tldraw v4 uses richText (toRichText) instead of plain text prop.
// isReadonly blocks createShapes — toggle off for AI drawing, back on after.

import { createShapeId, toRichText, getIndices } from "tldraw";
import type { Editor, IndexKey } from "tldraw";
import type { CanvasCommand } from "@/types/session";
import type { CanvasExecutor } from "./types";

export type { CanvasExecutor };

function withWriteAccess(editor: Editor, fn: () => void) {
  const wasReadonly = editor.getIsReadonly();
  if (wasReadonly) editor.updateInstanceState({ isReadonly: false });
  try {
    fn();
  } finally {
    if (wasReadonly) editor.updateInstanceState({ isReadonly: true });
  }
}

export function createCanvasExecutor(editorRef: unknown): CanvasExecutor {
  const editor = editorRef as Editor;

  function execute(command: CanvasCommand): string | void {
    try {
      switch (command.action) {
        case "clear": {
          withWriteAccess(editor, () => {
            const ids = [...editor.getCurrentPageShapeIds()];
            if (ids.length > 0) editor.deleteShapes(ids);
          });
          return;
        }

        case "drawEquation": {
          const id = createShapeId();
          withWriteAccess(editor, () => {
            editor.createShape({
              id,
              type: "text",
              x: command.x,
              y: command.y,
              props: {
                richText: toRichText(command.equation),
                color: "black" as const,
                size: "l" as const,
                font: "mono" as const,
                autoSize: true,
                w: 400,
                scale: 1,
              },
            });
          });
          return id;
        }

        case "drawNumberLine": {
          const lineId = createShapeId();
          withWriteAccess(editor, () => {
            const range = command.max - command.min;
            const width = Math.max(range * 60, 400);

            // Main line — use getIndices for proper IndexKey values
            const [li1, li2] = getIndices(2);
            editor.createShape({
              id: lineId,
              type: "line",
              x: 50,
              y: command.y,
              props: {
                color: "black" as const,
                dash: "solid" as const,
                size: "m" as const,
                spline: "line" as const,
                scale: 1,
                points: {
                  [li1]: { id: li1, index: li1 as IndexKey, x: 0, y: 0 },
                  [li2]: { id: li2, index: li2 as IndexKey, x: width, y: 0 },
                },
              },
            });

            // Tick marks and labels
            for (let i = command.min; i <= command.max; i++) {
              const xPos = 50 + ((i - command.min) / range) * width;
              const tickId = createShapeId();
              const [ti1, ti2] = getIndices(2);
              editor.createShape({
                id: tickId,
                type: "line",
                x: xPos,
                y: command.y - 10,
                props: {
                  color: "black" as const,
                  dash: "solid" as const,
                  size: "s" as const,
                  spline: "line" as const,
                  scale: 1,
                  points: {
                    [ti1]: { id: ti1, index: ti1 as IndexKey, x: 0, y: 0 },
                    [ti2]: { id: ti2, index: ti2 as IndexKey, x: 0, y: 20 },
                  },
                },
              });

              const labelId = createShapeId();
              editor.createShape({
                id: labelId,
                type: "text",
                x: xPos - 8,
                y: command.y + 16,
                props: {
                  richText: toRichText(String(i)),
                  color: "black" as const,
                  size: "s" as const,
                  font: "mono" as const,
                  autoSize: true,
                  w: 40,
                  scale: 1,
                },
              });
            }
          });
          return lineId;
        }

        case "drawCoordinatePlane": {
          const xAxisId = createShapeId();
          withWriteAccess(editor, () => {
            const size = 300;

            // X-axis (arrow) — tldraw v4 requires kind, labelColor, font, labelPosition, elbowMidPoint
            editor.createShape({
              id: xAxisId,
              type: "arrow",
              x: command.originX - size / 2,
              y: command.originY,
              props: {
                kind: "arc" as const,
                start: { x: 0, y: 0 },
                end: { x: size, y: 0 },
                color: "black" as const,
                labelColor: "black" as const,
                dash: "solid" as const,
                size: "m" as const,
                fill: "none" as const,
                arrowheadStart: "none" as const,
                arrowheadEnd: "arrow" as const,
                font: "draw" as const,
                richText: toRichText("x"),
                labelPosition: 0.5,
                bend: 0,
                scale: 1,
                elbowMidPoint: 0.5,
              },
            });

            // Y-axis (arrow)
            const yAxisId = createShapeId();
            editor.createShape({
              id: yAxisId,
              type: "arrow",
              x: command.originX,
              y: command.originY + size / 2,
              props: {
                kind: "arc" as const,
                start: { x: 0, y: 0 },
                end: { x: 0, y: -size },
                color: "black" as const,
                labelColor: "black" as const,
                dash: "solid" as const,
                size: "m" as const,
                fill: "none" as const,
                arrowheadStart: "none" as const,
                arrowheadEnd: "arrow" as const,
                font: "draw" as const,
                richText: toRichText("y"),
                labelPosition: 0.5,
                bend: 0,
                scale: 1,
                elbowMidPoint: 0.5,
              },
            });

            // Origin label
            const originLabel = createShapeId();
            editor.createShape({
              id: originLabel,
              type: "text",
              x: command.originX - 20,
              y: command.originY + 5,
              props: {
                richText: toRichText("O"),
                color: "grey" as const,
                size: "s" as const,
                font: "mono" as const,
                autoSize: true,
                w: 30,
                scale: 1,
              },
            });
          });
          return xAxisId;
        }

        case "drawAngle": {
          const lineAId = createShapeId();
          withWriteAccess(editor, () => {
            const len = 120;
            const rad = (command.angle * Math.PI) / 180;
            const [ai1, ai2] = getIndices(2);

            // First ray (horizontal right)
            editor.createShape({
              id: lineAId,
              type: "line",
              x: command.vertexX,
              y: command.vertexY,
              props: {
                color: "blue" as const,
                dash: "solid" as const,
                size: "m" as const,
                spline: "line" as const,
                scale: 1,
                points: {
                  [ai1]: { id: ai1, index: ai1 as IndexKey, x: 0, y: 0 },
                  [ai2]: { id: ai2, index: ai2 as IndexKey, x: len, y: 0 },
                },
              },
            });

            // Second ray at angle
            const lineBId = createShapeId();
            const [bi1, bi2] = getIndices(2);
            editor.createShape({
              id: lineBId,
              type: "line",
              x: command.vertexX,
              y: command.vertexY,
              props: {
                color: "blue" as const,
                dash: "solid" as const,
                size: "m" as const,
                spline: "line" as const,
                scale: 1,
                points: {
                  [bi1]: { id: bi1, index: bi1 as IndexKey, x: 0, y: 0 },
                  [bi2]: {
                    id: bi2,
                    index: bi2 as IndexKey,
                    x: Math.cos(rad) * len,
                    y: -Math.sin(rad) * len,
                  },
                },
              },
            });

            // Angle label
            if (command.label) {
              const labelId = createShapeId();
              const labelDist = 40;
              editor.createShape({
                id: labelId,
                type: "text",
                x: command.vertexX + Math.cos(rad / 2) * labelDist - 10,
                y: command.vertexY - Math.sin(rad / 2) * labelDist - 10,
                props: {
                  richText: toRichText(command.label),
                  color: "blue" as const,
                  size: "s" as const,
                  font: "mono" as const,
                  autoSize: true,
                  w: 60,
                  scale: 1,
                },
              });
            }
          });
          return lineAId;
        }

        case "drawFraction": {
          const numId = createShapeId();
          withWriteAccess(editor, () => {
            // Numerator
            editor.createShape({
              id: numId,
              type: "text",
              x: command.x,
              y: command.y,
              props: {
                richText: toRichText(command.numerator),
                color: "black" as const,
                size: "l" as const,
                font: "mono" as const,
                textAlign: "middle" as const,
                autoSize: true,
                w: 80,
                scale: 1,
              },
            });

            // Fraction bar
            const barId = createShapeId();
            const [fi1, fi2] = getIndices(2);
            editor.createShape({
              id: barId,
              type: "line",
              x: command.x - 10,
              y: command.y + 35,
              props: {
                color: "black" as const,
                dash: "solid" as const,
                size: "m" as const,
                spline: "line" as const,
                scale: 1,
                points: {
                  [fi1]: { id: fi1, index: fi1 as IndexKey, x: 0, y: 0 },
                  [fi2]: { id: fi2, index: fi2 as IndexKey, x: 80, y: 0 },
                },
              },
            });

            // Denominator
            const denId = createShapeId();
            editor.createShape({
              id: denId,
              type: "text",
              x: command.x,
              y: command.y + 42,
              props: {
                richText: toRichText(command.denominator),
                color: "black" as const,
                size: "l" as const,
                font: "mono" as const,
                textAlign: "middle" as const,
                autoSize: true,
                w: 80,
                scale: 1,
              },
            });
          });
          return numId;
        }

        case "highlight": {
          withWriteAccess(editor, () => {
            type TLColor =
              | "black" | "grey" | "light-violet" | "violet" | "blue"
              | "light-blue" | "yellow" | "orange" | "green" | "light-green"
              | "light-red" | "red" | "white";
            const validColors: TLColor[] = [
              "black", "grey", "light-violet", "violet", "blue",
              "light-blue", "yellow", "orange", "green", "light-green",
              "light-red", "red", "white",
            ];
            const color: TLColor = validColors.includes(command.color as TLColor)
              ? (command.color as TLColor)
              : "yellow";

            editor.updateShape({
              id: command.id as ReturnType<typeof createShapeId>,
              type: "text",
              props: { color },
            });
          });
          return;
        }

        case "createShape": {
          const id = createShapeId();
          withWriteAccess(editor, () => {
            const shape = command.shape as Record<string, unknown> & { type: string };
            if (!shape.type) {
              console.warn("[canvas] createShape: missing type property");
              return;
            }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            editor.createShape({ id, ...shape } as any);
          });
          return id;
        }

        default:
          console.warn("[canvas] Unknown command action:", command);
          return;
      }
    } catch (err) {
      // Canvas errors never break the session (per contract)
      console.error("[canvas] Error executing command:", err);
      return;
    }
  }

  return {
    execute,

    async executeSequence(commands: CanvasCommand[], delayMs = 500) {
      for (const cmd of commands) {
        execute(cmd);
        if (delayMs > 0) {
          await new Promise((r) => setTimeout(r, delayMs));
        }
      }
    },

    clear() {
      execute({ action: "clear" });
    },

    getSnapshot(): string {
      try {
        const shapes = editor.getCurrentPageShapes();
        if (shapes.length === 0) return "Canvas is empty.";

        const descriptions = shapes.map((shape) => {
          const props = shape.props as Record<string, unknown>;
          const type = shape.type;
          const x = Math.round(shape.x);
          const y = Math.round(shape.y);

          if (type === "text" && props.richText) {
            const rt = props.richText as { content?: { content?: { text?: string }[] }[] };
            const text = rt?.content
              ?.flatMap((p) => p.content?.map((c) => c.text) ?? [])
              .join("") ?? "";
            return `Text "${text}" at (${x}, ${y})`;
          }
          return `${type} shape at (${x}, ${y})`;
        });

        return descriptions.join("\n");
      } catch {
        return "Canvas state unavailable.";
      }
    },
  };
}
