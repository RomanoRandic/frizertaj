-- Aesthete Hairdressing — Supabase schema
-- Run this in Supabase Dashboard → SQL Editor

-- Bookings table
CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  service TEXT NOT NULL,
  service_label TEXT,
  booking_date DATE NOT NULL,
  booking_time TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bookings_date ON public.bookings (booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_phone ON public.bookings (phone);
CREATE INDEX IF NOT EXISTS idx_bookings_email ON public.bookings (email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings (status);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON public.bookings (created_at DESC);

-- Prevent double-booking same slot
CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_unique_slot
  ON public.bookings (booking_date, booking_time)
  WHERE status NOT IN ('cancelled');

-- Row Level Security
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if re-running
DROP POLICY IF EXISTS "Public can insert bookings" ON public.bookings;
DROP POLICY IF EXISTS "Authenticated can select bookings" ON public.bookings;
DROP POLICY IF EXISTS "Authenticated can update bookings" ON public.bookings;
DROP POLICY IF EXISTS "Authenticated can delete bookings" ON public.bookings;
DROP POLICY IF EXISTS "Authenticated can insert bookings" ON public.bookings;

-- Anonymous visitors (public site) can create bookings only
CREATE POLICY "Public can insert bookings"
  ON public.bookings
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Authenticated admin users have full access
CREATE POLICY "Authenticated can select bookings"
  ON public.bookings
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated can insert bookings"
  ON public.bookings
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated can update bookings"
  ON public.bookings
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated can delete bookings"
  ON public.bookings
  FOR DELETE
  TO authenticated
  USING (true);

-- Optional: view for client analytics (admin reads via authenticated session)
CREATE OR REPLACE VIEW public.client_stats AS
SELECT
  COALESCE(NULLIF(TRIM(email), ''), phone) AS client_key,
  client_name,
  phone,
  email,
  COUNT(*) AS total_bookings,
  MIN(created_at) AS first_visit,
  MAX(created_at) AS last_visit
FROM public.bookings
WHERE status != 'cancelled'
GROUP BY client_name, phone, email;

GRANT SELECT ON public.client_stats TO authenticated;
