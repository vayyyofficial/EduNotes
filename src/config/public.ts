/**
 * Pusat konfigurasi PUBLIK (Frontend) EduNotes.
 *
 * ATURAN KEAMANAN:
 * - File ini dibundel ke browser. HANYA variabel berawalan VITE_ yang boleh dibaca di sini.
 * - JANGAN PERNAH menaruh GEMINI_API_KEY atau SUPABASE_SERVICE_ROLE_KEY di file ini.
 * - Untuk secret server-side, lihat: netlify/functions/_shared/config.ts dan server/geminiService.ts
 */

export const PUBLIC_CONFIG = {
  supabase: {
    url: (import.meta.env.VITE_SUPABASE_URL as string) || '',
    anonKey: (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || '',
  },

  aiEndpoints: {
    status: '/api/ai/status',
    analyze: '/api/ai/analyze',
  },

  limits: {
    maxScanPhotos: 10,
    maxPhotoSizeBytes: 5 * 1024 * 1024, // 5 MB per foto kamera
    maxUploadFileSizeBytes: 10 * 1024 * 1024, // 10 MB per file unggahan
  },
} as const;

export function isSupabaseConfigured(): boolean {
  const { url, anonKey } = PUBLIC_CONFIG.supabase;
  if (!url || !anonKey) return false;
  // Tolak placeholder
  if (url.includes('YOUR_PROJECT_ID') || anonKey.includes('YOUR_SUPABASE')) return false;
  // Izinkan format lama (eyJ...) dan format baru (sb_publishable_... / sb_secret_...)
  const isJwt = anonKey.startsWith('eyJ');
  const isNewFormat = anonKey.startsWith('sb_publishable_') || anonKey.startsWith('sb_secret_');
  return Boolean(url.startsWith('https://') && (isJwt || isNewFormat));
}

export function isLiveAiMode(): boolean {
  return true;
}
