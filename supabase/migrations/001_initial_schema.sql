-- Minerva AI Avatar Tutor — Initial Schema (Simplified for Demo)
-- See: specs/001-minerva-mvp/data-model.md
-- NOTE: Simplified schema - removed profiles table and parent_id

-- children: student profiles (no parent relationship for demo)
CREATE TABLE children (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  age INTEGER NOT NULL,
  grade INTEGER NOT NULL,
  pin TEXT NOT NULL
);

-- learning_plans: personalized curriculum per child per subject
CREATE TABLE learning_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  goals JSONB NOT NULL DEFAULT '[]',
  current_topic TEXT,
  curriculum JSONB
);

-- sessions: individual tutoring sessions
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  learning_plan_id UUID REFERENCES learning_plans(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active',
  started_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ,
  recording_url TEXT
);

-- session_summaries: AI-generated post-session reports
CREATE TABLE session_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE UNIQUE,
  summary TEXT,
  topics_covered TEXT[],
  strengths TEXT[],
  areas_for_improvement TEXT[],
  engagement_score REAL,
  comprehension_score REAL
);

-- progress: granular topic mastery tracking
CREATE TABLE progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  topic TEXT NOT NULL,
  score REAL NOT NULL DEFAULT 0.0,
  UNIQUE(child_id, subject, topic)
);

-- transcript_entries: conversation transcript from sessions
CREATE TABLE transcript_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  speaker TEXT NOT NULL,
  text TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Demo Data ──────────────────────────────────────────────────────────────

-- Insert demo child
INSERT INTO children (id, name, age, grade, pin)
VALUES ('00000000-0000-0000-0000-000000000001', 'Alex', 12, 7, '1234')
ON CONFLICT (id) DO NOTHING;
