// Seed script — populates database with realistic demo data for the parent dashboard
// Run: npx tsx src/db/seed.ts

import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import {
  children,
  learningPlans,
  sessions,
  sessionSummaries,
  progress,
  transcriptEntries,
} from "./schema";

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
const db = drizzle(pool);

async function seed() {
  console.log("Seeding database...");

  // Clean existing data (order matters for FK constraints)
  await db.delete(transcriptEntries);
  await db.delete(sessionSummaries);
  await db.delete(progress);
  await db.delete(sessions);
  await db.delete(learningPlans);
  await db.delete(children);

  // ─── Children ───────────────────────────────────────────────────────────────
  const [leo, maya] = await db
    .insert(children)
    .values([
      { name: "Leo Wallace", age: 12, grade: 7, pin: "1234" },
      { name: "Maya Wallace", age: 9, grade: 4, pin: "5678" },
    ])
    .returning();

  console.log(`  Created children: ${leo.name}, ${maya.name}`);

  // ─── Learning Plans ─────────────────────────────────────────────────────────
  const [leoAlgebra, leoGeometry, mayaMath] = await db
    .insert(learningPlans)
    .values([
      {
        childId: leo.id,
        subject: "Algebra",
        currentTopic: "Systems of Equations",
        goals: [
          { description: "Master solving linear equations", status: "completed" as const },
          { description: "Understand systems of equations", status: "active" as const },
          { description: "Introduction to quadratic expressions", status: "active" as const },
        ],
        curriculum: [
          { name: "One-step Equations", description: "Solve equations with single operations", prerequisites: [] },
          { name: "Two-step Equations", description: "Combine inverse operations to isolate variables", prerequisites: ["One-step Equations"] },
          { name: "Multi-step Equations", description: "Distribute, combine like terms, then solve", prerequisites: ["Two-step Equations"] },
          { name: "Systems of Equations", description: "Solve two equations with two unknowns using substitution and elimination", prerequisites: ["Multi-step Equations"] },
          { name: "Intro to Quadratics", description: "Factor and graph simple quadratic expressions", prerequisites: ["Systems of Equations"] },
        ],
      },
      {
        childId: leo.id,
        subject: "Geometry",
        currentTopic: "Triangle Properties",
        goals: [
          { description: "Learn angle relationships and theorems", status: "active" as const },
          { description: "Understand triangle congruence (SSS, SAS, ASA)", status: "active" as const },
        ],
        curriculum: [
          { name: "Angle Basics", description: "Complementary, supplementary, and vertical angles", prerequisites: [] },
          { name: "Parallel Lines & Transversals", description: "Corresponding, alternate interior, and co-interior angles", prerequisites: ["Angle Basics"] },
          { name: "Triangle Properties", description: "Angle sum, exterior angles, isosceles properties", prerequisites: ["Parallel Lines & Transversals"] },
          { name: "Triangle Congruence", description: "SSS, SAS, ASA, AAS proofs", prerequisites: ["Triangle Properties"] },
        ],
      },
      {
        childId: maya.id,
        subject: "Math",
        currentTopic: "Fractions & Mixed Numbers",
        goals: [
          { description: "Fluent multiplication up to 12×12", status: "completed" as const },
          { description: "Add and subtract fractions with unlike denominators", status: "active" as const },
          { description: "Understand basic division with remainders", status: "active" as const },
        ],
        curriculum: [
          { name: "Multiplication Facts", description: "Fluency with multiplication tables up to 12", prerequisites: [] },
          { name: "Intro to Fractions", description: "Understand fractions as parts of a whole, equivalent fractions", prerequisites: [] },
          { name: "Fractions & Mixed Numbers", description: "Add and subtract fractions, convert to mixed numbers", prerequisites: ["Intro to Fractions"] },
          { name: "Division with Remainders", description: "Long division with single-digit divisors", prerequisites: ["Multiplication Facts"] },
        ],
      },
    ])
    .returning();

  console.log(`  Created ${3} learning plans`);

  // ─── Sessions ───────────────────────────────────────────────────────────────
  const now = new Date();
  const day = (d: number) => new Date(now.getTime() - d * 86400000);
  const mins = (start: Date, m: number) => new Date(start.getTime() + m * 60000);

  const sessionData = [
    // Leo — 5 sessions over last 10 days
    {
      childId: leo.id,
      learningPlanId: leoAlgebra.id,
      status: "completed",
      startedAt: day(10),
      endedAt: mins(day(10), 18),
    },
    {
      childId: leo.id,
      learningPlanId: leoAlgebra.id,
      status: "completed",
      startedAt: day(7),
      endedAt: mins(day(7), 22),
    },
    {
      childId: leo.id,
      learningPlanId: leoGeometry.id,
      status: "completed",
      startedAt: day(5),
      endedAt: mins(day(5), 15),
    },
    {
      childId: leo.id,
      learningPlanId: leoAlgebra.id,
      status: "completed",
      startedAt: day(3),
      endedAt: mins(day(3), 25),
    },
    {
      childId: leo.id,
      learningPlanId: leoGeometry.id,
      status: "completed",
      startedAt: day(1),
      endedAt: mins(day(1), 20),
    },
    // Maya — 3 sessions
    {
      childId: maya.id,
      learningPlanId: mayaMath.id,
      status: "completed",
      startedAt: day(8),
      endedAt: mins(day(8), 12),
    },
    {
      childId: maya.id,
      learningPlanId: mayaMath.id,
      status: "completed",
      startedAt: day(4),
      endedAt: mins(day(4), 16),
    },
    {
      childId: maya.id,
      learningPlanId: mayaMath.id,
      status: "completed",
      startedAt: day(1),
      endedAt: mins(day(1), 14),
    },
  ];

  const insertedSessions = await db.insert(sessions).values(sessionData).returning();
  console.log(`  Created ${insertedSessions.length} sessions`);

  // ─── Session Summaries ──────────────────────────────────────────────────────
  const summaryData = [
    // Leo Session 1 — Algebra basics
    {
      sessionId: insertedSessions[0].id,
      summary:
        "Leo worked through solving two-step linear equations. He initially struggled with the concept of performing inverse operations in the correct order, but after working through three guided examples using the balance model, he was able to solve 4 out of 5 practice problems independently. He showed strong number sense but needs more practice with negative coefficients.",
      topicsCovered: ["Two-step Equations", "Inverse Operations", "Negative Numbers"],
      strengths: [
        "Strong number sense — quickly computes arithmetic mentally",
        "Good at identifying the variable to isolate",
        "Asks clarifying questions when confused rather than guessing",
      ],
      areasForImprovement: [
        "Tends to forget to apply the same operation to both sides",
        "Struggles with negative coefficients — needs more practice",
      ],
      engagementScore: 0.82,
      comprehensionScore: 0.75,
    },
    // Leo Session 2 — Algebra intermediate
    {
      sessionId: insertedSessions[1].id,
      summary:
        "Excellent session on multi-step equations. Leo demonstrated clear improvement from last session — he now consistently applies operations to both sides without reminders. We introduced combining like terms and he picked it up quickly using the visual grouping method. He solved a challenge problem involving distribution that was above his current level, showing strong mathematical intuition.",
      topicsCovered: ["Multi-step Equations", "Combining Like Terms", "Distributive Property"],
      strengths: [
        "Significant improvement in systematic solving approach",
        "Quickly grasped combining like terms with visual grouping",
        "Solved an above-level challenge problem with distribution",
        "Maintained focus throughout the entire 22-minute session",
      ],
      areasForImprovement: [
        "Occasionally skips showing work — should document each step",
        "Could be more careful checking solutions by substituting back",
      ],
      engagementScore: 0.91,
      comprehensionScore: 0.85,
    },
    // Leo Session 3 — Geometry
    {
      sessionId: insertedSessions[2].id,
      summary:
        "First geometry session focused on angle basics. Leo was already familiar with right angles and straight angles from school but hadn't encountered vertical angles or the formal definitions of complementary and supplementary pairs. The interactive angle tool helped him discover the vertical angle theorem on his own through experimentation. He needs practice with algebraic angle problems (e.g., 'if two supplementary angles differ by 30°, find each').",
      topicsCovered: ["Complementary Angles", "Supplementary Angles", "Vertical Angles"],
      strengths: [
        "Discovered the vertical angle theorem independently through exploration",
        "Strong spatial reasoning — intuitively understands angle relationships",
        "Excited about geometry — high engagement throughout",
      ],
      areasForImprovement: [
        "Needs practice translating angle word problems into equations",
        "Should learn to use proper geometric notation (∠ABC)",
      ],
      engagementScore: 0.88,
      comprehensionScore: 0.78,
    },
    // Leo Session 4 — Algebra systems
    {
      sessionId: insertedSessions[3].id,
      summary:
        "Introduced systems of equations using the substitution method. Leo understood the concept of two equations constraining two unknowns after we used the real-world example of buying apples and oranges with a fixed budget. He successfully solved 3 systems by substitution. We briefly previewed the elimination method and he showed curiosity about when each method is more efficient. This was his longest and most productive session yet.",
      topicsCovered: ["Systems of Equations", "Substitution Method", "Word Problems"],
      strengths: [
        "Excellent conceptual understanding — connected systems to real-world constraints",
        "Solved 3 systems independently using substitution",
        "Asked insightful question about efficiency of different solving methods",
        "Longest session (25 min) with sustained engagement",
      ],
      areasForImprovement: [
        "Arithmetic errors when substituting — needs to slow down and check",
        "Should practice setting up systems from word problems (not just solving given systems)",
      ],
      engagementScore: 0.94,
      comprehensionScore: 0.88,
    },
    // Leo Session 5 — Geometry continued (most recent)
    {
      sessionId: insertedSessions[4].id,
      summary:
        "Continued geometry with parallel lines cut by a transversal. Leo quickly identified corresponding angles after seeing the 'F-shape' pattern. Alternate interior angles took a bit longer but he got it after rotating the diagram mentally. We proved that co-interior (same-side interior) angles are supplementary using the angle sum property he learned last session. Great connection-making between topics. He's ready for triangle properties next.",
      topicsCovered: ["Parallel Lines", "Transversals", "Corresponding Angles", "Alternate Interior Angles"],
      strengths: [
        "Quickly identified corresponding angles using the F-shape pattern",
        "Strong ability to connect new concepts to previously learned material",
        "Successfully proved co-interior angles are supplementary",
        "Ready to advance to triangle properties",
      ],
      areasForImprovement: [
        "Alternate interior angles needed extra time — review Z-shape pattern",
        "Should practice with more complex diagrams involving multiple transversals",
      ],
      engagementScore: 0.90,
      comprehensionScore: 0.86,
    },
    // Maya Session 1
    {
      sessionId: insertedSessions[5].id,
      summary:
        "Maya worked on multiplication facts with a focus on the 7s and 8s tables, which she identified as her weakest areas. We used the skip-counting strategy and the 'finger trick' for 9s. She was already fluent with 2s, 5s, and 10s. By the end of the session she could recall 7×6, 7×8, and 8×7 without hesitation. She was cheerful and enthusiastic throughout — she loves the challenge of timed recall.",
      topicsCovered: ["Multiplication Tables", "Skip Counting", "Mental Math Strategies"],
      strengths: [
        "Already fluent with 2s, 5s, and 10s multiplication",
        "Enthusiastic learner — enjoys timed challenges",
        "Quickly adopted the skip-counting strategy for 7s",
      ],
      areasForImprovement: [
        "8×6 and 8×7 still require counting — needs repetition",
        "Should practice in random order, not just sequential tables",
      ],
      engagementScore: 0.95,
      comprehensionScore: 0.80,
    },
    // Maya Session 2
    {
      sessionId: insertedSessions[6].id,
      summary:
        "Introduced fractions using pizza and chocolate bar models. Maya understood that 1/2 = 2/4 = 3/6 after seeing the visual partitioning. She correctly identified which fraction is larger in 5 out of 6 comparison problems using the 'same denominator' strategy. We started adding fractions with the same denominator and she found it intuitive ('just add the top numbers'). Next session we'll tackle unlike denominators, which will require finding common denominators.",
      topicsCovered: ["Equivalent Fractions", "Comparing Fractions", "Adding Fractions (Same Denominator)"],
      strengths: [
        "Excellent visual understanding of fractions as parts of a whole",
        "Correctly identified equivalent fractions across different representations",
        "Intuitively understood adding fractions with same denominators",
        "Very engaged with the pizza/chocolate bar visual models",
      ],
      areasForImprovement: [
        "Needs to learn the cross-multiplication method for comparing fractions",
        "Not yet comfortable with improper fractions or mixed numbers",
      ],
      engagementScore: 0.92,
      comprehensionScore: 0.83,
    },
    // Maya Session 3 (most recent)
    {
      sessionId: insertedSessions[7].id,
      summary:
        "Worked on adding fractions with unlike denominators. Maya initially found the concept of finding a common denominator confusing ('why can't I just add them?'). After using the visual model — splitting a pizza into different numbers of slices and showing why 1/3 + 1/4 isn't 2/7 — she had a clear 'aha' moment. She then successfully added 3 fraction pairs by finding the LCD. We also introduced mixed numbers and she converted 7/4 to 1 3/4 correctly. Strong session.",
      topicsCovered: ["Unlike Denominators", "Least Common Denominator", "Mixed Numbers"],
      strengths: [
        "Had a genuine 'aha' moment understanding why common denominators are needed",
        "Successfully found LCD and added 3 fraction pairs independently",
        "Correctly converted an improper fraction to a mixed number on first try",
      ],
      areasForImprovement: [
        "Finding the LCD is still slow — needs to practice listing multiples",
        "Should work on subtracting fractions with unlike denominators next",
      ],
      engagementScore: 0.89,
      comprehensionScore: 0.85,
    },
  ];

  await db.insert(sessionSummaries).values(summaryData);
  console.log(`  Created ${summaryData.length} session summaries`);

  // ─── Progress (Topic Mastery) ───────────────────────────────────────────────
  const progressData = [
    // Leo — Algebra
    { childId: leo.id, subject: "Algebra", topic: "One-step Equations", score: 0.95 },
    { childId: leo.id, subject: "Algebra", topic: "Two-step Equations", score: 0.88 },
    { childId: leo.id, subject: "Algebra", topic: "Multi-step Equations", score: 0.82 },
    { childId: leo.id, subject: "Algebra", topic: "Combining Like Terms", score: 0.85 },
    { childId: leo.id, subject: "Algebra", topic: "Distributive Property", score: 0.72 },
    { childId: leo.id, subject: "Algebra", topic: "Systems of Equations", score: 0.65 },
    // Leo — Geometry
    { childId: leo.id, subject: "Geometry", topic: "Complementary & Supplementary", score: 0.90 },
    { childId: leo.id, subject: "Geometry", topic: "Vertical Angles", score: 0.92 },
    { childId: leo.id, subject: "Geometry", topic: "Corresponding Angles", score: 0.80 },
    { childId: leo.id, subject: "Geometry", topic: "Alternate Interior Angles", score: 0.68 },
    // Maya — Math
    { childId: maya.id, subject: "Math", topic: "Multiplication (2s, 5s, 10s)", score: 0.98 },
    { childId: maya.id, subject: "Math", topic: "Multiplication (7s, 8s)", score: 0.78 },
    { childId: maya.id, subject: "Math", topic: "Equivalent Fractions", score: 0.85 },
    { childId: maya.id, subject: "Math", topic: "Comparing Fractions", score: 0.82 },
    { childId: maya.id, subject: "Math", topic: "Adding Fractions (Same Denom)", score: 0.90 },
    { childId: maya.id, subject: "Math", topic: "Adding Fractions (Unlike Denom)", score: 0.70 },
    { childId: maya.id, subject: "Math", topic: "Mixed Numbers", score: 0.65 },
  ];

  await db.insert(progress).values(progressData);
  console.log(`  Created ${progressData.length} progress entries`);

  console.log("\nSeed complete!");
  await pool.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
