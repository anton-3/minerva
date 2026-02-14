-- Minerva AI Avatar Tutor — Initial Schema
-- See: specs/001-minerva-mvp/data-model.md

-- profiles: extends Supabase auth
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('parent', 'student')),
  display_name TEXT NOT NULL
);

-- children: student profiles created by parents
CREATE TABLE children (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
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

-- ─── Row Level Security ─────────────────────────────────────────────────────

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE children ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE transcript_entries ENABLE ROW LEVEL SECURITY;

-- Parents can read/write their own profile
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);

-- Parents can manage their own children
CREATE POLICY "Parents can read own children"
  ON children FOR SELECT USING (parent_id = auth.uid());
CREATE POLICY "Parents can insert own children"
  ON children FOR INSERT WITH CHECK (parent_id = auth.uid());
CREATE POLICY "Parents can update own children"
  ON children FOR UPDATE USING (parent_id = auth.uid());
CREATE POLICY "Parents can delete own children"
  ON children FOR DELETE USING (parent_id = auth.uid());

-- Learning plans: parents can manage their children's plans
CREATE POLICY "Parents can read children learning plans"
  ON learning_plans FOR SELECT
  USING (child_id IN (SELECT id FROM children WHERE parent_id = auth.uid()));
CREATE POLICY "Parents can insert children learning plans"
  ON learning_plans FOR INSERT
  WITH CHECK (child_id IN (SELECT id FROM children WHERE parent_id = auth.uid()));
CREATE POLICY "Parents can update children learning plans"
  ON learning_plans FOR UPDATE
  USING (child_id IN (SELECT id FROM children WHERE parent_id = auth.uid()));

-- Sessions: parents can read their children's sessions
CREATE POLICY "Parents can read children sessions"
  ON sessions FOR SELECT
  USING (child_id IN (SELECT id FROM children WHERE parent_id = auth.uid()));
CREATE POLICY "Service can manage sessions"
  ON sessions FOR ALL USING (true) WITH CHECK (true);

-- Session summaries: parents can read their children's summaries
CREATE POLICY "Parents can read children summaries"
  ON session_summaries FOR SELECT
  USING (session_id IN (
    SELECT s.id FROM sessions s
    JOIN children c ON s.child_id = c.id
    WHERE c.parent_id = auth.uid()
  ));

-- Progress: parents can read their children's progress
CREATE POLICY "Parents can read children progress"
  ON progress FOR SELECT
  USING (child_id IN (SELECT id FROM children WHERE parent_id = auth.uid()));

-- Transcript entries: parents can read their children's transcripts
CREATE POLICY "Parents can read children transcripts"
  ON transcript_entries FOR SELECT
  USING (session_id IN (
    SELECT s.id FROM sessions s
    JOIN children c ON s.child_id = c.id
    WHERE c.parent_id = auth.uid()
  ));
