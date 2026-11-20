-- ============================================================================
-- EduNotes — Supabase Database Schema, RLS Policies & Storage Setup
-- Run this script in your Supabase Dashboard -> SQL Editor
-- ============================================================================

-- 1. Extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Admin Users Table (Explicit RBAC: authenticated != admin)
CREATE TABLE IF NOT EXISTS public.admin_users (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Helper function to check if the current authenticated user is an admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_users
    WHERE user_id = auth.uid()
  );
$$;

-- 3. Subjects Table
CREATE TABLE IF NOT EXISTS public.subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT DEFAULT '',
  icon TEXT DEFAULT 'BookOpen',
  color TEXT DEFAULT '#FACC15',
  display_order INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Prevent duplicate subject names (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS subjects_name_lower_unique_idx
  ON public.subjects (LOWER(TRIM(name)));

CREATE INDEX IF NOT EXISTS subjects_display_order_idx
  ON public.subjects (display_order ASC, name ASC);

-- 4. Summaries Table
CREATE TABLE IF NOT EXISTS public.summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT DEFAULT '',
  category TEXT NOT NULL DEFAULT 'Umum',
  content JSONB NOT NULL DEFAULT '[]'::jsonb,
  cover_image TEXT DEFAULT NULL,
  tags TEXT[] NOT NULL DEFAULT '{}',
  source_reference TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS summaries_subject_id_idx ON public.summaries (subject_id);
CREATE INDEX IF NOT EXISTS summaries_status_idx ON public.summaries (status);
CREATE INDEX IF NOT EXISTS summaries_created_at_idx ON public.summaries (created_at DESC);
CREATE INDEX IF NOT EXISTS summaries_tags_gin_idx ON public.summaries USING GIN (tags);

-- 5. Updated_at Trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_subjects_updated_at ON public.subjects;
CREATE TRIGGER trg_subjects_updated_at
  BEFORE UPDATE ON public.subjects
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_summaries_updated_at ON public.summaries;
CREATE TRIGGER trg_summaries_updated_at
  BEFORE UPDATE ON public.summaries
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- 6. Row Level Security (RLS)
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.summaries ENABLE ROW LEVEL SECURITY;

-- admin_users policies: users can only read their own admin record
DROP POLICY IF EXISTS "Users can check own admin status" ON public.admin_users;
CREATE POLICY "Users can check own admin status"
  ON public.admin_users
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- subjects policies
DROP POLICY IF EXISTS "Public can read published subjects" ON public.subjects;
CREATE POLICY "Public can read published subjects"
  ON public.subjects
  FOR SELECT
  TO anon, authenticated
  USING (is_published = true OR public.is_admin());

DROP POLICY IF EXISTS "Admins can insert subjects" ON public.subjects;
CREATE POLICY "Admins can insert subjects"
  ON public.subjects
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can update subjects" ON public.subjects;
CREATE POLICY "Admins can update subjects"
  ON public.subjects
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete subjects" ON public.subjects;
CREATE POLICY "Admins can delete subjects"
  ON public.subjects
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- summaries policies
DROP POLICY IF EXISTS "Public can read published summaries" ON public.summaries;
CREATE POLICY "Public can read published summaries"
  ON public.summaries
  FOR SELECT
  TO anon, authenticated
  USING (
    (
      status = 'published'
      AND EXISTS (
        SELECT 1 FROM public.subjects s
        WHERE s.id = summaries.subject_id AND s.is_published = true
      )
    )
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Admins can insert summaries" ON public.summaries;
CREATE POLICY "Admins can insert summaries"
  ON public.summaries
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can update summaries" ON public.summaries;
CREATE POLICY "Admins can update summaries"
  ON public.summaries
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete summaries" ON public.summaries;
CREATE POLICY "Admins can delete summaries"
  ON public.summaries
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- 7. Supabase Storage Bucket for Cover Images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'edunotes-media',
  'edunotes-media',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public can view edunotes media" ON storage.objects;
CREATE POLICY "Public can view edunotes media"
  ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'edunotes-media');

DROP POLICY IF EXISTS "Admins can upload edunotes media" ON storage.objects;
CREATE POLICY "Admins can upload edunotes media"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'edunotes-media' AND public.is_admin());

DROP POLICY IF EXISTS "Admins can update edunotes media" ON storage.objects;
CREATE POLICY "Admins can update edunotes media"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'edunotes-media' AND public.is_admin());

DROP POLICY IF EXISTS "Admins can delete edunotes media" ON storage.objects;
CREATE POLICY "Admins can delete edunotes media"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'edunotes-media' AND public.is_admin());

-- ============================================================================
-- NEXT STEP: Grant admin access to your existing Supabase Auth user
-- Replace the email below with your administrator email from Auth -> Users:
--
-- INSERT INTO public.admin_users (user_id, email)
-- SELECT id, email FROM auth.users WHERE email = 'admin@example.com'
-- ON CONFLICT (user_id) DO NOTHING;
-- ============================================================================
