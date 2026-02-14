// Learning plans API route for client-side fetching
// GET: list learning plans for child IDs

import { NextResponse } from "next/server";
import { db, learningPlans } from "@/db";
import { inArray, asc } from "drizzle-orm";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const childIdsParam = searchParams.get("child_ids");

  if (!childIdsParam) {
    return NextResponse.json(
      { error: "child_ids query param required (comma-separated)" },
      { status: 400 }
    );
  }

  const childIds = childIdsParam.split(",").filter(Boolean);

  if (childIds.length === 0) {
    return NextResponse.json([]);
  }

  try {
    const data = await db
      .select()
      .from(learningPlans)
      .where(inArray(learningPlans.childId, childIds))
      .orderBy(asc(learningPlans.subject));

    return NextResponse.json(data);
  } catch (error) {
    console.error("[api/learning-plans] Error fetching plans:", error);
    return NextResponse.json({ error: "Failed to fetch plans" }, { status: 500 });
  }
}
