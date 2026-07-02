-- ═══════════════════════════════════════════════════════════════════════════
-- HR Portal · demo seed (Apr 2026)
--
-- Apply via Supabase Studio → SQL Editor → Run.
--
-- What this does:
--   • Resolves the HR uid by email (no hard-coded UUIDs).
--   • Cleans up any prior run of this seed (matches by exact job titles
--     + the demo email domain @demo.cvpassport.com).
--   • Inserts 3 jobs against your HR account.
--   • Inserts 6 rich applications (fully written cv_snapshots) plus a
--     16-candidate pipeline spread (Jul 2026 expansion) so the kanban
--     board and the per-job analytics strip look ALIVE in demos:
--       – every stage populated (incl. Offer + Hired), 5 rejected
--       – applied_at spread across the last 30 days (volume chart)
--       – candidate_events chains with staggered timestamps, so the
--         stage-conversion funnel and median time-in-stage compute
--         real numbers instead of "not enough data yet"
--   • The 16 spread candidates get REAL auth.users rows (demo domain,
--     random bcrypt password, never able to log in usefully) because
--     applications.candidate_id and candidate_events.candidate_id are
--     FKs to auth.users. Deleting those users cascades their apps and
--     events, which keeps the cleanup honest.
--
-- Idempotent: safe to re-run. Cleanup only touches rows tagged with the
-- demo email domain or matching the three exact seed job titles under
-- this HR account; manual jobs/applications are left alone.
-- ═══════════════════════════════════════════════════════════════════════════

DO $seed$
DECLARE
  hr_uid       uuid;
  job_finance  uuid;
  job_it       uuid;
  job_hosp     uuid;
BEGIN
  ---------------------------------------------------------------------------
  -- 1. Resolve HR uid
  ---------------------------------------------------------------------------
  SELECT id INTO hr_uid
  FROM auth.users
  WHERE email = 'connectingjunaidkhan@gmail.com'
  LIMIT 1;

  IF hr_uid IS NULL THEN
    RAISE EXCEPTION 'HR user connectingjunaidkhan@gmail.com not found in auth.users. Sign in to CVPassport once with that email, then re-run this seed.';
  END IF;

  ---------------------------------------------------------------------------
  -- 2. Cleanup prior runs (idempotent)
  --    Demo apps identified by @demo.cvpassport.com email domain.
  --    Demo jobs identified by exact title + this HR account.
  --    applications.job_id has ON DELETE CASCADE so deleting jobs would
  --    also clear their apps; we delete apps first as belt-and-suspenders
  --    in case any seed ever decoupled a job from its row.
  ---------------------------------------------------------------------------
  -- Demo auth users cascade their applications + candidate_events.
  DELETE FROM auth.users
  WHERE email LIKE '%@demo.cvpassport.com';

  -- Legacy demo apps carried candidate_id = NULL (no cascade) — clean
  -- them by email tag, and their orphan events by job below.
  DELETE FROM public.applications
  WHERE candidate_email LIKE '%@demo.cvpassport.com';

  DELETE FROM public.jobs
  WHERE hr_id = hr_uid
    AND title IN (
      'Senior Finance Analyst',
      'IT Infrastructure Lead',
      'Hospitality Operations Manager'
    );

  ---------------------------------------------------------------------------
  -- 3. Insert 3 jobs
  ---------------------------------------------------------------------------
  INSERT INTO public.jobs (
    hr_id, title, company, department, location, market, job_type,
    salary_min, salary_max, currency, visa_sponsored, experience_years,
    description, requirements, keywords,
    hiring_status, status, posted_at
  ) VALUES (
    hr_uid,
    'Senior Finance Analyst',
    'CVPassport Demo Co',
    'Finance',
    'Dubai, UAE',
    'gulf',
    'full-time',
    18000, 28000, 'AED',
    true,
    5,
    'We are hiring a Senior Finance Analyst to join our regional finance team in Dubai. You will own monthly close, IFRS reporting, and contribute to UAE Corporate Tax submissions following the 2024 rollout. Reports into the Regional CFO; partners with FP&A and Tax across UAE/KSA entities.',
    '["ACCA or CFA qualified","IFRS reporting experience","UAE Corporate Tax 2024 familiarity","Advanced Excel + SAP FICO","5+ years GCC finance experience"]'::jsonb,
    '["ACCA","CFA","IFRS","Corporate Tax","SAP FICO","UAE VAT"]'::jsonb,
    'active', 'published',
    now() - interval '5 days'
  ) RETURNING id INTO job_finance;

  INSERT INTO public.jobs (
    hr_id, title, company, department, location, market, job_type,
    salary_min, salary_max, currency, visa_sponsored, experience_years,
    description, requirements, keywords,
    hiring_status, status, posted_at
  ) VALUES (
    hr_uid,
    'IT Infrastructure Lead',
    'CVPassport Demo Co',
    'Technology',
    'Abu Dhabi, UAE',
    'gulf',
    'full-time',
    22000, 35000, 'AED',
    true,
    8,
    'Lead infrastructure modernisation across our UAE operations: AWS migration, on-prem Kubernetes, Terraform IaC and the security baseline. You will own the multi-region production estate and a team of 6 engineers.',
    '["8+ years infrastructure engineering","AWS Solutions Architect Pro preferred","Production Kubernetes + Terraform","CISSP advantage","Strong incident-response track record"]'::jsonb,
    '["AWS","Kubernetes","Terraform","CISSP","Linux","GitOps"]'::jsonb,
    'urgent', 'published',
    now() - interval '2 days'
  ) RETURNING id INTO job_it;

  INSERT INTO public.jobs (
    hr_id, title, company, department, location, market, job_type,
    salary_min, salary_max, currency, visa_sponsored, experience_years,
    description, requirements, keywords,
    hiring_status, status, posted_at
  ) VALUES (
    hr_uid,
    'Hospitality Operations Manager',
    'CVPassport Demo Co',
    'Operations',
    'Dubai Marina, UAE',
    'gulf',
    'full-time',
    14000, 22000, 'AED',
    true,
    6,
    'Run F&B operations across our portfolio of 4 properties along Dubai Marina. P&L ownership, team of 60+, daily covers ~2,400. You will work directly with the GM on monthly forecasts and DTCM compliance.',
    '["6+ years hospitality ops","Opera PMS + Micros expertise","Multi-property P&L ownership","Halal certification awareness","Multilingual (Arabic/Hindi advantage)"]'::jsonb,
    '["Opera PMS","Micros","GDS","DTCM","Halal Cert","Multilingual"]'::jsonb,
    'active', 'published',
    now() - interval '8 days'
  ) RETURNING id INTO job_hosp;

  ---------------------------------------------------------------------------
  -- 4. Insert 6 applications across those 3 jobs
  --
  --    Status distribution (per the demo brief):
  --      Shortlisted × 2  (ATS 88–92)
  --      Reviewing   × 2  (ATS 73–78, status='viewed' in DB)
  --      Rejected    × 2  (ATS 47–56)
  --    Spread:
  --      Senior Finance Analyst:        Rahul (Shortlisted) + Ahmed (Reviewing)
  --      IT Infrastructure Lead:        Aisha (Shortlisted) + Hrithik (Rejected)
  --      Hospitality Operations Manager: Priya (Reviewing)  + Faisal (Rejected)
  ---------------------------------------------------------------------------

  -- 1. Rahul Sharma — Shortlisted, ATS 92, Senior Finance Analyst
  --    Top scorer, fully populated cv_snapshot so the candidate panel
  --    renders complete work history, role, location, notice period.
  INSERT INTO public.applications (
    candidate_id, job_id, hr_id,
    candidate_name, candidate_email, candidate_phone,
    visa_status, ats_score,
    match_keywords, missing_keywords,
    cv_snapshot,
    status, is_visible_to_hr,
    applied_at, viewed_at
  ) VALUES (
    NULL, job_finance, hr_uid,
    'Rahul Sharma', 'rahul.sharma@demo.cvpassport.com', '+971-50-555-1101',
    'Sponsored', 92,
    '["ACCA","IFRS","Corporate Tax","SAP FICO","UAE VAT"]'::jsonb,
    '["CFA"]'::jsonb,
    '{
      "role": "Senior Finance Analyst",
      "experience_years": 7,
      "location": "Dubai, UAE",
      "notice_period": "30 days",
      "summary": "ACCA-qualified finance professional with 7 years GCC experience leading IFRS close and UAE Corporate Tax rollouts.",
      "experience": [
        {"title":"Senior Finance Analyst","company":"Regional Holdings DMCC","period":"Jan 2023 — Present"},
        {"title":"Finance Analyst","company":"DIFC Capital Partners","period":"Aug 2020 — Dec 2022"},
        {"title":"Audit Senior","company":"Big-4 (UAE)","period":"Jul 2017 — Jul 2020"}
      ],
      "education": [
        {"degree":"ACCA","institution":"Association of Chartered Certified Accountants","year":"2019"},
        {"degree":"B.Com (Hons)","institution":"University of Delhi","year":"2017"}
      ],
      "skills": ["IFRS","UAE Corporate Tax","SAP FICO","Power BI","Advanced Excel","Financial Modelling"]
    }'::jsonb,
    'shortlisted', true,
    now() - interval '4 days', now() - interval '3 days'
  );

  -- 2. Aisha Khan — Shortlisted, ATS 88, IT Infrastructure Lead
  INSERT INTO public.applications (
    candidate_id, job_id, hr_id,
    candidate_name, candidate_email, candidate_phone,
    visa_status, ats_score,
    match_keywords, missing_keywords,
    cv_snapshot,
    status, is_visible_to_hr,
    applied_at, viewed_at
  ) VALUES (
    NULL, job_it, hr_uid,
    'Aisha Khan', 'aisha.khan@demo.cvpassport.com', '+971-55-555-2202',
    'Self-sponsored', 88,
    '["AWS","Kubernetes","Terraform","Linux"]'::jsonb,
    '["CISSP","GitOps"]'::jsonb,
    '{
      "role": "DevOps Lead",
      "experience_years": 9,
      "location": "Abu Dhabi, UAE",
      "notice_period": "60 days",
      "experience": [
        {"title":"DevOps Lead","company":"Etihad Aviation Group","period":"Mar 2022 — Present"},
        {"title":"Senior SRE","company":"Careem","period":"Jul 2019 — Feb 2022"}
      ],
      "skills": ["AWS","Kubernetes","Terraform","Linux","Python","Bash"]
    }'::jsonb,
    'shortlisted', true,
    now() - interval '1 day', now() - interval '20 hours'
  );

  -- 3. Ahmed Al-Mansouri — Reviewing, ATS 78, Senior Finance Analyst
  INSERT INTO public.applications (
    candidate_id, job_id, hr_id,
    candidate_name, candidate_email, candidate_phone,
    visa_status, ats_score,
    match_keywords, missing_keywords,
    cv_snapshot,
    status, is_visible_to_hr,
    applied_at, viewed_at
  ) VALUES (
    NULL, job_finance, hr_uid,
    'Ahmed Al-Mansouri', 'ahmed.almansouri@demo.cvpassport.com', '+971-50-555-3303',
    'Self-sponsored', 78,
    '["ACCA","IFRS"]'::jsonb,
    '["SAP FICO","Corporate Tax","UAE VAT","CFA"]'::jsonb,
    '{
      "role": "Finance Analyst",
      "experience_years": 4,
      "location": "Dubai, UAE",
      "notice_period": "30 days",
      "experience": [
        {"title":"Finance Analyst","company":"Regional Trading FZE","period":"Sep 2022 — Present"},
        {"title":"Junior Auditor","company":"Mid-tier Audit Firm","period":"Aug 2020 — Aug 2022"}
      ],
      "skills": ["IFRS","Excel","Tally","ACCA part-qualified"]
    }'::jsonb,
    'viewed', true,
    now() - interval '5 days', now() - interval '2 days'
  );

  -- 4. Priya Iyer — Reviewing, ATS 73, Hospitality Operations Manager
  INSERT INTO public.applications (
    candidate_id, job_id, hr_id,
    candidate_name, candidate_email, candidate_phone,
    visa_status, ats_score,
    match_keywords, missing_keywords,
    cv_snapshot,
    status, is_visible_to_hr,
    applied_at, viewed_at
  ) VALUES (
    NULL, job_hosp, hr_uid,
    'Priya Iyer', 'priya.iyer@demo.cvpassport.com', '+91-98-555-4404',
    'Tourist (eligibility)', 73,
    '["Opera PMS","Micros","Multilingual"]'::jsonb,
    '["GDS","DTCM","Halal Cert"]'::jsonb,
    '{
      "role": "F&B Operations Supervisor",
      "experience_years": 6,
      "location": "Mumbai, India",
      "notice_period": "60 days",
      "experience": [
        {"title":"F&B Operations Supervisor","company":"5-Star Property (Mumbai)","period":"Jan 2022 — Present"},
        {"title":"Outlet Manager","company":"Boutique Hotel Group","period":"Jun 2019 — Dec 2021"}
      ],
      "skills": ["Opera PMS","Micros","Team Mgmt","Hindi/Marathi/English"]
    }'::jsonb,
    'viewed', true,
    now() - interval '6 days', now() - interval '4 days'
  );

  -- 5. Hrithik Bhakat — Rejected, ATS 56, IT Infrastructure Lead
  INSERT INTO public.applications (
    candidate_id, job_id, hr_id,
    candidate_name, candidate_email, candidate_phone,
    visa_status, ats_score,
    match_keywords, missing_keywords,
    cv_snapshot,
    status, is_visible_to_hr,
    applied_at, viewed_at, updated_at
  ) VALUES (
    NULL, job_it, hr_uid,
    'Hrithik Bhakat', 'hrithik.bhakat@demo.cvpassport.com', '+91-98-555-5505',
    'Tourist', 56,
    '["AWS","Linux"]'::jsonb,
    '["Kubernetes","Terraform","CISSP","GitOps"]'::jsonb,
    '{
      "role": "Systems Administrator",
      "experience_years": 5,
      "location": "Bengaluru, India",
      "notice_period": "30 days",
      "experience": [
        {"title":"Systems Administrator","company":"Mid-size IT Services","period":"Mar 2021 — Present"}
      ],
      "skills": ["AWS basics","Linux","Bash","Windows Server"]
    }'::jsonb,
    'rejected', true,
    now() - interval '8 days', now() - interval '7 days', now() - interval '6 days'
  );

  -- 6. Faisal Rahman — Rejected, ATS 47, Hospitality Operations Manager
  INSERT INTO public.applications (
    candidate_id, job_id, hr_id,
    candidate_name, candidate_email, candidate_phone,
    visa_status, ats_score,
    match_keywords, missing_keywords,
    cv_snapshot,
    status, is_visible_to_hr,
    applied_at, viewed_at, updated_at
  ) VALUES (
    NULL, job_hosp, hr_uid,
    'Faisal Rahman', 'faisal.rahman@demo.cvpassport.com', '+971-56-555-6606',
    'Sponsored', 47,
    '["Opera PMS"]'::jsonb,
    '["Micros","GDS","DTCM","Halal Cert","Multilingual"]'::jsonb,
    '{
      "role": "Front Office Agent",
      "experience_years": 2,
      "location": "Sharjah, UAE",
      "notice_period": "Immediate",
      "experience": [
        {"title":"Front Office Agent","company":"Mid-tier Hotel Chain","period":"Aug 2023 — Present"}
      ],
      "skills": ["Opera PMS","Customer Service","English"]
    }'::jsonb,
    'rejected', true,
    now() - interval '10 days', now() - interval '9 days', now() - interval '8 days'
  );

  ---------------------------------------------------------------------------
  -- 5. Pipeline spread (Jul 2026) — 16 more candidates so the kanban and
  --    analytics demo like a busy pipeline. Each gets a real demo auth
  --    user (FK requirement), a compact cv_snapshot, and a stage-history
  --    chain in candidate_events with staggered timestamps.
  --
  --    Per candidate JSON: job (finance|it|hosp), status (current DB
  --    status), score, applied (days ago), visa, role, yrs, loc,
  --    events: [{t: status, d: days ago}, ...] in chronological order.
  ---------------------------------------------------------------------------
  DECLARE
    cand    jsonb;
    ev      jsonb;
    demo_id uuid;
    tgt_job uuid;
  BEGIN
    FOR cand IN SELECT * FROM jsonb_array_elements('[
      {"name":"Meera Nair","email":"meera.nair@demo.cvpassport.com","phone":"+971-50-555-7701","job":"finance","status":"hired","score":90,"applied":28,"visa":"Sponsored","role":"Finance Manager","yrs":8,"loc":"Dubai, UAE","events":[{"t":"shortlisted","d":26},{"t":"interviewing","d":21},{"t":"offered","d":16},{"t":"hired","d":12}]},
      {"name":"Omar Haddad","email":"omar.haddad@demo.cvpassport.com","phone":"+971-55-555-7702","job":"finance","status":"offered","score":85,"applied":22,"visa":"Self-sponsored","role":"Senior Accountant","yrs":6,"loc":"Dubai, UAE","events":[{"t":"shortlisted","d":20},{"t":"interviewing","d":15},{"t":"offered","d":8}]},
      {"name":"Sneha Patil","email":"sneha.patil@demo.cvpassport.com","phone":"+91-98-555-7703","job":"finance","status":"interviewing","score":81,"applied":14,"visa":"Tourist (eligibility)","role":"Financial Analyst","yrs":5,"loc":"Pune, India","events":[{"t":"shortlisted","d":12},{"t":"interviewing","d":7}]},
      {"name":"Vikram Menon","email":"vikram.menon@demo.cvpassport.com","phone":"+971-52-555-7704","job":"finance","status":"ready","score":77,"applied":10,"visa":"Sponsored","role":"Finance Analyst","yrs":4,"loc":"Abu Dhabi, UAE","events":[{"t":"ready","d":8}]},
      {"name":"Lina Qasem","email":"lina.qasem@demo.cvpassport.com","phone":"+971-50-555-7705","job":"finance","status":"submitted","score":74,"applied":2,"visa":"Self-sponsored","role":"Junior Accountant","yrs":3,"loc":"Sharjah, UAE","events":[]},
      {"name":"Arjun Das","email":"arjun.das@demo.cvpassport.com","phone":"+91-97-555-7706","job":"finance","status":"rejected","score":52,"applied":18,"visa":"Tourist","role":"Accounts Executive","yrs":2,"loc":"Kochi, India","events":[{"t":"shortlisted","d":16},{"t":"rejected","d":13}]},
      {"name":"Daniel Fernandes","email":"daniel.fernandes@demo.cvpassport.com","phone":"+971-56-555-7707","job":"it","status":"hired","score":89,"applied":25,"visa":"Sponsored","role":"Platform Engineer","yrs":9,"loc":"Dubai, UAE","events":[{"t":"shortlisted","d":23},{"t":"interviewing","d":18},{"t":"offered","d":13},{"t":"hired","d":9}]},
      {"name":"Noura Al-Suwaidi","email":"noura.alsuwaidi@demo.cvpassport.com","phone":"+971-50-555-7708","job":"it","status":"interviewing","score":83,"applied":12,"visa":"Self-sponsored","role":"SRE","yrs":7,"loc":"Abu Dhabi, UAE","events":[{"t":"shortlisted","d":10},{"t":"interviewing","d":6}]},
      {"name":"Karthik Raja","email":"karthik.raja@demo.cvpassport.com","phone":"+91-96-555-7709","job":"it","status":"ready","score":79,"applied":9,"visa":"Tourist (eligibility)","role":"DevOps Engineer","yrs":5,"loc":"Chennai, India","events":[{"t":"ready","d":7}]},
      {"name":"Zainab Mirza","email":"zainab.mirza@demo.cvpassport.com","phone":"+971-55-555-7710","job":"it","status":"viewed","score":71,"applied":4,"visa":"Sponsored","role":"Cloud Engineer","yrs":4,"loc":"Dubai, UAE","events":[]},
      {"name":"Rohit Kulkarni","email":"rohit.kulkarni@demo.cvpassport.com","phone":"+91-98-555-7711","job":"it","status":"rejected","score":48,"applied":20,"visa":"Tourist","role":"IT Support Engineer","yrs":3,"loc":"Mumbai, India","events":[{"t":"rejected","d":17}]},
      {"name":"Anjali Verma","email":"anjali.verma@demo.cvpassport.com","phone":"+971-52-555-7712","job":"hosp","status":"offered","score":86,"applied":24,"visa":"Sponsored","role":"F&B Manager","yrs":7,"loc":"Dubai, UAE","events":[{"t":"shortlisted","d":21},{"t":"interviewing","d":14},{"t":"offered","d":6}]},
      {"name":"Joseph Thomas","email":"joseph.thomas@demo.cvpassport.com","phone":"+971-56-555-7713","job":"hosp","status":"interviewing","score":80,"applied":16,"visa":"Self-sponsored","role":"Restaurant Manager","yrs":6,"loc":"Dubai, UAE","events":[{"t":"shortlisted","d":13},{"t":"interviewing","d":8}]},
      {"name":"Fatima Hassan","email":"fatima.hassan@demo.cvpassport.com","phone":"+971-50-555-7714","job":"hosp","status":"shortlisted","score":75,"applied":6,"visa":"Sponsored","role":"Duty Manager","yrs":5,"loc":"Dubai, UAE","events":[{"t":"shortlisted","d":5}]},
      {"name":"Ramesh Pillai","email":"ramesh.pillai@demo.cvpassport.com","phone":"+91-95-555-7715","job":"hosp","status":"submitted","score":69,"applied":1,"visa":"Tourist (eligibility)","role":"Guest Relations Lead","yrs":4,"loc":"Trivandrum, India","events":[]},
      {"name":"Grace Mathew","email":"grace.mathew@demo.cvpassport.com","phone":"+971-55-555-7716","job":"hosp","status":"rejected","score":58,"applied":26,"visa":"Self-sponsored","role":"Banquet Supervisor","yrs":4,"loc":"Dubai, UAE","events":[{"t":"shortlisted","d":24},{"t":"interviewing","d":19},{"t":"rejected","d":15}]}
    ]'::jsonb)
    LOOP
      -- Real auth user (FK target); bcrypt of a random uuid — nobody can
      -- ever log in with it. Cascade-deleted by the cleanup above.
      INSERT INTO auth.users (
        instance_id, id, aud, role, email, encrypted_password,
        email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
        created_at, updated_at, confirmation_token, recovery_token,
        email_change_token_new, email_change
      ) VALUES (
        '00000000-0000-0000-0000-000000000000', gen_random_uuid(),
        'authenticated', 'authenticated',
        cand->>'email', extensions.crypt(gen_random_uuid()::text, extensions.gen_salt('bf')),
        now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
        now(), now(), '', '', '', ''
      ) RETURNING id INTO demo_id;

      tgt_job := CASE cand->>'job'
        WHEN 'finance' THEN job_finance
        WHEN 'it' THEN job_it
        ELSE job_hosp
      END;

      INSERT INTO public.applications (
        candidate_id, job_id, hr_id,
        candidate_name, candidate_email, candidate_phone,
        visa_status, ats_score, match_keywords, missing_keywords,
        cv_snapshot, status, is_visible_to_hr,
        applied_at, viewed_at, updated_at
      ) VALUES (
        demo_id, tgt_job, hr_uid,
        cand->>'name', cand->>'email', cand->>'phone',
        cand->>'visa', (cand->>'score')::int, '[]'::jsonb, '[]'::jsonb,
        jsonb_build_object(
          'role', cand->>'role',
          'experience_years', (cand->>'yrs')::int,
          'location', cand->>'loc',
          'notice_period', '30 days',
          'skills', '[]'::jsonb
        ),
        cand->>'status', true,
        now() - ((cand->>'applied') || ' days')::interval,
        now() - ((cand->>'applied') || ' days')::interval + interval '6 hours',
        now() - (COALESCE(cand->'events'->-1->>'d', cand->>'applied') || ' days')::interval
      );

      FOR ev IN SELECT * FROM jsonb_array_elements(cand->'events')
      LOOP
        INSERT INTO public.candidate_events (
          candidate_id, job_id, hr_id, event_type, metadata, created_at
        ) VALUES (
          demo_id, tgt_job, hr_uid,
          ev->>'t',
          '{"source":"demo_seed"}'::jsonb,
          now() - ((ev->>'d') || ' days')::interval
        );
      END LOOP;
    END LOOP;
  END;

  RAISE NOTICE '✓ Demo seed applied: 3 jobs + 22 applications (16 with stage history) for HR uid %', hr_uid;
END
$seed$;
