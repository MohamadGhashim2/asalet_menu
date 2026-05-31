-- Add stable restaurant table URLs and admin-managed table QR codes.
--
-- IMPORTANT:
-- Replace 'admin@admin.com' below with the real admin email before running.

CREATE TABLE IF NOT EXISTS public.restaurant_tables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  code text NOT NULL UNIQUE,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.restaurant_tables ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read active restaurant tables" ON public.restaurant_tables;
DROP POLICY IF EXISTS "Admin can read restaurant tables" ON public.restaurant_tables;
DROP POLICY IF EXISTS "Admin can insert restaurant tables" ON public.restaurant_tables;
DROP POLICY IF EXISTS "Admin can update restaurant tables" ON public.restaurant_tables;
DROP POLICY IF EXISTS "Admin can delete restaurant tables" ON public.restaurant_tables;

CREATE POLICY "Public can read active restaurant tables"
ON public.restaurant_tables
FOR SELECT
TO anon
USING (is_active = true);

CREATE POLICY "Admin can read restaurant tables"
ON public.restaurant_tables
FOR SELECT
TO authenticated
USING (auth.jwt()->>'email' = 'admin@admin.com');

CREATE POLICY "Admin can insert restaurant tables"
ON public.restaurant_tables
FOR INSERT
TO authenticated
WITH CHECK (auth.jwt()->>'email' = 'admin@admin.com');

CREATE POLICY "Admin can update restaurant tables"
ON public.restaurant_tables
FOR UPDATE
TO authenticated
USING (auth.jwt()->>'email' = 'admin@admin.com')
WITH CHECK (auth.jwt()->>'email' = 'admin@admin.com');

CREATE POLICY "Admin can delete restaurant tables"
ON public.restaurant_tables
FOR DELETE
TO authenticated
USING (auth.jwt()->>'email' = 'admin@admin.com');

