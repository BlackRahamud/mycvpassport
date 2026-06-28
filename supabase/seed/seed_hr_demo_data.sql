-- ═══════════════════════════════════════════════════════════════════════════
-- HR Portal · demo seed  (data only — never alters schema or RLS)
-- File: supabase/seed/seed_hr_demo_data.sql
--
-- HOW TO RUN (Supabase Studio → SQL Editor):
--   1. Replace EVERY occurrence of  :founder_uid  with your auth user id
--      (Authentication → Users, or run `select auth.uid();` while signed in).
--   2. Paste the whole file and Run. Re-running is safe — it deletes its own
--      prior demo rows first (idempotent).
--
-- WHAT IT CREATES (all tied to YOUR hr_id, so RLS keeps it private):
--   • 1 active corridor job: "Staff Nurse — Dubai" (India→Gulf healthcare).
--   • 8 applications spread across every pipeline stage:
--       Shortlist ×4  →  Ready ×1  →  Interviewed ×1  →  Offer ×1  →  Hired ×1
--     each with a realistic name, phone, visa status and an ats_score.
--   • 4 candidates with a RICH parsed cv_snapshot (detail panel renders full:
--     Verdict + Looking-for-Position + Skills + Experience + Education),
--     3 with a lighter-but-complete snapshot, and 1 deliberately
--     snapshot-less (upload-only) so the empty-state guards stay clean.
--   • 2 interviews (1 completed in the past, 1 scheduled in the future) and a
--     set of candidate_events so the Insights dashboard looks lived-in.
--
-- TAGGING / CLEANUP: demo applications use the @demo.cvpassport.com email
--   domain; demo events carry metadata.source='hr_demo_seed'; demo interviews
--   carry "[hr_demo_seed]" in their note. A commented teardown is at the bottom.
--
-- NOTE: seeded candidates have no auth.users row, so candidate_id is NULL (FK).
--   The per-candidate Outreach / Interview timelines in the detail panel key
--   off candidate_id and will read empty for these rows, but the hr-scoped
--   dashboards (Insights interview counts + time-to-fill, AttentionPanel
--   "upcoming interviews") populate normally.
-- ═══════════════════════════════════════════════════════════════════════════

DO $seed$
DECLARE
  founder_uid_text text := ':founder_uid';
  founder_uid      uuid;
  demo_job         uuid;
  app_ready        uuid;   -- Reshma — gets a future interview
  app_interviewed  uuid;   -- Sandeep — gets a completed interview
BEGIN
  ---------------------------------------------------------------------------
  -- 0. Resolve / validate the founder uid. The guard string is concatenated
  --    so a global find-replace of ":founder_uid" doesn't clobber the check.
  ---------------------------------------------------------------------------
  IF founder_uid_text = ':' || 'founder_uid' THEN
    RAISE EXCEPTION 'Replace the :founder_uid placeholder (top of the DO block) with your auth user id, then re-run.';
  END IF;
  founder_uid := founder_uid_text::uuid;

  ---------------------------------------------------------------------------
  -- 1. Cleanup prior runs (idempotent). Order: children → parent. Deleting
  --    the job also cascades, but explicit deletes survive partial prior runs.
  ---------------------------------------------------------------------------
  DELETE FROM public.interviews
    WHERE hr_id = founder_uid AND note LIKE '%[hr_demo_seed]%';
  DELETE FROM public.candidate_events
    WHERE hr_id = founder_uid AND (metadata->>'source') = 'hr_demo_seed';
  DELETE FROM public.applications
    WHERE candidate_email LIKE '%@demo.cvpassport.com';
  DELETE FROM public.jobs
    WHERE hr_id = founder_uid
      AND title = 'Staff Nurse — Dubai'
      AND company = 'CVPassport Demo Co';

  ---------------------------------------------------------------------------
  -- 2. The job (active, hr_portal, gulf). skills + screening_questions are
  --    set so the pipeline detail renders those sections.
  ---------------------------------------------------------------------------
  INSERT INTO public.jobs (
    hr_id, title, company, department, location, market, job_type,
    salary_min, salary_max, currency, salary_unit, visa_sponsored,
    experience_years, experience_min, experience_max,
    position, source, hiring_status, status,
    description, requirements, keywords, skills, screening_questions,
    posted_at
  ) VALUES (
    founder_uid,
    'Staff Nurse — Dubai',
    'CVPassport Demo Co',
    'Nursing',
    'Dubai, UAE',
    'gulf',
    'full-time',
    4000, 6500, 'AED', 'per Month', true,
    2, 2, 8,
    'onsite', 'hr_portal', 'active', 'active',
    'We are hiring registered Staff Nurses for a multi-specialty facility in Dubai, with a structured relocation and licensing pathway for nurses moving from India to the Gulf. You will deliver bedside care across Med-Surg and ICU rotations, support admissions and discharges, and work within a multidisciplinary team. Sponsorship, flights and accommodation support are provided for selected candidates.',
    '["Valid Gulf nursing license or clear eligibility","2+ years post-registration clinical experience","BLS and ACLS certification","Med-Surg or ICU exposure","Willing to relocate to Dubai within 60 days"]'::jsonb,
    '["Gulf License","BLS","ACLS","Med-Surg","ICU","Patient Care"]'::jsonb,
    '["IV Therapy","Patient Assessment","Wound Care","Electronic Health Records","Infection Control","Medication Administration"]'::jsonb,
    '[
      {"question":"Do you hold a valid Gulf nursing license, or are you eligible to obtain one?"},
      {"question":"How many years of post-registration clinical experience do you have?"},
      {"question":"What is your notice period, and when could you relocate to Dubai?"}
    ]'::jsonb,
    now() - interval '10 days'
  ) RETURNING id INTO demo_job;

  ---------------------------------------------------------------------------
  -- 3. Applications across the pipeline. candidate_id NULL (no auth user).
  ---------------------------------------------------------------------------

  -- (1) SHORTLIST · Maria Fernandes · ATS 90 · RICH snapshot
  INSERT INTO public.applications (
    candidate_id, job_id, hr_id, candidate_name, candidate_email, candidate_phone,
    visa_status, ats_score, score_source, match_keywords, missing_keywords,
    cv_snapshot, recruiter_notes, status, is_visible_to_hr, applied_at, viewed_at
  ) VALUES (
    NULL, demo_job, founder_uid, 'Maria Fernandes', 'maria.fernandes@demo.cvpassport.com', '+91-98-470-11201',
    'Visit visa (eligible)', 90, 'phase_1_full',
    '["BLS","ACLS","Med-Surg","ICU","Patient Care"]'::jsonb, '["Gulf License"]'::jsonb,
    '{
      "role":"Staff Nurse",
      "summary":"Registered nurse with 6 years Med-Surg and ICU experience across multi-specialty hospitals; BLS and ACLS certified and preparing for Gulf licensing.",
      "personal":{"location":"Kochi, India","job_type":"Full-time","work_mode":"Onsite","expected_salary":"AED 5,500 / month","industry":"Healthcare","notice_period":"30 days","headline":"Staff Nurse · Med-Surg & ICU"},
      "desired_job":"Staff Nurse — Gulf","sector":"Healthcare","compensation":"AED 5,500 / month","position_preference":"Onsite","notice_period":"30 days",
      "skills":["IV Therapy","Patient Assessment","ACLS","BLS","Wound Care","Electronic Health Records","Infection Control","Medication Administration"],
      "experience":[
        {"title":"Staff Nurse — ICU","company":"Multi-specialty Hospital, Kochi","start_date":"Mar 2021","end_date":"Present"},
        {"title":"Staff Nurse — Med-Surg","company":"District General Hospital","start_date":"Jun 2018","end_date":"Feb 2021"}
      ],
      "education":[{"school":"State Nursing College","degree":"B.Sc Nursing","field":"Nursing","start_date":"2014","end_date":"2018"}],
      "screening_answers":["Yes — eligible, Gulf license application in progress","6 years post-registration","30 days notice; can relocate within 45 days"]
    }'::jsonb,
    '[{"text":"Strong ICU background — fast-track for license check.","ts":"2026-06-22T09:00:00Z","author":"HR"}]'::jsonb,
    'shortlisted', true, now() - interval '7 days', now() - interval '5 days'
  );

  -- (2) SHORTLIST (NEW badge) · Anjali Nair · ATS 84 · RICH snapshot
  INSERT INTO public.applications (
    candidate_id, job_id, hr_id, candidate_name, candidate_email, candidate_phone,
    visa_status, ats_score, score_source, match_keywords, missing_keywords,
    cv_snapshot, status, is_visible_to_hr, applied_at, viewed_at
  ) VALUES (
    NULL, demo_job, founder_uid, 'Anjali Nair', 'anjali.nair@demo.cvpassport.com', '+91-99-000-31204',
    'Needs sponsorship', 84, 'phase_1_full',
    '["BLS","Med-Surg","Patient Care"]'::jsonb, '["ACLS","ICU","Gulf License"]'::jsonb,
    '{
      "role":"Staff Nurse",
      "summary":"Med-Surg nurse with 3 years in a tertiary care hospital; BLS certified, ACLS in progress, keen on a Gulf move.",
      "personal":{"location":"Bengaluru, India","job_type":"Full-time","work_mode":"Onsite","expected_salary":"AED 4,800 / month","industry":"Healthcare","notice_period":"45 days","headline":"Staff Nurse · Med-Surg"},
      "desired_job":"Staff Nurse — Gulf","sector":"Healthcare","compensation":"AED 4,800 / month","position_preference":"Onsite","notice_period":"45 days",
      "skills":["Patient Assessment","BLS","Wound Care","Medication Administration","Electronic Health Records"],
      "experience":[
        {"title":"Staff Nurse — Med-Surg","company":"Tertiary Care Hospital, Bengaluru","start_date":"Apr 2022","end_date":"Present"},
        {"title":"Nursing Intern","company":"Community Health Centre","start_date":"Jun 2021","end_date":"Mar 2022"}
      ],
      "education":[{"school":"City Nursing Institute","degree":"B.Sc Nursing","field":"Nursing","start_date":"2017","end_date":"2021"}],
      "screening_answers":["Eligible — preparing license exam","3 years post-registration","45 days notice; can relocate within 60 days"]
    }'::jsonb,
    'new', true, now() - interval '1 day', NULL
  );

  -- (3) SHORTLIST · Joseph Mathew · ATS 71 · UPLOAD-ONLY (NO snapshot) ⇒ guards
  --     cv_snapshot NULL: detail panel hides Looking-for-Position / Skills /
  --     Experience / Education cleanly (no wall of "—"). cv_file_path left NULL
  --     because a SQL seed can't place a real file in the applicant-cvs bucket;
  --     set it to a real path only if you upload a matching file.
  INSERT INTO public.applications (
    candidate_id, job_id, hr_id, candidate_name, candidate_email, candidate_phone,
    visa_status, ats_score, score_source, cv_snapshot, cv_file_path,
    status, is_visible_to_hr, applied_at, viewed_at
  ) VALUES (
    NULL, demo_job, founder_uid, 'Joseph Mathew', 'joseph.mathew@demo.cvpassport.com', '+971-50-555-41203',
    'Own visa', 71, NULL, NULL, NULL,
    'shortlisted', true, now() - interval '3 days', now() - interval '2 days'
  );

  -- (4) READY · Reshma Pillai · ATS 85 · snapshot · → future interview
  INSERT INTO public.applications (
    candidate_id, job_id, hr_id, candidate_name, candidate_email, candidate_phone,
    visa_status, ats_score, score_source, match_keywords, missing_keywords,
    cv_snapshot, status, is_visible_to_hr, applied_at, viewed_at
  ) VALUES (
    NULL, demo_job, founder_uid, 'Reshma Pillai', 'reshma.pillai@demo.cvpassport.com', '+91-97-450-51206',
    'Own visa', 85, 'phase_1_full',
    '["BLS","ICU","Patient Care"]'::jsonb, '["ACLS"]'::jsonb,
    '{
      "role":"Staff Nurse — ICU",
      "summary":"ICU nurse with 4 years critical-care experience, already on a UAE residence visa.",
      "personal":{"location":"Dubai, UAE","job_type":"Full-time","work_mode":"Onsite","expected_salary":"AED 5,800 / month","industry":"Healthcare","notice_period":"30 days"},
      "desired_job":"Staff Nurse — ICU","sector":"Healthcare","compensation":"AED 5,800 / month","position_preference":"Onsite","notice_period":"30 days",
      "skills":["Critical Care","BLS","Ventilator Management","Patient Assessment"],
      "experience":[{"title":"Staff Nurse — ICU","company":"Private Hospital, Dubai","start_date":"Feb 2022","end_date":"Present"}],
      "education":[{"school":"State Nursing College","degree":"B.Sc Nursing","field":"Nursing","start_date":"2014","end_date":"2018"}],
      "screening_answers":["Yes — Gulf license held","4 years post-registration","30 days; already in Dubai"]
    }'::jsonb,
    'ready', true, now() - interval '9 days', now() - interval '6 days'
  ) RETURNING id INTO app_ready;

  -- (5) INTERVIEWED · Sandeep Kumar · ATS 88 · RICH snapshot · → completed interview
  INSERT INTO public.applications (
    candidate_id, job_id, hr_id, candidate_name, candidate_email, candidate_phone,
    visa_status, ats_score, score_source, match_keywords, missing_keywords,
    cv_snapshot, recruiter_notes, status, is_visible_to_hr, applied_at, viewed_at, updated_at
  ) VALUES (
    NULL, demo_job, founder_uid, 'Sandeep Kumar', 'sandeep.kumar@demo.cvpassport.com', '+91-98-110-61208',
    'Needs sponsorship', 88, 'phase_1_full',
    '["BLS","ACLS","ICU","Med-Surg","Patient Care"]'::jsonb, '["Gulf License"]'::jsonb,
    '{
      "role":"Senior Staff Nurse",
      "summary":"Senior nurse with 8 years across ICU and Med-Surg, BLS/ACLS certified, charge-nurse experience and a clean relocation profile.",
      "personal":{"location":"Chennai, India","job_type":"Full-time","work_mode":"Onsite","expected_salary":"AED 6,200 / month","industry":"Healthcare","notice_period":"60 days","headline":"Senior Staff Nurse · ICU"},
      "desired_job":"Staff Nurse — Gulf","sector":"Healthcare","compensation":"AED 6,200 / month","position_preference":"Onsite","notice_period":"60 days",
      "skills":["Critical Care","ACLS","BLS","Ventilator Management","Triage","Wound Care","Electronic Health Records","Team Leadership"],
      "experience":[
        {"title":"Senior Staff Nurse — ICU","company":"Multi-specialty Hospital, Chennai","start_date":"Jan 2020","end_date":"Present"},
        {"title":"Staff Nurse — Emergency","company":"Regional Medical Centre","start_date":"Aug 2016","end_date":"Dec 2019"}
      ],
      "education":[{"school":"State Nursing College","degree":"B.Sc Nursing","field":"Nursing","start_date":"2012","end_date":"2016"}],
      "screening_answers":["Eligible — license exam booked","8 years post-registration","60 days notice; can relocate after"]
    }'::jsonb,
    '[{"text":"Clinical screening went well — strong ICU answers. Proposing offer.","ts":"2026-06-25T11:30:00Z","author":"HR"}]'::jsonb,
    'interviewed', true, now() - interval '12 days', now() - interval '9 days', now() - interval '3 days'
  ) RETURNING id INTO app_interviewed;

  -- (6) OFFER · Fathima Noor · ATS 91 · snapshot
  INSERT INTO public.applications (
    candidate_id, job_id, hr_id, candidate_name, candidate_email, candidate_phone,
    visa_status, ats_score, score_source, match_keywords, missing_keywords,
    cv_snapshot, status, is_visible_to_hr, applied_at, viewed_at, updated_at
  ) VALUES (
    NULL, demo_job, founder_uid, 'Fathima Noor', 'fathima.noor@demo.cvpassport.com', '+971-55-555-71209',
    'Own visa', 91, 'phase_1_full',
    '["BLS","ACLS","Med-Surg","Patient Care"]'::jsonb, '[]'::jsonb,
    '{
      "role":"Staff Nurse",
      "summary":"Med-Surg nurse, 5 years, UAE residence visa, available at short notice.",
      "personal":{"location":"Sharjah, UAE","job_type":"Full-time","work_mode":"Onsite","expected_salary":"AED 6,000 / month","industry":"Healthcare","notice_period":"Immediate"},
      "desired_job":"Staff Nurse — Gulf","sector":"Healthcare","compensation":"AED 6,000 / month","position_preference":"Onsite","notice_period":"Immediate",
      "skills":["Med-Surg","BLS","ACLS","Patient Assessment","Medication Administration"],
      "experience":[{"title":"Staff Nurse — Med-Surg","company":"Private Hospital, Sharjah","start_date":"May 2021","end_date":"Present"}],
      "education":[{"school":"City Nursing Institute","degree":"B.Sc Nursing","field":"Nursing","start_date":"2013","end_date":"2017"}],
      "screening_answers":["Yes — Gulf license held","5 years post-registration","Immediate; already in UAE"]
    }'::jsonb,
    'offered', true, now() - interval '14 days', now() - interval '11 days', now() - interval '6 days'
  );

  -- (7) HIRED · Vinod Menon · ATS 93 · RICH snapshot · drives time-to-fill
  INSERT INTO public.applications (
    candidate_id, job_id, hr_id, candidate_name, candidate_email, candidate_phone,
    visa_status, ats_score, score_source, match_keywords, missing_keywords,
    cv_snapshot, recruiter_notes, status, is_visible_to_hr, applied_at, viewed_at, updated_at
  ) VALUES (
    NULL, demo_job, founder_uid, 'Vinod Menon', 'vinod.menon@demo.cvpassport.com', '+91-98-950-81210',
    'Own visa', 93, 'phase_1_full',
    '["BLS","ACLS","ICU","Med-Surg","Patient Care"]'::jsonb, '[]'::jsonb,
    '{
      "role":"Charge Nurse",
      "summary":"Charge nurse with 9 years across ICU and Med-Surg, BLS/ACLS certified, Gulf-licensed and relocated.",
      "personal":{"location":"Kochi, India","job_type":"Full-time","work_mode":"Onsite","expected_salary":"AED 6,500 / month","industry":"Healthcare","notice_period":"30 days","headline":"Charge Nurse · ICU"},
      "desired_job":"Staff Nurse — Gulf","sector":"Healthcare","compensation":"AED 6,500 / month","position_preference":"Onsite","notice_period":"30 days",
      "skills":["Critical Care","ACLS","BLS","Ventilator Management","Team Leadership","Triage","Wound Care","Electronic Health Records"],
      "experience":[
        {"title":"Charge Nurse — ICU","company":"Multi-specialty Hospital, Kochi","start_date":"Jun 2019","end_date":"Present"},
        {"title":"Staff Nurse — ICU","company":"District General Hospital","start_date":"Jul 2015","end_date":"May 2019"}
      ],
      "education":[{"school":"State Nursing College","degree":"B.Sc Nursing","field":"Nursing","start_date":"2011","end_date":"2015"}],
      "screening_answers":["Yes — Gulf license held","9 years post-registration","30 days; ready to relocate"]
    }'::jsonb,
    '[{"text":"Offer accepted. Onboarding paperwork sent.","ts":"2026-06-24T14:00:00Z","author":"HR"}]'::jsonb,
    'hired', true, now() - interval '20 days', now() - interval '18 days', now() - interval '4 days'
  );

  -- (8) SHORTLIST · Deepa Raj · ATS 80 · snapshot
  INSERT INTO public.applications (
    candidate_id, job_id, hr_id, candidate_name, candidate_email, candidate_phone,
    visa_status, ats_score, score_source, match_keywords, missing_keywords,
    cv_snapshot, status, is_visible_to_hr, applied_at, viewed_at
  ) VALUES (
    NULL, demo_job, founder_uid, 'Deepa Raj', 'deepa.raj@demo.cvpassport.com', '+91-99-620-91211',
    'Visit visa (eligible)', 80, 'phase_1_full',
    '["BLS","Med-Surg","Patient Care"]'::jsonb, '["ACLS","ICU"]'::jsonb,
    '{
      "role":"Staff Nurse",
      "summary":"Med-Surg nurse with 3 years experience, BLS certified, exploring Gulf opportunities.",
      "personal":{"location":"Hyderabad, India","job_type":"Full-time","work_mode":"Onsite","expected_salary":"AED 4,600 / month","industry":"Healthcare","notice_period":"30 days"},
      "desired_job":"Staff Nurse — Gulf","sector":"Healthcare","compensation":"AED 4,600 / month","position_preference":"Onsite","notice_period":"30 days",
      "skills":["Med-Surg","BLS","Patient Assessment","Wound Care"],
      "experience":[{"title":"Staff Nurse — Med-Surg","company":"Tertiary Care Hospital, Hyderabad","start_date":"Aug 2022","end_date":"Present"}],
      "education":[{"school":"City Nursing Institute","degree":"B.Sc Nursing","field":"Nursing","start_date":"2018","end_date":"2022"}],
      "screening_answers":["Eligible — preparing license exam","3 years post-registration","30 days notice"]
    }'::jsonb,
    'shortlisted', true, now() - interval '4 days', now() - interval '3 days'
  );

  ---------------------------------------------------------------------------
  -- 4. Interviews — 1 completed (past), 1 scheduled (future). hr-scoped, so
  --    they feed Insights (scheduled/completed) and AttentionPanel (upcoming).
  ---------------------------------------------------------------------------
  INSERT INTO public.interviews (
    application_id, job_id, hr_id, candidate_id,
    scheduled_at, duration_min, meeting_link, note, status, created_at
  ) VALUES
    (app_interviewed, demo_job, founder_uid, NULL,
     now() - interval '3 days', 45, 'https://meet.google.com/demo-nurse-screening',
     'Clinical screening — ICU/Med-Surg [hr_demo_seed]', 'completed', now() - interval '6 days'),
    (app_ready, demo_job, founder_uid, NULL,
     now() + interval '2 days', 30, 'https://meet.google.com/demo-nurse-intro',
     'Intro call — license + relocation [hr_demo_seed]', 'scheduled', now() - interval '1 day');

  ---------------------------------------------------------------------------
  -- 5. candidate_events — journey history. metadata.source tags them for
  --    cleanup. The 'hired' event drives the Insights time-to-fill figure.
  ---------------------------------------------------------------------------
  INSERT INTO public.candidate_events (candidate_id, job_id, hr_id, event_type, metadata, created_at) VALUES
    -- Vinod (hired) full journey
    (NULL, demo_job, founder_uid, 'shortlisted',       '{"source":"hr_demo_seed","demo":true}'::jsonb, now() - interval '18 days'),
    (NULL, demo_job, founder_uid, 'whatsapp_outreach', '{"source":"hr_demo_seed","demo":true,"template":"first_contact","preview":"Hi Vinod, thanks for applying for the Staff Nurse role..."}'::jsonb, now() - interval '16 days'),
    (NULL, demo_job, founder_uid, 'interviewed',       '{"source":"hr_demo_seed","demo":true}'::jsonb, now() - interval '10 days'),
    (NULL, demo_job, founder_uid, 'offered',           '{"source":"hr_demo_seed","demo":true}'::jsonb, now() - interval '7 days'),
    (NULL, demo_job, founder_uid, 'hired',             '{"source":"hr_demo_seed","demo":true}'::jsonb, now() - interval '4 days'),
    -- Sandeep (interviewed)
    (NULL, demo_job, founder_uid, 'shortlisted',       '{"source":"hr_demo_seed","demo":true}'::jsonb, now() - interval '10 days'),
    (NULL, demo_job, founder_uid, 'whatsapp_outreach', '{"source":"hr_demo_seed","demo":true,"template":"interview","preview":"Hi Sandeep, we would like to invite you to interview..."}'::jsonb, now() - interval '5 days'),
    (NULL, demo_job, founder_uid, 'interviewed',       '{"source":"hr_demo_seed","demo":true}'::jsonb, now() - interval '3 days'),
    -- Fathima (offered)
    (NULL, demo_job, founder_uid, 'shortlisted',       '{"source":"hr_demo_seed","demo":true}'::jsonb, now() - interval '11 days'),
    (NULL, demo_job, founder_uid, 'offered',           '{"source":"hr_demo_seed","demo":true}'::jsonb, now() - interval '6 days');

  RAISE NOTICE '✓ HR demo seed applied for hr_id %: 1 job + 8 applications + 2 interviews + 10 events.', founder_uid;
END
$seed$;

-- ═══════════════════════════════════════════════════════════════════════════
-- TEARDOWN — remove every row this seed created. Replace :founder_uid, then
-- uncomment and run.
-- ═══════════════════════════════════════════════════════════════════════════
-- DO $teardown$
-- DECLARE founder_uid uuid := ':founder_uid';
-- BEGIN
--   DELETE FROM public.interviews
--     WHERE hr_id = founder_uid AND note LIKE '%[hr_demo_seed]%';
--   DELETE FROM public.candidate_events
--     WHERE hr_id = founder_uid AND (metadata->>'source') = 'hr_demo_seed';
--   DELETE FROM public.applications
--     WHERE candidate_email LIKE '%@demo.cvpassport.com';
--   DELETE FROM public.jobs
--     WHERE hr_id = founder_uid AND title = 'Staff Nurse — Dubai' AND company = 'CVPassport Demo Co';
--   RAISE NOTICE '✓ HR demo seed removed for hr_id %.', founder_uid;
-- END
-- $teardown$;
