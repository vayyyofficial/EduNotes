-- ============================================================================
-- EduNotes — Migration 004: Scan History RLS Fix & Supplemental Policies
-- Run AFTER migration 003 in Supabase Dashboard → SQL Editor
-- ============================================================================

-- scan_history: tambahkan policy UPDATE dan DELETE yang terlewat di migration 003
DROP POLICY IF EXISTS "Admins can update scan history" ON public.scan_history;
CREATE POLICY "Admins can update scan history" ON public.scan_history
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete scan history" ON public.scan_history;
CREATE POLICY "Admins can delete scan history" ON public.scan_history
  FOR DELETE TO authenticated USING (public.is_admin());

-- Izinkan anon (pengunjung publik) membaca scan_history tanpa login
DROP POLICY IF EXISTS "Public can read scan history" ON public.scan_history;
CREATE POLICY "Public can read scan history" ON public.scan_history
  FOR SELECT TO anon, authenticated USING (true);

-- Pastikan INSERT scan_history bisa dilakukan oleh user terautentikasi (bukan hanya admin)
-- Ini diperlukan karena scan bisa dilakukan oleh siapapun yang login,
-- bukan hanya administrator kurikulum.
DROP POLICY IF EXISTS "Admins can insert scan history" ON public.scan_history;
CREATE POLICY "Authenticated users can insert scan history" ON public.scan_history
  FOR INSERT TO authenticated WITH CHECK (true);
