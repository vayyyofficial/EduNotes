import React, { useState } from 'react';
import { Lock, ShieldCheck, X } from 'lucide-react';
import { getSupabaseClient } from '../lib/supabase';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (email: string) => void;
}

export function AdminLoginModal({ isOpen, onClose, onSuccess }: AdminLoginModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = getSupabaseClient();
      if (!supabase) {
        throw new Error('Supabase client belum diinisialisasi.');
      }

      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (authError) {
        throw authError;
      }

      if (data?.user?.email) {
        onSuccess(data.user.email);
        onClose();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal masuk sebagai admin.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xl dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex items-center justify-between border-b border-neutral-100 pb-4 dark:border-neutral-800">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-yellow-400 text-neutral-950">
              <Lock className="h-4 w-4" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-neutral-950 dark:text-white">
                Otorisasi Admin EduNotes
              </h3>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                Masuk untuk mengelola data kurikulum di Supabase Cloud
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-950 dark:hover:bg-neutral-800 dark:hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
              Email Administrator
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@edunotes.id"
              className="mt-1.5 h-10 w-full rounded-lg border border-neutral-300 bg-white px-3 text-xs text-neutral-950 focus:border-neutral-950 focus:outline-none dark:border-neutral-700 dark:bg-neutral-950 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
              Kata Sandi
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="mt-1.5 h-10 w-full rounded-lg border border-neutral-300 bg-white px-3 text-xs text-neutral-950 focus:border-neutral-950 focus:outline-none dark:border-neutral-700 dark:bg-neutral-950 dark:text-white"
            />
          </div>

          <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
            Akun administrator dikelola melalui panel Supabase Dashboard → Authentication → Users.
          </p>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-neutral-300 px-3 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-lg bg-yellow-400 px-4 py-2 text-xs font-bold text-neutral-950 hover:bg-yellow-300 disabled:opacity-50"
            >
              <ShieldCheck className="h-4 w-4" />
              {loading ? 'Memverifikasi...' : 'Masuk sebagai Admin'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
