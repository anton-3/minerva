// Tutor visualize API route — async visualization generation
// Accepts a VisualizationPlan, returns { sandboxHtml }.
// Called asynchronously by the frontend AFTER the fast speech response.
// This decouples speech latency from HTML generation latency.

import { NextResponse } from "next/server";
import { createTutorBrain } from "@/lib/claude/client";
import type { VisualizationPlan } from "@/types/session";

export async function POST(request: Request) {
  try {
    const { plan } = (await request.json()) as { plan: VisualizationPlan };

    if (!plan || !plan.description) {
      return NextResponse.json(
        { error: "plan.description is required" },
        { status: 400 }
      );
    }

    const brain = createTutorBrain();
    const result = await brain.generateVisualization(plan);

    return NextResponse.json(result);
  } catch (err) {
    console.error("[api/tutor/visualize] Error:", err);
    return NextResponse.json(
      { sandboxHtml: "" },
      { status: 500 }
    );
  }
}
