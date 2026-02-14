// Perplexity knowledge module — Sonar API wrapper
// Wraps Perplexity Sonar REST API. No Perplexity types leak outside.
// See: specs/001-minerva-mvp/contracts/knowledge.md
// API: https://docs.perplexity.ai/api-reference/chat-completions-post

const PERPLEXITY_API_URL = "https://api.perplexity.ai/chat/completions";

export interface KnowledgeLookup {
  search(query: string): Promise<{ answer: string; citations: string[] }>;
}

export function createKnowledgeLookup(): KnowledgeLookup {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    throw new Error("PERPLEXITY_API_KEY is not set");
  }

  return {
    async search(query: string) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

      try {
        const res = await fetch(PERPLEXITY_API_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "sonar",
            messages: [
              {
                role: "system",
                content:
                  "You are a knowledgeable educational assistant. Provide clear, accurate, age-appropriate answers for middle school students (ages 11-14). Include relevant facts and examples.",
              },
              {
                role: "user",
                content: query,
              },
            ],
            max_tokens: 512,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!res.ok) {
          const err = await res.text();
          console.error("[perplexity] API error:", res.status, err);
          return { answer: "", citations: [] };
        }

        const data = await res.json();

        const answer =
          data?.choices?.[0]?.message?.content ?? "";
        const citations: string[] = data?.citations ?? [];

        return { answer, citations };
      } catch (err) {
        clearTimeout(timeout);
        if (err instanceof DOMException && err.name === "AbortError") {
          console.warn("[perplexity] Request timed out");
        } else {
          console.error("[perplexity] Error:", err);
        }
        return { answer: "", citations: [] };
      }
    },
  };
}
