-- ═══════════════════════════════════════════════════════════════
-- 012 — Post-a-Job wizard fix-up (visa, driving license, HR phone)
-- ═══════════════════════════════════════════════════════════════
-- Run in Supabase SQL Editor (project: evihcqpvoorsdmzjnvjz).
-- Idempotent — safe to re-run.
--
-- Adds the four new columns that the wizard fix-up commit (currency
-- toggle, visa selector, driving licence toggles, phone with country
-- code) needs. `currency` already exists from 001 — no schema work
-- there, just wiring.
--
-- Wizard field → DB column mapping (additions only):
--   currency               → currency (existing, default 'AED')
--   visaStatus (array)     → visa_status (NEW jsonb)
--   uaeDrivingLicense      → uae_driving_license (NEW boolean)
--   originDrivingLicense   → origin_driving_license (NEW boolean)
--   hrPhoneCountryCode + hrPhone (combined) → hr_phone (NEW text, E.164)

-- ─── New columns ───────────────────────────────────────────────

ALTER TABLE jobs ADD COLUMN IF NOT EXISTS visa_status jsonb DEFAULT '[]';
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS uae_driving_license boolean DEFAULT false;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS origin_driving_license boolean DEFAULT false;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS hr_phone text;
