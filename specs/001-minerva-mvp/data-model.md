# Data Model: Minerva AI Avatar Tutor

**Feature Branch**: `001-minerva-mvp`
**Storage**: Supabase (PostgreSQL + Auth + Realtime)

## Entity Relationship

```
profiles (1) ──< children (1) ──< sessions (1) ──< transcript_entries
                    │                  │
                    │                  └──(1) session_summaries
                    │
                    ├──< learning_plans
                    │
                    └──< progress
```

## Tables

### profiles
Extends Supabase Auth. Links auth.users to app-level roles.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, FK → auth.users(id) | Supabase auth user ID |
| role | TEXT | NOT NULL, CHECK IN ('parent', 'student') | User role |
| display_name | TEXT | NOT NULL | Display name |

### children
Student profiles created by parents.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Child ID |
| parent_id | UUID | NOT NULL, FK → profiles(id) | Owning parent |
| name | TEXT | NOT NULL | Child's name |
| age | INTEGER | NOT NULL | Child's age |
| grade | INTEGER | NOT NULL | Grade level (6-8) |
| pin | TEXT | NOT NULL | 4-digit access code for student login |

### learning_plans
Personalized curriculum per child per subject.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Plan ID |
| child_id | UUID | NOT NULL, FK → children(id) | Child this plan belongs to |
| subject | TEXT | NOT NULL | Subject (e.g., "Algebra") |
| goals | JSONB | NOT NULL | Array of goal objects |
| current_topic | TEXT | | Currently active topic |
| curriculum | JSONB | | Ordered topics from Claude |

### sessions
Individual tutoring sessions.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Session ID |
| child_id | UUID | NOT NULL, FK → children(id) | Student in session |
| learning_plan_id | UUID | FK → learning_plans(id) | Active learning plan |
| status | TEXT | DEFAULT 'active' | active, completed, error |
| started_at | TIMESTAMPTZ | | Session start time |
| ended_at | TIMESTAMPTZ | | Session end time |
| recording_url | TEXT | | URL to session recording |

### session_summaries
AI-generated post-session reports.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Summary ID |
| session_id | UUID | NOT NULL, FK → sessions(id), UNIQUE | One summary per session |
| summary | TEXT | | Narrative summary |
| topics_covered | TEXT[] | | List of topics discussed |
| strengths | TEXT[] | | Observed student strengths |
| areas_for_improvement | TEXT[] | | Areas needing work |
| engagement_score | REAL | | 0.0 - 1.0 engagement rating |
| comprehension_score | REAL | | 0.0 - 1.0 comprehension rating |

### progress
Granular topic mastery tracking.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Record ID |
| child_id | UUID | NOT NULL, FK → children(id) | Student |
| subject | TEXT | NOT NULL | Subject area |
| topic | TEXT | NOT NULL | Specific topic |
| score | REAL | DEFAULT 0.0 | Mastery score 0.0 - 1.0 |
| | | UNIQUE(child_id, subject, topic) | One score per topic per child |

### transcript_entries
Conversation transcript from sessions.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Entry ID |
| session_id | UUID | NOT NULL, FK → sessions(id) | Parent session |
| speaker | TEXT | NOT NULL | "student" or "tutor" |
| text | TEXT | NOT NULL | What was said |
| timestamp | TIMESTAMPTZ | NOT NULL | When it was said |

## Row Level Security (RLS)

- Parents can only read/write their own children's data
- Students can only read their own session data
- Session summaries inherit access from the parent session
- All tables have RLS enabled

## SQL Migration

See `supabase/migrations/001_initial_schema.sql` (created during implementation).
