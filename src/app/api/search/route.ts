// Perplexity Sonar search API route
// POST: query Perplexity Sonar for factual answers with citations
// Owner: Person C (Backend Brain)
// See: specs/001-minerva-mvp/tasks.md (T060)

import { NextResponse } from "next/server";
import { createKnowledgeLookup } from "@/lib/perplexity/client";

export async function POST(request: Request) {
  const body = await request.json();
  const { query } = body as { query: string };

  if (!query) {
    return NextResponse.json(
      { error: "query is required" },
      { status: 400 }
    );
  }

  try {
    const lookup = createKnowledgeLookup();
    const result = await lookup.search(query);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[api/search] Error:", err);
    return NextResponse.json(
      { answer: "", citations: [] },
      { status: 500 }
    );
  }
}
