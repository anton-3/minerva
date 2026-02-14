// Desmos 3D Calculator wrapper
// Wraps the Desmos 3D API for 3D graphing.
// API docs: https://www.desmos.com/api/v1.12/docs/3d.html

import type { CanvasCommand } from "@/types/session";
import type { ToolWrapper, DesmosExpressionState } from "./types";

// Desmos 3D Calculator type
interface Desmos3DCalculator {
  setExpression(state: DesmosExpressionState): void;
  removeExpression(state: { id: string }): void;
  getExpressions(): DesmosExpressionState[];
  setBlank(): void;
  destroy(): void;
}

export class Desmos3DWrapper implements ToolWrapper {
  readonly name = "desmos3d" as const;
  private calculator: Desmos3DCalculator | null = null;
  private expressionCounter = 0;

  /** Set the calculator instance (called after Desmos loads) */
  setCalculator(calc: unknown): void {
    this.calculator = calc as Desmos3DCalculator;
  }

  canHandle(command: CanvasCommand): boolean {
    return command.action.startsWith("desmos3d.");
  }

  execute(command: CanvasCommand): void {
    if (!this.calculator) {
      console.warn("[desmos3d] Calculator not initialized");
      return;
    }

    try {
      switch (command.action) {
        case "desmos3d.setExpression": {
          const id = command.id ?? `expr3d_${++this.expressionCounter}`;
          this.calculator.setExpression({
            id,
            latex: command.latex,
            color: command.color,
          });
          break;
        }

        case "desmos3d.removeExpression": {
          this.calculator.removeExpression({ id: command.id });
          break;
        }

        case "desmos3d.clear": {
          this.clear();
          break;
        }

        default:
          console.warn("[desmos3d] Unknown command:", command);
      }
    } catch (err) {
      console.error("[desmos3d] Error executing command:", err);
    }
  }

  clear(): void {
    if (this.calculator) {
      this.calculator.setBlank();
      this.expressionCounter = 0;
    }
  }

  getSnapshot(): string {
    if (!this.calculator) return "Desmos 3D not loaded.";

    try {
      const expressions = this.calculator.getExpressions();
      if (expressions.length === 0) return "Desmos 3D: Empty graph.";

      const visible = expressions.filter((e) => e.latex);
      if (visible.length === 0) return "Desmos 3D: No expressions.";

      const descriptions = visible
        .slice(0, 10)
        .map((e) => `- ${e.latex}`)
        .join("\n");

      return `Desmos 3D expressions:\n${descriptions}`;
    } catch {
      return "Desmos 3D state unavailable.";
    }
  }

  destroy(): void {
    if (this.calculator) {
      this.calculator.destroy();
      this.calculator = null;
    }
  }
}

export function createDesmos3DWrapper(): Desmos3DWrapper {
  return new Desmos3DWrapper();
}
