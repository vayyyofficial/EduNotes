# EduNotes — Platform Buku Pelajaran Digital & AI Smart Notes

EduNotes adalah aplikasi buku pelajaran digital berbasis **React + TypeScript + Vite + Tailwind CSS** dengan arsitektur **Frontend-First** yang siap dihubungkan ke **Google Gemini API** (server-side melalui Express / Netlify Functions) dan **Supabase** (database & storage).

---

## Persyaratan Software

- **Node.js** versi 18 atau lebih baru (disarankan Node.js 20 LTS)
- **npm** (terpasang otomatis bersama Node.js)
- **Visual Studio Code (VSCode)**
- **Git** (untuk commit dan push ke GitHub)
- *(Opsional)* **Netlify CLI** (`npm install -g netlify-cli`) jika ingin menguji Netlify Functions secara lokal

---

## Cara Membuka & Menjalankan di VSCode (Lokal)

1. **Extract** arsip/folder project EduNotes ke komputer Anda.
2. Buka **VSCode**, pilih **File → Open Folder...**, lalu pilih folder `edunotes`.
3. Buka terminal di VSCode (`Ctrl + \`` atau `Terminal → New Terminal`).
4. Install seluruh dependency:
   ```bash
   npm install
   ```
5. Buat file `.env` di root project berdasarkan template `.env.example`:
   ```bash
   cp .env.example .env
   ```
   *(Di Windows PowerShell: `Copy-Item .env.example .env`)*
6. Isi variabel di `.env` sesuai kebutuhan Anda (lihat `INTEGRATION_GUIDE.md`).
   > **Catatan:** Untuk menggunakan fitur Scan Catatan AI, isi `GEMINI_API_KEY` di `.env`. Fitur manajemen buku, pembaca materi, dan pencarian tetap dapat digunakan langsung menggunakan penyimpanan lokal browser.
7. Jalankan aplikasi secara lokal:
   ```bash
   npm run dev
   ```
8. Buka browser ke `http://localhost:3000`.

---

## Menjalankan Netlify Functions Secara Lokal

Jika Anda ingin menguji perilaku Netlify Functions dan redirect `netlify.toml` secara lokal sebelum deploy:

```bash
npm install -g netlify-cli
netlify dev
```

Netlify CLI akan membaca `netlify.toml`, memuat `.env` lokal Anda, dan menjalankan frontend beserta endpoint `/.netlify/functions/*` serta `/api/ai/*`.

---

## Perintah Penting Lainnya

```bash
# Type checking TypeScript
npm run typecheck

# Lint / verifikasi tipe
npm run lint

# Build production (menghasilkan folder dist/)
npm run build

# Preview hasil build production secara lokal
npm run preview
```

---

## Struktur Folder Utama

```text
edunotes/
├── netlify/
│   └── functions/
│       ├── _shared/config.ts     # Pusat konfigurasi secret server-side (GEMINI_API_KEY)
│       ├── ai-status.ts          # Endpoint GET /api/ai/status
│       └── ai-analyze.ts         # Endpoint POST /api/ai/analyze (Gemini API)
├── server/
│   └── geminiService.ts          # Layanan Gemini server-side untuk Express dev server
├── src/
│   ├── components/               # Komponen UI (Header, CameraCapturePanel, StructuredEditor, dll.)
│   ├── config/
│   │   ├── public.ts             # Pusat konfigurasi publik frontend (VITE_*)
│   │   └── integrations.ts       # Re-export kompatibilitas dari public.ts
│   ├── data/                     # Data kurikulum awal buku pelajaran standar
│   ├── lib/                      # Utilitas (fileReader, format, supabase client)
│   ├── pages/                    # Halaman utama (Home, BookReader, ScanCatatan, Dashboard)
│   ├── services/                 # Business logic (bookStore, noteAnalysisService)
│   └── types/                    # Definisi tipe TypeScript
├── supabase/                     # File migrasi skema database Supabase
├── .env.example                  # Template environment variables (tanpa secret)
├── .gitignore                    # Mengabaikan .env, .netlify/, node_modules/, dist/
├── netlify.toml                  # Konfigurasi build, functions, dan SPA routing Netlify
├── server.ts                     # Express + Vite middleware dev server lokal
├── README.md                     # Panduan instalasi & pengembangan lokal
└── INTEGRATION_GUIDE.md          # Panduan lengkap API Key, Supabase & Deploy Netlify
```

---

## Mengatasi Error Instalasi Umum

- **`npm install` gagal / versi Node terlalu lama**: Pastikan `node -v` menampilkan v18+ atau v20+.
- **Kamera tidak terbuka di browser**: Pastikan membuka lewat `http://localhost:3000` atau domain `https://` (browser memblokir akses kamera pada HTTP non-localhost).
- **Port 3000 sudah dipakai**: Tutup proses lain di port 3000 sebelum menjalankan `npm run dev`.
- **Error 404 saat refresh halaman di Netlify**: Sudah ditangani oleh aturan `[[redirects]]` SPA fallback di `netlify.toml`.
