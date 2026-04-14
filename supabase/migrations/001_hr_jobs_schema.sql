-- CVPassport HR & Jobs Schema Migration
-- Run in Supabase SQL Editor in order
-- Project: evihcqpvoorsdmzjnvjz

-- ═══════════════════════════════════════════════════════════════
-- 1. Add columns to existing profiles table
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS user_type text DEFAULT 'candidate'
CHECK (user_type IN ('candidate', 'recruiter', 'both'));

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS company_name text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS work_email text;

-- ═══════════════════════════════════════════════════════════════
-- 2. HR profiles table
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS hr_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name text NOT NULL,
  company_size text,
  work_email text,
  verified boolean DEFAULT false,
  plan text DEFAULT 'free' CHECK (plan IN ('free', 'pro')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- ═══════════════════════════════════════════════════════════════
-- 3. Jobs table
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hr_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  company text NOT NULL,
  department text,
  location text NOT NULL,
  market text DEFAULT 'gulf' CHECK (market IN ('gulf', 'india')),
  job_type text DEFAULT 'full-time'
    CHECK (job_type IN ('full-time', 'part-time', 'contract')),
  salary_min integer,
  salary_max integer,
  currency text DEFAULT 'AED',
  visa_sponsored boolean DEFAULT false,
  experience_years integer,
  description text,
  requirements jsonb DEFAULT '[]',
  keywords jsonb DEFAULT '[]',
  perks jsonb DEFAULT '[]',
  hiring_status text DEFAULT 'active'
    CHECK (hiring_status IN ('active', 'urgent', 'slow', 'closed')),
  status text DEFAULT 'published'
    CHECK (status IN ('draft', 'published', 'closed')),
  view_count integer DEFAULT 0,
  posted_at timestamptz DEFAULT now(),
  closes_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════
-- 4. Applications table
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id uuid REFERENCES jobs(id) ON DELETE CASCADE,
  hr_id uuid REFERENCES auth.users(id),
  cv_snapshot jsonb,
  ats_score integer DEFAULT 0,
  match_keywords jsonb DEFAULT '[]',
  missing_keywords jsonb DEFAULT '[]',
  is_visible_to_hr boolean DEFAULT true,
  cooldown_expires_at timestamptz,
  status text DEFAULT 'submitted'
    CHECK (status IN (
      'submitted','viewed','shortlisted',
      'interviewing','offered','hired','rejected'
    )),
  candidate_name text,
  candidate_email text,
  candidate_phone text,
  visa_status text,
  applied_at timestamptz DEFAULT now(),
  viewed_at timestamptz,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(candidate_id, job_id)
);

-- ═══════════════════════════════════════════════════════════════
-- 5. Candidate events table (journey timeline)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS candidate_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id uuid REFERENCES jobs(id) ON DELETE CASCADE,
  hr_id uuid REFERENCES auth.users(id),
  event_type text NOT NULL CHECK (event_type IN (
    'applied','viewed','shortlisted',
    'interviewing','offered','hired',
    'rejected','reapplied','cooldown_start',
    'job_closed','profile_saved'
  )),
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════
-- 6. HR Notifications table
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS hr_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hr_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  candidate_id uuid REFERENCES auth.users(id),
  job_id uuid REFERENCES jobs(id),
  application_id uuid REFERENCES applications(id),
  title text NOT NULL,
  body text,
  type text CHECK (type IN (
    'new_application','viewed','shortlisted',
    'job_closed','system'
  )),
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════
-- 7. RPC: increment job views
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION increment_job_views(p_job_id uuid)
RETURNS void AS $$
  UPDATE jobs SET view_count = view_count + 1 WHERE id = p_job_id;
$$ LANGUAGE sql SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════
-- 8. ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════════

-- HR profiles
ALTER TABLE hr_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "HR sees own profile" ON hr_profiles
  FOR ALL USING (auth.uid() = user_id);

-- Jobs
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "HR manages own jobs" ON jobs
  FOR ALL USING (auth.uid() = hr_id);

CREATE POLICY "Public can read published jobs" ON jobs
  FOR SELECT USING (status = 'published');

-- Applications
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "HR sees visible applications for own jobs" ON applications
  FOR SELECT USING (
    auth.uid() = hr_id
    AND is_visible_to_hr = true
  );

CREATE POLICY "HR updates application status" ON applications
  FOR UPDATE USING (auth.uid() = hr_id);

CREATE POLICY "Candidate sees own applications" ON applications
  FOR SELECT USING (auth.uid() = candidate_id);

CREATE POLICY "Candidate inserts own application" ON applications
  FOR INSERT WITH CHECK (auth.uid() = candidate_id);

CREATE POLICY "Candidate updates own application" ON applications
  FOR UPDATE USING (auth.uid() = candidate_id);

-- Candidate events
ALTER TABLE candidate_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Candidate sees own events" ON candidate_events
  FOR SELECT USING (auth.uid() = candidate_id);

CREATE POLICY "HR sees events for own jobs" ON candidate_events
  FOR SELECT USING (auth.uid() = hr_id);

CREATE POLICY "System inserts events" ON candidate_events
  FOR INSERT WITH CHECK (
    auth.uid() = candidate_id OR auth.uid() = hr_id
  );

-- Notifications
ALTER TABLE hr_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "HR sees own notifications" ON hr_notifications
  FOR ALL USING (auth.uid() = hr_id);
