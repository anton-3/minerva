// Tool manager — coordinates multiple math visualization tools
// Dispatches commands to the appropriate tool based on action prefix.

import type { CanvasCommand, MathTool } from "@/types/session";
import type { ToolWrapper } from "./types";
import { DesmosWrapper, createDesmosWrapper } from "./desmos";
import { Desmos3DWrapper, createDesmos3DWrapper } from "./desmos3d";
import { GeoGebraWrapper, createGeoGebraWrapper } from "./geogebra";

export interface ToolManager {
  /** Currently active tool */
  activeTool: MathTool;

  /** Set the active tool */
  setActiveTool(tool: MathTool): void;

  /** Subscribe to active tool changes (returns unsubscribe fn) */
  onActiveTool(cb: (tool: MathTool) => void): () => void;

  /** Get a tool wrapper by name */
  getTool(name: MathTool): ToolWrapper | undefined;

  /** Execute a command (dispatches to appropriate tool) */
  execute(command: CanvasCommand): void;

  /** Clear all tools or just the active one */
  clearAll(): void;
  clearActive(): void;

  /** Get combined snapshot of all tools or just active */
  getSnapshot(): string;
  getActiveSnapshot(): string;

  /** Tool wrapper references for setting instances */
  desmos: DesmosWrapper;
  desmos3d: Desmos3DWrapper;
  geogebra: GeoGebraWrapper;
}

export function createToolManager(): ToolManager {
  const desmos = createDesmosWrapper();
  const desmos3d = createDesmos3DWrapper();
  const geogebra = createGeoGebraWrapper();
  
  const tools = new Map<MathTool, ToolWrapper>();
  tools.set("desmos", desmos);
  tools.set("desmos3d", desmos3d);
  tools.set("geogebra", geogebra);

  let activeTool: MathTool = "desmos";
  const toolChangeCallbacks: ((tool: MathTool) => void)[] = [];

  function notifyToolChange(tool: MathTool) {
    for (const cb of toolChangeCallbacks) cb(tool);
  }

  return {
    get activeTool() {
      return activeTool;
    },

    setActiveTool(tool: MathTool) {
      activeTool = tool;
      notifyToolChange(tool);
    },

    onActiveTool(cb: (tool: MathTool) => void): () => void {
      toolChangeCallbacks.push(cb);
      return () => {
        const idx = toolChangeCallbacks.indexOf(cb);
        if (idx >= 0) toolChangeCallbacks.splice(idx, 1);
      };
    },

    getTool(name: MathTool) {
      return tools.get(name);
    },

    execute(command: CanvasCommand) {
      try {
        // Handle meta commands
        if (command.action === "setTool") {
          activeTool = command.tool;
          notifyToolChange(command.tool);
          return;
        }

        if (command.action === "clear") {
          // Clear all tools
          this.clearAll();
          return;
        }

        // Route to specific tool based on action prefix
        const actionPrefix = command.action.split(".")[0];
        
        if (actionPrefix === "desmos" && !command.action.startsWith("desmos3d")) {
          desmos.execute(command);
        } else if (actionPrefix === "desmos3d") {
          desmos3d.execute(command);
        } else if (actionPrefix === "geogebra") {
          geogebra.execute(command);
        } else {
          console.warn("[tool-manager] Unknown command action:", command.action);
        }
      } catch (err) {
        // Canvas errors never break the session
        console.error("[tool-manager] Error executing command:", err);
      }
    },

    clearAll() {
      tools.forEach((tool) => tool.clear());
    },

    clearActive() {
      const tool = tools.get(activeTool);
      if (tool) tool.clear();
    },

    getSnapshot(): string {
      const snapshots: string[] = [];
      
      tools.forEach((tool) => {
        const snapshot = tool.getSnapshot();
        if (snapshot && !snapshot.includes("Empty") && !snapshot.includes("not loaded")) {
          snapshots.push(snapshot);
        }
      });

      if (snapshots.length === 0) {
        return "All math tools are empty.";
      }

      return `Active tool: ${activeTool}\n\n${snapshots.join("\n\n")}`;
    },

    getActiveSnapshot(): string {
      const tool = tools.get(activeTool);
      if (!tool) return `${activeTool} not available.`;
      return `Active: ${activeTool}\n${tool.getSnapshot()}`;
    },

    desmos,
    desmos3d,
    geogebra,
  };
}

export type { ToolWrapper };
