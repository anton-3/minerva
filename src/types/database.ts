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
        Relationships: [];
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
        Relationships: [
          {
            foreignKeyName: "children_parent_id_fkey";
            columns: ["parent_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
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
        Relationships: [
          {
            foreignKeyName: "learning_plans_child_id_fkey";
            columns: ["child_id"];
            isOneToOne: false;
            referencedRelation: "children";
            referencedColumns: ["id"];
          },
        ];
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
        Relationships: [
          {
            foreignKeyName: "sessions_child_id_fkey";
            columns: ["child_id"];
            isOneToOne: false;
            referencedRelation: "children";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sessions_learning_plan_id_fkey";
            columns: ["learning_plan_id"];
            isOneToOne: false;
            referencedRelation: "learning_plans";
            referencedColumns: ["id"];
          },
        ];
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
        Relationships: [
          {
            foreignKeyName: "session_summaries_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: true;
            referencedRelation: "sessions";
            referencedColumns: ["id"];
          },
        ];
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
        Relationships: [
          {
            foreignKeyName: "progress_child_id_fkey";
            columns: ["child_id"];
            isOneToOne: false;
            referencedRelation: "children";
            referencedColumns: ["id"];
          },
        ];
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
        Relationships: [
          {
            foreignKeyName: "transcript_entries_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "sessions";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
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
