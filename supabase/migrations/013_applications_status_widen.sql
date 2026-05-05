-- ─────────────────────────────────────────────────────────────
-- 013 — Applications status CHECK widening
-- ─────────────────────────────────────────────────────────────
-- Original 001 schema only accepted submitted/viewed/shortlisted/
-- interviewing/offered/hired/rejected. The new apply flow writes
-- 'new' on first submit (visible to the candidate as "in pipeline",
-- visible to HR as a fresh shortlist card). The HR pipeline at
-- /hr/jobs/:id also uses 'ready' (post-shortlist parking) and
-- 'interviewed' (matches the Figma tab label one-to-one).
--
-- 'interviewing' is preserved alongside 'interviewed' for any
-- legacy rows that may exist in production.
-- ─────────────────────────────────────────────────────────────

ALTER TABLE applications DROP CONSTRAINT IF EXISTS applications_status_check;
ALTER TABLE applications ADD CONSTRAINT applications_status_check
  CHECK (status IN (
    'new',
    'submitted',
    'viewed',
    'shortlisted',
    'ready',
    'interviewed',
    'interviewing',
    'offered',
    'hired',
    'rejected'
  ));
