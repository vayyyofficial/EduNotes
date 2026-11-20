-- ============================================================================
-- EduNotes — Migration 002: AI Scan Catatan & Summary Version History
-- Preserves all existing tables and records.
-- Run this script in your Supabase Dashboard -> SQL Editor
-- ============================================================================

-- 1. Summary Version History Table
CREATE TABLE IF NOT EXISTS public.summary_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  summary_id UUID NOT NULL REFERENCES public.summaries(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  category TEXT NOT NULL DEFAULT 'Umum',
  content JSONB NOT NULL DEFAULT '[]'::jsonb,
  tags TEXT[] NOT NULL DEFAULT '{}',
  source_reference TEXT DEFAULT '',
  change_summary TEXT DEFAULT '',
  mode TEXT NOT NULL DEFAULT 'manual' CHECK (mode IN ('manual', 'create_new', 'add_to_existing', 'improve_existing', 'restore')),
  source_images TEXT[] NOT NULL DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (summary_id, version_number)
);

CREATE INDEX IF NOT EXISTS summary_versions_summary_id_idx
  ON public.summary_versions (summary_id, version_number DESC);

-- 2. AI Scan Jobs Table
CREATE TABLE IF NOT EXISTS public.ai_scan_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
  target_summary_id UUID REFERENCES public.summaries(id) ON DELETE SET NULL,
  mode TEXT NOT NULL CHECK (mode IN ('create_new', 'add_to_existing', 'improve_existing')),
  status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'approved', 'rejected', 'failed')),
  source_images TEXT[] NOT NULL DEFAULT '{}',
  extracted_text TEXT DEFAULT '',
  ai_result JSONB DEFAULT NULL,
  error_message TEXT DEFAULT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ai_scan_jobs_created_at_idx
  ON public.ai_scan_jobs (created_at DESC);

DROP TRIGGER IF EXISTS trg_ai_scan_jobs_updated_at ON public.ai_scan_jobs;
CREATE TRIGGER trg_ai_scan_jobs_updated_at
  BEFORE UPDATE ON public.ai_scan_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- 3. Row Level Security (Admin Only)
ALTER TABLE public.summary_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_scan_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read summary versions" ON public.summary_versions;
CREATE POLICY "Admins can read summary versions"
  ON public.summary_versions
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can insert summary versions" ON public.summary_versions;
CREATE POLICY "Admins can insert summary versions"
  ON public.summary_versions
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can read ai scan jobs" ON public.ai_scan_jobs;
CREATE POLICY "Admins can read ai scan jobs"
  ON public.ai_scan_jobs
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can insert ai scan jobs" ON public.ai_scan_jobs;
CREATE POLICY "Admins can insert ai scan jobs"
  ON public.ai_scan_jobs
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can update ai scan jobs" ON public.ai_scan_jobs;
CREATE POLICY "Admins can update ai scan jobs"
  ON public.ai_scan_jobs
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
