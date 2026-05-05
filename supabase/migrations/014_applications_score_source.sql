-- ─────────────────────────────────────────────────────────────
-- 014 — applications.score_source marker
-- ─────────────────────────────────────────────────────────────
-- Phase 1 of the scan rebuild will replace today's keyword-overlap
-- stopgap with a full parser + Claude-Sonnet scorer. Tagging every
-- row written today with score_source='stopgap_keyword' lets Phase
-- 1 retro-rescan only the rows it owns and leaves Phase-1-written
-- rows ('phase_1_full') untouched. NULL means legacy — never
-- scored on either pipeline.
-- ─────────────────────────────────────────────────────────────

ALTER TABLE applications ADD COLUMN IF NOT EXISTS score_source text;
COMMENT ON COLUMN applications.score_source IS
  'Phase 1 ATS rebuild marker. stopgap_keyword = pre-Phase-1 keyword overlap; phase_1_full = real parser+scorer; null = legacy (no scoring run).';

-- Partial index — keeps the bloat off legacy rows. Used by the
-- Phase 1 retro-rescan job to find every stopgap row in O(rows-by-source).
CREATE INDEX IF NOT EXISTS applications_score_source_idx
  ON applications (score_source)
  WHERE score_source IS NOT NULL;
