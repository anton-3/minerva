// Drizzle database client for Minerva
// Uses node-postgres (pg) driver with Supabase connection pooler

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";
import * as relations from "./relations";

// Connection string from environment (Supabase pooler URL)
const connectionString = process.env.DATABASE_URL!;

// Create pg pool
const pool = new Pool({
  connectionString,
  // For serverless: limit connections
  max: 10,
});

// Export typed Drizzle instance with schema for relational queries
export const db = drizzle(pool, {
  schema: { ...schema, ...relations },
});

// Re-export schema for convenience
export * from "./schema";
