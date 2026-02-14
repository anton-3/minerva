// Desmos 2D GraphingCalculator wrapper
// Wraps the Desmos API for use in our multi-tool canvas system.
// API docs: https://www.desmos.com/api/v1.11/docs/index.html

import type { CanvasCommand } from "@/types/session";
import type { ToolWrapper, DesmosExpressionState } from "./types";

// Desmos Calculator type (from global Desmos object loaded via script)
interface DesmosCalculator {
  setExpression(state: DesmosExpressionState): void;
  removeExpression(state: { id: string }): void;
  setMathBounds(bounds: { left: number; right: number; top: number; bottom: number }): void;
  getExpressions(): DesmosExpressionState[];
  setBlank(): void;
  destroy(): void;
}

export class DesmosWrapper implements ToolWrapper {
  readonly name = "desmos" as const;
  private calculator: DesmosCalculator | null = null;
  private expressionCounter = 0;

  /** Set the calculator instance (called after Desmos loads) */
  setCalculator(calc: unknown): void {
    this.calculator = calc as DesmosCalculator;
  }

  canHandle(command: CanvasCommand): boolean {
    return command.action.startsWith("desmos.") && !command.action.startsWith("desmos3d.");
  }

  execute(command: CanvasCommand): void {
    if (!this.calculator) {
      console.warn("[desmos] Calculator not initialized");
      return;
    }

    try {
      switch (command.action) {
        case "desmos.setExpression": {
          const id = command.id ?? `expr_${++this.expressionCounter}`;
          this.calculator.setExpression({
            id,
            latex: command.latex,
            color: command.color,
            hidden: command.hidden,
          });
          break;
        }

        case "desmos.removeExpression": {
          this.calculator.removeExpression({ id: command.id });
          break;
        }

        case "desmos.setViewport": {
          this.calculator.setMathBounds({
            left: command.left,
            right: command.right,
            top: command.top,
            bottom: command.bottom,
          });
          break;
        }

        case "desmos.clear": {
          this.clear();
          break;
        }

        default:
          console.warn("[desmos] Unknown command:", command);
      }
    } catch (err) {
      console.error("[desmos] Error executing command:", err);
    }
  }

  clear(): void {
    if (this.calculator) {
      this.calculator.setBlank();
      this.expressionCounter = 0;
    }
  }

  getSnapshot(): string {
    if (!this.calculator) return "Desmos not loaded.";

    try {
      const expressions = this.calculator.getExpressions();
      if (expressions.length === 0) return "Desmos: Empty graph.";

      const visible = expressions.filter((e) => !e.hidden && e.latex);
      if (visible.length === 0) return "Desmos: No visible expressions.";

      const descriptions = visible
        .slice(0, 10) // Limit to first 10 for context
        .map((e) => `- ${e.latex}`)
        .join("\n");

      return `Desmos expressions:\n${descriptions}`;
    } catch {
      return "Desmos state unavailable.";
    }
  }

  destroy(): void {
    if (this.calculator) {
      this.calculator.destroy();
      this.calculator = null;
    }
  }
}

export function createDesmosWrapper(): DesmosWrapper {
  return new DesmosWrapper();
}
