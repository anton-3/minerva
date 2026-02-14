// GeoGebra Classic wrapper
// Wraps the GeoGebra Apps API for geometry constructions.
// API docs: https://wiki.geogebra.org/en/Reference:GeoGebra_Apps_API

import type { CanvasCommand } from "@/types/session";
import type { ToolWrapper, GeoGebraAPI } from "./types";

export class GeoGebraWrapper implements ToolWrapper {
  readonly name = "geogebra" as const;
  private api: GeoGebraAPI | null = null;

  /** Set the GeoGebra API instance (called after applet loads) */
  setAPI(api: unknown): void {
    this.api = api as GeoGebraAPI;
  }

  canHandle(command: CanvasCommand): boolean {
    return command.action.startsWith("geogebra.");
  }

  execute(command: CanvasCommand): void {
    if (!this.api) {
      console.warn("[geogebra] API not initialized");
      return;
    }

    try {
      switch (command.action) {
        case "geogebra.evalCommand": {
          // GeoGebra uses its own command syntax, e.g.:
          // "A = (1, 2)" creates point A
          // "Circle(A, 3)" creates circle with center A, radius 3
          // "Line(A, B)" creates line through A and B
          const success = this.api.evalCommand(command.command);
          if (!success) {
            console.warn("[geogebra] Command failed:", command.command);
          }
          break;
        }

        case "geogebra.setCoords": {
          this.api.setCoords(command.name, command.x, command.y);
          break;
        }

        case "geogebra.deleteObject": {
          this.api.deleteObject(command.name);
          break;
        }

        case "geogebra.clear": {
          this.clear();
          break;
        }

        default:
          console.warn("[geogebra] Unknown command:", command);
      }
    } catch (err) {
      console.error("[geogebra] Error executing command:", err);
    }
  }

  clear(): void {
    if (this.api) {
      this.api.reset();
    }
  }

  getSnapshot(): string {
    if (!this.api) return "GeoGebra not loaded.";

    try {
      const names = this.api.getAllObjectNames();
      if (names.length === 0) return "GeoGebra: Empty construction.";

      // Build a description of the construction
      const descriptions: string[] = [];
      for (const name of names.slice(0, 15)) {
        const type = this.api.getObjectType(name);
        
        if (type === "point") {
          const x = this.api.getXcoord(name);
          const y = this.api.getYcoord(name);
          descriptions.push(`- Point ${name} at (${x.toFixed(2)}, ${y.toFixed(2)})`);
        } else if (type === "line" || type === "segment" || type === "ray") {
          descriptions.push(`- ${type.charAt(0).toUpperCase() + type.slice(1)} ${name}`);
        } else if (type === "circle" || type === "conic") {
          descriptions.push(`- Circle ${name}`);
        } else if (type === "polygon") {
          descriptions.push(`- Polygon ${name}`);
        } else {
          const value = this.api.getValueString(name);
          descriptions.push(`- ${name}: ${value || type}`);
        }
      }

      if (descriptions.length === 0) return "GeoGebra: No visible objects.";

      return `GeoGebra construction:\n${descriptions.join("\n")}`;
    } catch {
      return "GeoGebra state unavailable.";
    }
  }
}

export function createGeoGebraWrapper(): GeoGebraWrapper {
  return new GeoGebraWrapper();
}
