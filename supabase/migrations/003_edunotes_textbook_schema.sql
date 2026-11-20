-- ============================================================================
-- EduNotes — Migration 003: Cloud Textbook Curriculum & Multi-User Architecture
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

-- Helper function to check admin rights:
-- If admin_users has no registered admins yet, any authenticated user can act as initial admin.
-- Once registered, only user_ids present in admin_users are granted admin permissions.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN NOT EXISTS (SELECT 1 FROM public.admin_users) THEN
      auth.role() = 'authenticated'
    ELSE
      EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid())
  END;
$$;

-- 3. Books Table (Mata Pelajaran)
CREATE TABLE IF NOT EXISTS public.books (
  id TEXT PRIMARY KEY,
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

CREATE INDEX IF NOT EXISTS books_slug_idx ON public.books (slug);
CREATE INDEX IF NOT EXISTS books_display_order_idx ON public.books (display_order ASC);

-- 4. Chapters Table (BAB Pelajaran)
CREATE TABLE IF NOT EXISTS public.chapters (
  id TEXT PRIMARY KEY,
  book_id TEXT NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  number INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS chapters_book_id_idx ON public.chapters (book_id);
CREATE INDEX IF NOT EXISTS chapters_number_idx ON public.chapters (book_id, number ASC);

-- 5. Subchapters Table (Subbab Materi Pelajaran)
CREATE TABLE IF NOT EXISTS public.subchapters (
  id TEXT PRIMARY KEY,
  chapter_id TEXT NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
  book_id TEXT NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  content JSONB NOT NULL DEFAULT '[]'::jsonb,
  tags TEXT[] NOT NULL DEFAULT '{}',
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS subchapters_chapter_id_idx ON public.subchapters (chapter_id);
CREATE INDEX IF NOT EXISTS subchapters_book_id_idx ON public.subchapters (book_id);

-- 6. Subchapter Versions Table (Riwayat Versi Subbab)
CREATE TABLE IF NOT EXISTS public.subchapter_versions (
  id TEXT PRIMARY KEY,
  subchapter_id TEXT NOT NULL REFERENCES public.subchapters(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  content JSONB NOT NULL DEFAULT '[]'::jsonb,
  change_summary TEXT DEFAULT '',
  source_mode TEXT NOT NULL DEFAULT 'manual',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS subchapter_versions_subchapter_id_idx ON public.subchapter_versions (subchapter_id, version_number DESC);

-- 7. Book References Table (Daftar Pustaka & Sumber)
CREATE TABLE IF NOT EXISTS public.book_references (
  id TEXT PRIMARY KEY,
  book_id TEXT NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  author TEXT DEFAULT '',
  year TEXT DEFAULT '',
  publisher_or_url TEXT DEFAULT '',
  linked_chapter_id TEXT DEFAULT NULL,
  linked_subchapter_id TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS book_references_book_id_idx ON public.book_references (book_id);

-- 8. Scan History Table (Riwayat Analisis AI)
CREATE TABLE IF NOT EXISTS public.scan_history (
  id TEXT PRIMARY KEY,
  book_name TEXT NOT NULL,
  photo_count INTEGER NOT NULL DEFAULT 0,
  summary TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS scan_history_created_at_idx ON public.scan_history (created_at DESC);

-- 9. Row Level Security (RLS)
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subchapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subchapter_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.book_references ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scan_history ENABLE ROW LEVEL SECURITY;

-- 9a. Admin Users Policies
DROP POLICY IF EXISTS "Users can check own admin status" ON public.admin_users;
CREATE POLICY "Users can check own admin status" ON public.admin_users
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- 9b. Books Policies
DROP POLICY IF EXISTS "Public can read published books" ON public.books;
CREATE POLICY "Public can read published books" ON public.books
  FOR SELECT TO anon, authenticated USING (is_published = true OR public.is_admin());

DROP POLICY IF EXISTS "Admins can insert books" ON public.books;
CREATE POLICY "Admins can insert books" ON public.books
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can update books" ON public.books;
CREATE POLICY "Admins can update books" ON public.books
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete books" ON public.books;
CREATE POLICY "Admins can delete books" ON public.books
  FOR DELETE TO authenticated USING (public.is_admin());

-- 9c. Chapters Policies
DROP POLICY IF EXISTS "Public can read chapters" ON public.chapters;
CREATE POLICY "Public can read chapters" ON public.chapters
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Admins can insert chapters" ON public.chapters;
CREATE POLICY "Admins can insert chapters" ON public.chapters
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can update chapters" ON public.chapters;
CREATE POLICY "Admins can update chapters" ON public.chapters
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete chapters" ON public.chapters;
CREATE POLICY "Admins can delete chapters" ON public.chapters
  FOR DELETE TO authenticated USING (public.is_admin());

-- 9d. Subchapters Policies
DROP POLICY IF EXISTS "Public can read subchapters" ON public.subchapters;
CREATE POLICY "Public can read subchapters" ON public.subchapters
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Admins can insert subchapters" ON public.subchapters;
CREATE POLICY "Admins can insert subchapters" ON public.subchapters
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can update subchapters" ON public.subchapters;
CREATE POLICY "Admins can update subchapters" ON public.subchapters
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete subchapters" ON public.subchapters;
CREATE POLICY "Admins can delete subchapters" ON public.subchapters
  FOR DELETE TO authenticated USING (public.is_admin());

-- 9e. Subchapter Versions Policies
DROP POLICY IF EXISTS "Public can read subchapter versions" ON public.subchapter_versions;
CREATE POLICY "Public can read subchapter versions" ON public.subchapter_versions
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Admins can insert subchapter versions" ON public.subchapter_versions;
CREATE POLICY "Admins can insert subchapter versions" ON public.subchapter_versions
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete subchapter versions" ON public.subchapter_versions;
CREATE POLICY "Admins can delete subchapter versions" ON public.subchapter_versions
  FOR DELETE TO authenticated USING (public.is_admin());

-- 9f. Book References Policies
DROP POLICY IF EXISTS "Public can read book references" ON public.book_references;
CREATE POLICY "Public can read book references" ON public.book_references
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Admins can insert book references" ON public.book_references;
CREATE POLICY "Admins can insert book references" ON public.book_references
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can update book references" ON public.book_references;
CREATE POLICY "Admins can update book references" ON public.book_references
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete book references" ON public.book_references;
CREATE POLICY "Admins can delete book references" ON public.book_references
  FOR DELETE TO authenticated USING (public.is_admin());

-- 9g. Scan History Policies
DROP POLICY IF EXISTS "Public can read scan history" ON public.scan_history;
CREATE POLICY "Public can read scan history" ON public.scan_history
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Admins can insert scan history" ON public.scan_history;
CREATE POLICY "Admins can insert scan history" ON public.scan_history
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());

-- 10. Table Privileges (GRANT)
-- PostgreSQL membutuhkan izin GRANT agar role anon dan authenticated dapat menyentuh tabel.
-- RLS (Row Level Security) tetap aktif dan mengontrol baris mana yang dapat dibaca/ditulis.
GRANT USAGE ON SCHEMA public TO anon, authenticated;

GRANT SELECT ON public.books TO anon, authenticated;
GRANT SELECT ON public.chapters TO anon, authenticated;
GRANT SELECT ON public.subchapters TO anon, authenticated;
GRANT SELECT ON public.subchapter_versions TO anon, authenticated;
GRANT SELECT ON public.book_references TO anon, authenticated;
GRANT SELECT ON public.scan_history TO anon, authenticated;

GRANT INSERT, UPDATE, DELETE ON public.books TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.chapters TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.subchapters TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.subchapter_versions TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.book_references TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.scan_history TO authenticated;

GRANT SELECT ON public.admin_users TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO anon, authenticated;
