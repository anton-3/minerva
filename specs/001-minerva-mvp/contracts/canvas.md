# Contract: Canvas Module

**Module**: `src/lib/canvas/`
**Owner**: Person B (Media Specialist)
**Wraps**: `tldraw` v4.3.1

## Interface

```typescript
// src/lib/canvas/types.ts
type CanvasCommand =
  | { action: "clear" }
  | { action: "drawEquation"; equation: string; x: number; y: number }
  | { action: "drawNumberLine"; min: number; max: number; y: number }
  | { action: "drawCoordinatePlane"; originX: number; originY: number }
  | { action: "drawAngle"; vertexX: number; vertexY: number; angle: number; label?: string }
  | { action: "drawFraction"; numerator: string; denominator: string; x: number; y: number }
  | { action: "highlight"; id: string; color: string }
  | { action: "createShape"; shape: Record<string, unknown> }

// src/lib/canvas/commands.ts
interface CanvasExecutor {
  execute(command: CanvasCommand): string | void;
  executeSequence(commands: CanvasCommand[], delayMs?: number): Promise<void>;
  clear(): void;
  getSnapshot(): string;
}
```

## Behavior

- `execute(command)`: Translates a CanvasCommand into tldraw Editor API calls. Returns shape ID for commands that create shapes.
- `executeSequence(commands, delayMs)`: Executes commands one at a time with optional delay (default 500ms) for step-by-step animation effect.
- `clear()`: Removes all shapes from the canvas.
- `getSnapshot()`: Returns a serialized text description of what's on the canvas, for including in Claude's context window.

## Math Templates

Each `draw*` action is a pre-built template that creates multiple tldraw shapes:

- **drawEquation**: Renders a math equation as a text shape with large font
- **drawNumberLine**: Creates a horizontal line with tick marks and labels
- **drawCoordinatePlane**: Creates X/Y axes with grid marks
- **drawAngle**: Creates two line segments meeting at a vertex with arc and label
- **drawFraction**: Creates numerator text, fraction bar line, denominator text

## Constraints

- No tldraw types (`Editor`, `TLShapeId`, etc.) leak outside this module.
- The `CanvasExecutor` must be initialized with a tldraw `Editor` instance (passed via React ref from CanvasPanel).
- Invalid commands are silently skipped (logged to console) — never throw.
- Canvas errors must never break the tutoring session.
