// Perplexity knowledge module — Sonar API wrapper
// Wraps Perplexity Sonar REST API. No Perplexity types leak outside.
// See: specs/001-minerva-mvp/contracts/knowledge.md

export interface KnowledgeLookup {
  search(query: string): Promise<{ answer: string; citations: string[] }>;
}

export function createKnowledgeLookup(): KnowledgeLookup {
  // TODO: Implement in Phase 7 (T059)
  // - Call Perplexity Sonar API with query
  // - Extract answer and citations from response
  // - 5s timeout, graceful fallback on failure
  throw new Error("KnowledgeLookup not yet implemented");
}
