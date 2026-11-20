/**
 * Pusat konfigurasi SERVER-SIDE (RAHASIA) untuk Netlify Functions & Server.
 *
 * File ini HANYA berjalan di server (Node.js / Netlify Functions)
 * dan TIDAK PERNAH dibundel ke browser.
 */

export const SERVER_CONFIG = {
  geminiModel: 'gemini-3.8-flash',
  fallbackModel: 'gemini-3.5-flash-lite',
  maxFilesPerRequest: 10,
  maxTextLength: 50_000,
} as const;

export function getGeminiApiKey(): string | null {
  const raw = process.env.GEMINI_API_KEY?.trim() || '';
  if (!raw || raw === 'MY_GEMINI_API_KEY' || raw === 'YOUR_GEMINI_API_KEY_HERE' || raw.length < 10) {
    return null;
  }
  return raw;
}

export function isGeminiConfigured(): boolean {
  return getGeminiApiKey() !== null;
}
