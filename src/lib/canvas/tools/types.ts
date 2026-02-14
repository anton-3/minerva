// Tool wrapper types — interface for all math visualization tools
// Each tool (Desmos, Desmos3D, GeoGebra) implements this interface.

import type { CanvasCommand, MathTool } from "@/types/session";

/**
 * Interface that all math tool wrappers must implement.
 * Allows the canvas executor to dispatch commands to any tool uniformly.
 */
export interface ToolWrapper {
  /** Tool identifier */
  readonly name: MathTool;
  
  /** Execute a command specific to this tool */
  execute(command: CanvasCommand): void;
  
  /** Clear all content from this tool */
  clear(): void;
  
  /** Get a text description of current state (for Claude context) */
  getSnapshot(): string;
  
  /** Check if this tool can handle a given command */
  canHandle(command: CanvasCommand): boolean;
}

/**
 * Desmos-specific API types (from @types/desmos)
 * We re-export what we need to avoid leaking external types.
 */
export interface DesmosExpressionState {
  id?: string;
  latex?: string;
  color?: string;
  hidden?: boolean;
  sliderBounds?: { min: string; max: string; step?: string };
}

export interface DesmosViewport {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

/**
 * GeoGebra applet API types (subset we use)
 */
export interface GeoGebraAPI {
  evalCommand(cmd: string): boolean;
  setCoords(name: string, x: number, y: number): void;
  deleteObject(name: string): void;
  reset(): void;
  getAllObjectNames(): string[];
  getObjectType(name: string): string;
  getXcoord(name: string): number;
  getYcoord(name: string): number;
  getValueString(name: string): string;
}
