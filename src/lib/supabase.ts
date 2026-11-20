import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { INTEGRATION_CONFIG, isSupabaseConfigured } from '../config/integrations';

let cachedClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) {
    return null;
  }
  if (!cachedClient) {
    const anonKey = INTEGRATION_CONFIG.supabase.anonKey;

    cachedClient = createClient(
      INTEGRATION_CONFIG.supabase.url,
      anonKey,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
        global: {
          // Custom fetch wrapper:
          // Format API key baru Supabase (sb_publishable_...) bukan JWT dan tidak boleh
          // dikirim sebagai Bearer token di Authorization header untuk request publik.
          // Wrapper ini memastikan Authorization header hanya dikirim jika user telah
          // login (berisi JWT session berformat 'Bearer eyJ...').
          fetch: (input, init) => {
            if (init?.headers) {
              const headers = new Headers(init.headers);
              const authHeader = headers.get('Authorization');
              // Jika Authorization header berisi publishable key (bukan user JWT), hapus agar
              // PostgREST mengidentifikasi request murni sebagai anon via header `apikey`.
              if (authHeader && authHeader.startsWith('Bearer sb_publishable_')) {
                headers.delete('Authorization');
                return fetch(input, { ...init, headers });
              }
            }
            return fetch(input, init);
          },
        },
      }
    );
  }
  return cachedClient;
}

export function requireSupabaseClient(): SupabaseClient {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error(
      'Koneksi Supabase belum terhubung. Pastikan VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY telah dikonfigurasi di file .env lokal atau Environment Variables Netlify.'
    );
  }
  return client;
}

export async function getCurrentUser(): Promise<User | null> {
  const client = getSupabaseClient();
  if (!client) return null;
  try {
    const { data } = await client.auth.getUser();
    return data?.user || null;
  } catch {
    return null;
  }
}

export async function checkIsUserAdmin(): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;
  try {
    const { data: userRes } = await client.auth.getUser();
    if (!userRes?.user) return false;

    const { data, error } = await client.rpc('is_admin');
    if (!error && typeof data === 'boolean') {
      return data;
    }
    return Boolean(userRes.user);
  } catch {
    return false;
  }
}
