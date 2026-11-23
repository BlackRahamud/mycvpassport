-- Career Services: candidate requests and private supporting CV files.
-- Apply this migration before deploying the Career Services page.
CREATE TABLE IF NOT EXISTS public.career_service_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL CHECK (char_length(full_name) BETWEEN 2 AND 120),
  email text NOT NULL CHECK (char_length(email) <= 254),
  phone text NOT NULL CHECK (char_length(phone) BETWEEN 7 AND 30),
  market text NOT NULL CHECK (market IN ('India', 'UAE / Gulf')),
  service_type text NOT NULL DEFAULT 'cv_creation' CHECK (service_type IN ('cv_creation', 'cv_ats', 'career_consultation', 'gulf_guidance')),
  delivery_speed text NOT NULL DEFAULT 'standard' CHECK (delivery_speed IN ('standard', 'express')),
  price_minor integer NOT NULL DEFAULT 19900 CHECK (price_minor IN (19900, 29900)),
  currency text NOT NULL DEFAULT 'INR' CHECK (currency = 'INR'),
  payment_status text NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  razorpay_order_id text UNIQUE,
  razorpay_payment_id text UNIQUE,
  paid_at timestamptz,
  delivered_file_path text,
  target_role text NOT NULL CHECK (char_length(target_role) BETWEEN 2 AND 120),
  experience text NOT NULL CHECK (char_length(experience) <= 80),
  notes text NOT NULL DEFAULT '' CHECK (char_length(notes) <= 2000),
  cv_file_path text,
  status text NOT NULL DEFAULT 'awaiting_payment' CHECK (status IN ('new', 'awaiting_payment', 'paid', 'in_progress', 'delivered', 'cancelled')),
  admin_notes text NOT NULL DEFAULT '' CHECK (char_length(admin_notes) <= 2000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS career_service_orders_created_at_idx
  ON public.career_service_orders (created_at DESC);
CREATE INDEX IF NOT EXISTS career_service_orders_status_idx
  ON public.career_service_orders (status, created_at DESC);
CREATE INDEX IF NOT EXISTS career_service_orders_user_id_idx
  ON public.career_service_orders (user_id, created_at DESC);

ALTER TABLE public.career_service_orders ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT ON public.career_service_orders TO authenticated;
GRANT ALL ON public.career_service_orders TO service_role;

DROP POLICY IF EXISTS "Candidates create own career service requests" ON public.career_service_orders;
CREATE POLICY "Candidates create own career service requests"
  ON public.career_service_orders FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Candidates read own career service requests" ON public.career_service_orders;
CREATE POLICY "Candidates read own career service requests"
  ON public.career_service_orders FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- The founder/admin API uses the Supabase service role after verifying the
-- owner's JWT. No client-side admin UPDATE/DELETE policy is created.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'career-service-files',
  'career-service-files',
  false,
  8388608,
  ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 8388608,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Candidates upload own career service files" ON storage.objects;
CREATE POLICY "Candidates upload own career service files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'career-service-files'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Candidates read own career service files" ON storage.objects;
CREATE POLICY "Candidates read own career service files"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'career-service-files'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Candidates delete own career service files" ON storage.objects;
CREATE POLICY "Candidates delete own career service files"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'career-service-files'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
