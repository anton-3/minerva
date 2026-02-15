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

// Matches slider/variable assignments like "b=1", "m=-3.5", "a_{1}=7"
// RHS must be a plain number — excludes equations like "y=x^2" or "f(x)=2x"
const SLIDER_PATTERN = /^([a-zA-Z_][a-zA-Z_0-9]*(?:_\{[^}]*\})?)\s*=\s*-?\d*\.?\d+$/;

/** Extract variable name if latex is a simple numeric assignment (slider) */
function getSliderVarName(latex: string | undefined): string | null {
  if (!latex) return null;
  const match = latex.match(SLIDER_PATTERN);
  return match ? match[1] : null;
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
          // If an explicit ID is provided, always execute (intentional update)
          if (command.id) {
            this.calculator.setExpression({
              id: command.id,
              latex: command.latex,
              color: command.color,
              hidden: command.hidden,
            });
            break;
          }

          // No explicit ID — check for duplicate latex before adding
          const existing = this.calculator
            .getExpressions()
            .find((e) => e.latex === command.latex && !e.hidden);

          if (existing?.id) {
            console.debug(
              `[desmos] Skipping duplicate: "${command.latex}" already exists as [${existing.id}]`
            );
            // If color was specified and differs, update the existing expression
            if (command.color && command.color !== existing.color) {
              this.calculator.setExpression({
                id: existing.id,
                latex: command.latex,
                color: command.color,
              });
              console.debug(`[desmos] Updated color of [${existing.id}] to ${command.color}`);
            }
            break;
          }

          // Check for slider/variable reassignment (e.g. "b=-5" should update existing "b=1")
          const newVarName = getSliderVarName(command.latex);
          if (newVarName) {
            const expressions = this.calculator.getExpressions();
            const existingSlider = expressions.find((e) => {
              if (e.hidden) return false;
              return getSliderVarName(e.latex) === newVarName;
            });

            if (existingSlider?.id) {
              this.calculator.setExpression({
                id: existingSlider.id,
                latex: command.latex,
                color: command.color ?? existingSlider.color,
              });
              console.debug(
                `[desmos] Updated slider [${existingSlider.id}]: "${existingSlider.latex}" → "${command.latex}"`
              );
              break;
            }
          }

          const id = `expr_${++this.expressionCounter}`;
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

      const total = visible.length;
      const shown = visible.slice(0, 15);
      const descriptions = shown
        .map((e) => {
          const id = e.id ? `[${e.id}]` : "[?]";
          const color = e.color ? ` (${e.color})` : "";
          return `- ${id} ${e.latex}${color}`;
        })
        .join("\n");

      const overflow = total > shown.length ? `\n(${total - shown.length} more not shown)` : "";

      return `Desmos (${total} expressions):\n${descriptions}${overflow}`;
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
