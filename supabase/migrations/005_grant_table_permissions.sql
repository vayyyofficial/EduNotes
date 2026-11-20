-- ============================================================================
-- EduNotes — Migration 005: Grant Table Privileges to anon & authenticated
-- Jalankan skrip ini di: Supabase Dashboard -> SQL Editor -> New Query -> Run
-- ============================================================================

-- Penjelasan Teknis:
-- Di PostgreSQL, Row Level Security (RLS) dan izin hak akses tabel (GRANT) adalah dua lapisan keamanan:
-- 1. GRANT memberikan izin dasar kepada role database (anon dan authenticated) untuk menyentuh tabel.
-- 2. RLS (yang sudah AKTIF pada semua tabel) menyaring dan mengontrol baris data mana yang boleh
--    dibaca atau dimodifikasi sesuai kebijakan policy yang ada.
-- Tanpa GRANT SELECT, PostgreSQL menolak query dengan kode error 42501 (permission denied),
-- yang oleh PostgREST dikembalikan sebagai HTTP 401 Unauthorized ke browser.

-- 1. Berikan izin penggunaan skema public
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- 2. Berikan izin SELECT kepada publik (anon) dan authenticated
-- RLS tetap aktif dan membatasi pembacaan buku/bab/subbab/versi sesuai policy
GRANT SELECT ON public.books TO anon, authenticated;
GRANT SELECT ON public.chapters TO anon, authenticated;
GRANT SELECT ON public.subchapters TO anon, authenticated;
GRANT SELECT ON public.subchapter_versions TO anon, authenticated;
GRANT SELECT ON public.book_references TO anon, authenticated;
GRANT SELECT ON public.scan_history TO anon, authenticated;

-- 3. Berikan izin operasi tulis hanya kepada user terautentikasi (authenticated)
-- RLS tetap aktif membatasi hanya admin yang boleh INSERT/UPDATE/DELETE (via public.is_admin())
GRANT INSERT, UPDATE, DELETE ON public.books TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.chapters TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.subchapters TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.subchapter_versions TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.book_references TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.scan_history TO authenticated;

-- 4. Hak akses tabel admin_users (RLS membatasi user hanya bisa melihat status dirinya sendiri)
GRANT SELECT ON public.admin_users TO authenticated;

-- 5. Berikan izin eksekusi fungsi is_admin
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated;

-- 6. Berikan izin untuk sequence
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- 7. Terapkan default privileges agar tabel masa depan otomatis mewarisi izin yang benar
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO anon, authenticated;
