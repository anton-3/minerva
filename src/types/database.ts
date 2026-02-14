// Supabase database types
// Mirrors the schema in supabase/migrations/001_initial_schema.sql
// See: specs/001-minerva-mvp/data-model.md

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          role: "parent" | "student";
          display_name: string;
        };
        Insert: {
          id: string;
          role: "parent" | "student";
          display_name: string;
        };
        Update: Partial<{
          role: "parent" | "student";
          display_name: string;
        }>;
      };
      children: {
        Row: {
          id: string;
          parent_id: string;
          name: string;
          age: number;
          grade: number;
          pin: string;
        };
        Insert: {
          id?: string;
          parent_id: string;
          name: string;
          age: number;
          grade: number;
          pin: string;
        };
        Update: Partial<{
          name: string;
          age: number;
          grade: number;
          pin: string;
        }>;
      };
      learning_plans: {
        Row: {
          id: string;
          child_id: string;
          subject: string;
          goals: GoalEntry[];
          current_topic: string | null;
          curriculum: CurriculumEntry[] | null;
        };
        Insert: {
          id?: string;
          child_id: string;
          subject: string;
          goals: GoalEntry[];
          current_topic?: string | null;
          curriculum?: CurriculumEntry[] | null;
        };
        Update: Partial<{
          subject: string;
          goals: GoalEntry[];
          current_topic: string | null;
          curriculum: CurriculumEntry[] | null;
        }>;
      };
      sessions: {
        Row: {
          id: string;
          child_id: string;
          learning_plan_id: string | null;
          status: string;
          started_at: string | null;
          ended_at: string | null;
          recording_url: string | null;
        };
        Insert: {
          id?: string;
          child_id: string;
          learning_plan_id?: string | null;
          status?: string;
          started_at?: string | null;
          ended_at?: string | null;
          recording_url?: string | null;
        };
        Update: Partial<{
          status: string;
          ended_at: string | null;
          recording_url: string | null;
        }>;
      };
      session_summaries: {
        Row: {
          id: string;
          session_id: string;
          summary: string | null;
          topics_covered: string[] | null;
          strengths: string[] | null;
          areas_for_improvement: string[] | null;
          engagement_score: number | null;
          comprehension_score: number | null;
        };
        Insert: {
          id?: string;
          session_id: string;
          summary?: string | null;
          topics_covered?: string[] | null;
          strengths?: string[] | null;
          areas_for_improvement?: string[] | null;
          engagement_score?: number | null;
          comprehension_score?: number | null;
        };
        Update: Partial<{
          summary: string | null;
          topics_covered: string[] | null;
          strengths: string[] | null;
          areas_for_improvement: string[] | null;
          engagement_score: number | null;
          comprehension_score: number | null;
        }>;
      };
      progress: {
        Row: {
          id: string;
          child_id: string;
          subject: string;
          topic: string;
          score: number;
        };
        Insert: {
          id?: string;
          child_id: string;
          subject: string;
          topic: string;
          score?: number;
        };
        Update: Partial<{
          score: number;
        }>;
      };
      transcript_entries: {
        Row: {
          id: string;
          session_id: string;
          speaker: string;
          text: string;
          timestamp: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          speaker: string;
          text: string;
          timestamp: string;
        };
        Update: Partial<{
          speaker: string;
          text: string;
        }>;
      };
    };
  };
}

// JSONB field types
export interface GoalEntry {
  description: string;
  target_date?: string;
  status: "active" | "completed" | "paused";
}

export interface CurriculumEntry {
  name: string;
  description: string;
  prerequisites: string[];
}
