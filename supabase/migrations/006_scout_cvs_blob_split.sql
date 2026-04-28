-- 006_scout_cvs_blob_split.sql
--
-- Splits scout_cvs.tailored_cv_url into two columns:
--   - tailored_cv_blob  — serialized cv_data JSON (what /api/scout-tailor and
--                         /api/scout-universal write today, while PDF storage
--                         is not yet wired)
--   - tailored_cv_url   — eventual public/signed URL for the rendered PDF in
--                         Supabase Storage; null until the render pipeline lands
--
-- Apply in the Supabase SQL Editor (Dashboard → SQL Editor → paste → Run).

alter table scout_cvs rename column tailored_cv_url to tailored_cv_blob;
alter table scout_cvs add column tailored_cv_url text;
