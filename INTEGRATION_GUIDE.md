# Panduan Integrasi & Deployment Lengkap — EduNotes

> Panduan ini menjelaskan seluruh langkah yang diperlukan untuk menghubungkan EduNotes dengan Google Gemini AI dan Supabase Cloud, lalu men-deploy ke Netlify. Ikuti urutan langkah sesuai bagian di bawah.

---

## Bagian 1 — File yang Harus Anda Isi

Hanya ada **satu file** yang perlu Anda buat dan isi untuk pengembangan lokal:

**Nama file:** `.env` (di folder root project, sejajar dengan `package.json`)

**Isi file:**
```env
GEMINI_API_KEY=AIzaSy...
VITE_SUPABASE_URL=https://xxxxxxxxxxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Cara membuat file ini di Windows:**
```powershell
# Di PowerShell, dari folder root project:
Copy-Item .env.example .env
# Kemudian buka .env dengan editor teks dan isi nilainya.
```

> **PENTING — Keamanan:**
> - `.env` sudah terdaftar di `.gitignore` — file ini **TIDAK AKAN** terunggah ke GitHub secara otomatis.
> - `.env.example` aman diunggah ke GitHub (hanya berisi nama variabel, tanpa nilai).
> - `GEMINI_API_KEY` hanya dibaca server-side (Netlify Functions / Express `server.ts`). Frontend tidak pernah menerimanya.
> - `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY` aman di frontend karena seluruh tabel Supabase dilindungi Row Level Security (RLS).

---

## Bagian 2 — Cara Mendapatkan Setiap API Key & URL

### 2.1 Google Gemini API Key

1. Buka: **https://aistudio.google.com/app/apikey**
2. Login menggunakan akun Google Anda.
3. Klik **Create API key**.
4. Pilih project Google Cloud yang ada (atau buat baru).
5. Salin API key yang dihasilkan (diawali dengan `AIza...`).
6. Masukkan ke `GEMINI_API_KEY` di file `.env`.

> **Model yang digunakan:** `gemini-3.8-flash` (dengan fallback `gemini-3.5-flash`) — mendukung input teks, gambar (OCR tulisan tangan), dan PDF secara native.

### 2.2 Supabase URL & Anon Key

1. Buka: **https://supabase.com/dashboard**
2. Login dan buat project baru (jika belum ada), atau buka project yang sudah ada.
3. Di sidebar kiri, klik **Project Settings → API**.
4. Salin:
   - **Project URL** → masukkan ke `VITE_SUPABASE_URL`
   - **anon public** (di bagian "Project API keys") → masukkan ke `VITE_SUPABASE_ANON_KEY`

---

## Bagian 3 — Cara Memasukkan Konfigurasi Lokal

Setelah file `.env` dibuat dan terisi:

```powershell
# 1. Install dependencies (jika belum)
npm install

# 2. Jalankan aplikasi (Express server + Vite HMR di port 3000)
npm run dev
```

Buka browser ke: **http://localhost:3000**

> **Catatan Dev Server:** Saat `npm run dev`, Express `server.ts` menjalankan Vite sebagai middleware. Endpoint `/api/ai/analyze` dan `/api/ai/status` ditangani oleh Express yang membaca `GEMINI_API_KEY` dari `.env` secara server-side. Vite tidak perlu proxy tambahan karena keduanya berjalan dalam satu server port 3000.

---

## Bagian 4 — Cara Menjalankan SQL Migration di Supabase

Jalankan SQL berikut secara berurutan di **Supabase Dashboard → SQL Editor → New query**:

### Langkah 4.1 — Migration Utama (Wajib — Jalankan Pertama)

Buka file: `supabase/migrations/003_edunotes_textbook_schema.sql`

Salin seluruh isinya → tempelkan ke SQL Editor Supabase → klik **Run**.

Migration ini membuat:
| Tabel | Fungsi |
|---|---|
| `books` | Data mata pelajaran (Fisika, Biologi, Sejarah, dll) |
| `chapters` | BAB di dalam setiap buku |
| `subchapters` | Subbab materi di dalam setiap BAB |
| `subchapter_versions` | Riwayat versi setiap subbab (mendukung rollback) |
| `book_references` | Daftar pustaka dan referensi per buku |
| `scan_history` | Log riwayat analisis AI per sesi scan |
| `admin_users` | Daftar user yang memiliki hak akses administrator |

Fungsi dan policy yang dibuat:
- `is_admin()` — fungsi PostgreSQL yang mengecek apakah user terautentikasi adalah admin
- RLS policies — publik bisa **membaca**, hanya admin yang bisa **menulis/mengubah/menghapus**

### Langkah 4.2 — Perbaikan RLS Scan History (Wajib — Jalankan Kedua)

Buka file: `supabase/migrations/004_scan_history_rls_fix.sql`

Salin seluruh isinya → tempelkan ke SQL Editor Supabase → klik **Run**.

> Migration ini memperbaiki policy RLS `scan_history` agar INSERT bisa dilakukan oleh user terautentikasi (bukan hanya admin), karena fitur scan bisa digunakan oleh siapapun yang login.

### Langkah 4.3 — Hak Akses Tabel / GRANT (Wajib — Memperbaiki Error 401 / 42501)

Buka file: `supabase/migrations/005_grant_table_permissions.sql`

Salin seluruh isinya → tempelkan ke SQL Editor Supabase → klik **Run**.

> **PENTING (Mengapa ini wajib?):**
> Di PostgreSQL, Row Level Security (RLS) dan hak akses tabel (`GRANT`) adalah dua lapisan terpisah:
> 1. `GRANT` memberikan izin dasar kepada role `anon` dan `authenticated` untuk menyentuh tabel.
> 2. `RLS` menyaring baris mana yang boleh dibaca atau diubah.
> Jika `GRANT SELECT` belum dijalankan, PostgreSQL menolak query dengan kode `42501 (permission denied for table ...)` yang diterjemahkan oleh PostgREST menjadi `HTTP 401 Unauthorized`. Menjalankan migrasi ini menyelesaikan error 401 secara tuntas tanpa melonggarkan RLS.

---

## Bagian 5 — Cara Membuat Akun Admin

### Opsi A: Tanpa SQL (Paling Mudah)

Jika `admin_users` masih kosong, **pengguna terautentikasi pertama** otomatis bertindak sebagai admin awal.

Langkah:
1. Buka Supabase Dashboard → **Authentication → Users**.
2. Klik **Add user → Create user**.
3. Masukkan email dan password.
4. Buka EduNotes → Dashboard → klik **Masuk sebagai Admin**.
5. Login dengan email dan password yang baru dibuat.
6. Anda langsung dapat mengelola buku dan materi.

### Opsi B: Dengan SQL (Eksplisit)

Setelah membuat user di Authentication, jalankan SQL berikut di SQL Editor Supabase:

```sql
-- Ganti 'email_anda@example.com' dengan email admin yang sudah terdaftar
INSERT INTO public.admin_users (user_id, email)
SELECT id, email FROM auth.users WHERE email = 'email_anda@example.com'
ON CONFLICT (user_id) DO NOTHING;
```

---

## Bagian 6 — Cara Menguji Seluruh Integrasi Secara Lokal

Pastikan `.env` sudah terisi, lalu jalankan pengujian bertahap:

### 6.1 Build & TypeScript Check
```powershell
# TypeScript validation (0 errors = lulus)
npm run typecheck

# Production build
npm run build
```

### 6.2 Pengujian Koneksi Supabase
1. Jalankan `npm run dev`.
2. Buka `http://localhost:3000`.
3. Jika koneksi Supabase berhasil → halaman home menampilkan daftar buku pelajaran.
4. Jika gagal → muncul layar error merah dengan pesan `Koneksi Database Supabase Bermasalah`.

### 6.3 Pengujian Koneksi Gemini AI
```powershell
# Uji endpoint status AI secara langsung (server harus berjalan)
Invoke-WebRequest -Uri http://localhost:3000/api/ai/status -Method GET | Select-Object -ExpandProperty Content
```
Respons sukses:
```json
{"configured": true, "connected": true, "model": "gemini-3.8-flash", "message": "Koneksi Gemini API berhasil..."}
```

### 6.4 Pengujian Fitur Scan AI End-to-End
1. Buka `http://localhost:3000/#/scan`.
2. Pilih metode **Tempel Catatan** (paling cepat untuk test lokal).
3. Tempel teks catatan pelajaran (minimal 10 karakter).
4. Pilih mata pelajaran tujuan.
5. Klik **Lanjutkan Analisis** dan tunggu hasil AI.
6. Klik **Setujui & Simpan ke Supabase** untuk menerapkan hasil ke database.
7. Verifikasi data tersimpan: buka halaman buku tujuan dan pastikan materi baru muncul.

### 6.5 Pengujian Persistensi Data
1. Buka aplikasi dan buat/simpan satu buku atau subbab.
2. Tutup browser dan buka kembali `http://localhost:3000`.
3. Data harus tetap ada (tersimpan di Supabase, bukan localStorage).

---

## Bagian 7 — Cara Mengunggah Project ke GitHub

```powershell
# Dari folder root project EduNotes:

# 1. Inisialisasi Git (jika belum)
git init

# 2. Tambahkan semua file (kecuali yang ada di .gitignore)
git add .

# 3. Verifikasi .env TIDAK masuk ke staging (output harus kosong untuk .env)
git status | Select-String "\.env$"

# 4. Commit
git commit -m "feat: EduNotes production — Supabase + Gemini AI integration"

# 5. Hubungkan ke repository GitHub baru (ganti URL sesuai repo Anda)
git remote add origin https://github.com/username/edunotes.git

# 6. Push
git push -u origin main
```

> **Pastikan:** File `.env` tidak muncul di output `git status`. Jika muncul, hentikan dan periksa `.gitignore`.

---

## Bagian 8 — Cara Menghubungkan GitHub dengan Netlify

1. Login ke **https://app.netlify.com/**.
2. Klik **Add new site → Import an existing project**.
3. Pilih **GitHub** sebagai provider.
4. Pilih repository `edunotes` yang baru di-push.
5. Netlify akan otomatis membaca `netlify.toml`:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
   - **Functions directory:** `netlify/functions`
6. Klik **Deploy site** (deployment pertama akan gagal jika environment variables belum diisi — lanjutkan ke Bagian 9 dahulu).

---

## Bagian 9 — Cara Memasukkan Environment Variables di Netlify

1. Buka **Netlify Dashboard → Site configuration → Environment variables**.
2. Klik **Add a variable** dan tambahkan satu per satu:

| Nama Variabel | Nilai | Scope |
|---|---|---|
| `GEMINI_API_KEY` | `AIzaSy...` (dari Google AI Studio) | **All scopes** (Functions + Runtime) |
| `VITE_SUPABASE_URL` | `https://xxx.supabase.co` | **All scopes** |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGci...` | **All scopes** |

3. Simpan semua variabel.

> **PENTING:** `GEMINI_API_KEY` **tanpa prefix VITE_** — agar tidak terekspos ke browser. Netlify Functions membacanya dari `process.env.GEMINI_API_KEY`.

---

## Bagian 10 — Cara Deploy & Menguji Website Production

### 10.1 Deploy

Setelah environment variables terisi:
1. Buka **Netlify Dashboard → Deploys**.
2. Klik **Trigger deploy → Clear cache and deploy site**.
3. Tunggu proses build selesai (sekitar 1–3 menit).
4. Buka URL production yang diberikan Netlify (misal: `https://edunotes-xxx.netlify.app`).

### 10.2 Verifikasi Production

Setelah deploy berhasil, uji endpoint berikut:

```
# Status AI (buka di browser atau Postman):
https://edunotes-xxx.netlify.app/api/ai/status

# Respons sukses:
{"configured": true, "connected": true, "model": "gemini-3.8-flash", ...}
```

Jika endpoint mengembalikan `configured: false`, periksa kembali environment variable `GEMINI_API_KEY` di Netlify dan lakukan redeploy.

### 10.3 Deploy Ulang Setelah Perubahan Kode

```powershell
git add .
git commit -m "fix: ..."
git push
```

Netlify akan otomatis mendeteksi push dan melakukan build ulang.

---

## Referensi Arsitektur

```
┌─────────────────────────────────────────────────────────────────┐
│                    EDUNOTES ARCHITECTURE                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Browser (React + Vite)           SERVER-SIDE                    │
│  ┌─────────────────────┐          ┌────────────────────────┐    │
│  │ src/config/public.ts│          │ netlify/functions/      │    │
│  │ VITE_SUPABASE_URL   │          │ ai-analyze.ts           │    │
│  │ VITE_SUPABASE_ANON_KEY         │ ai-status.ts            │    │
│  │ (safe — RLS aktif)  │          │ _shared/config.ts       │    │
│  └────────┬────────────┘          │ server/geminiService.ts │    │
│           │                       │ GEMINI_API_KEY (rahasia)│    │
│           │                       └────────────┬───────────┘    │
│           ▼                                    ▼                 │
│  ┌─────────────────┐              ┌────────────────────────┐    │
│  │ Supabase Cloud  │              │ Google Gemini 2.5 Flash │    │
│  │ PostgreSQL + RLS│              │ AI API                  │    │
│  │ (single source  │              │ (Multimodal: teks,      │    │
│  │  of truth)      │              │  gambar, PDF)           │    │
│  └─────────────────┘              └────────────────────────┘    │
│                                                                   │
│  ALUR DATA:                                                       │
│  1. Buka website → fetchBooks() → Supabase → tampil di UI        │
│  2. Admin login → supabase.auth.signInWithPassword()             │
│  3. Scan catatan → /api/ai/analyze → Gemini → proposal          │
│  4. Approve proposal → Supabase INSERT/UPDATE → fetchBooks()     │
│  5. Semua user melihat data terbaru dari Supabase (bukan cache)  │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### Variabel Environment

| Variabel | Dibaca Oleh | Wajib | Fungsi |
|---|---|---|---|
| `GEMINI_API_KEY` | Server (`server.ts`, `netlify/functions`) | ✅ Ya | Autentikasi ke Google Gemini API |
| `VITE_SUPABASE_URL` | Browser (`src/`) | ✅ Ya | URL koneksi Supabase Cloud |
| `VITE_SUPABASE_ANON_KEY` | Browser (`src/`) | ✅ Ya | Kunci publik Supabase (aman dengan RLS) |

### Lokasi Konfigurasi Terpusat

| File | Fungsi |
|---|---|
| `.env` | Nilai konfigurasi lokal (tidak di-commit ke Git) |
| `.env.example` | Template konfigurasi (aman di GitHub) |
| `src/config/public.ts` | Pusat konfigurasi frontend (membaca `VITE_*`) |
| `src/config/integrations.ts` | Re-export dari `public.ts` untuk kompatibilitas |
| `netlify/functions/_shared/config.ts` | Pusat konfigurasi server (membaca `GEMINI_API_KEY`) |
| `server/geminiService.ts` | Implementasi Gemini AI (server-side only) |
| `src/lib/supabase.ts` | Supabase client (singleton, inisialisasi lazy) |
| `src/services/bookStore.ts` | Semua operasi CRUD ke Supabase |
| `src/services/noteAnalysisService.ts` | Pipeline analisis AI (fetch ke `/api/ai/analyze`) |

---

## Catatan Penting

> **Build validation ≠ Integrasi berfungsi.**
>
> `npm run typecheck` dan `npm run build` hanya memvalidasi bahwa kode TypeScript valid dan aplikasi bisa dibundel. Ini **tidak** membuktikan:
> - Koneksi ke Supabase Cloud berfungsi (butuh `.env` dengan nilai valid)
> - Koneksi ke Gemini API berfungsi (butuh `GEMINI_API_KEY` valid)
> - Fitur scan AI end-to-end berfungsi (butuh server berjalan + API key aktif)
>
> Untuk membuktikan integrasi penuh, ikuti seluruh langkah di **Bagian 6**.
