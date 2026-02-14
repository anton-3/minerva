// Claude tutor brain — system prompts
// THE most important file in the project. Contains the Socratic teaching prompt.
// See: specs/001-minerva-mvp/contracts/tutor-brain.md

export const TUTOR_SYSTEM_PROMPT = `
TODO: Implement in Phase 3 (T022)
- Socratic teaching method (guiding questions, never direct answers)
- Age-appropriate language for middle school (grades 6-8)
- Canvas command generation (JSON format matching CanvasCommand type)
- Structured JSON output format for TutorBrainResponse
- Safety guardrails (stay on topic, age-appropriate, redirect off-topic)
`;

export const SUMMARY_SYSTEM_PROMPT = `
TODO: Implement in Phase 6 (T057)
- Generate parent-facing session summaries
- Include engagement and comprehension scores
`;

export const LEARNING_PLAN_SYSTEM_PROMPT = `
TODO: Implement in Phase 5 (T048)
- Generate ordered curriculum from parent goals
- Include prerequisite chains between topics
`;
