# Contract: Knowledge Module

**Module**: `src/lib/perplexity/`
**Owner**: Person C (Backend Brain)
**Wraps**: Perplexity Sonar REST API

## Interface

```typescript
// src/lib/perplexity/client.ts
interface KnowledgeLookup {
  search(query: string): Promise<{ answer: string; citations: string[] }>;
}
```

## Behavior

- `search(query)`: Sends query to Perplexity Sonar API. Returns a factual answer with source citations. Used by the tutor brain when Claude determines external knowledge is needed.

## Integration

Called from `/api/search/route.ts`. The tutor brain route (`/api/tutor/respond`) may call this internally when the student asks a factual question.

## Constraints

- No Perplexity response types leak outside this module.
- Timeout: 5 seconds max per query.
- Failures return a graceful fallback: `{ answer: "", citations: [] }` — the tutor continues without external knowledge.
