import { useCallback, useEffect, useState } from 'react';
import { ActiveRoute, Header, HomeSection } from './components/Header';
import { HomePage } from './pages/HomePage';
import { BookReaderPage } from './pages/BookReaderPage';
import { ScanCatatanPage } from './pages/ScanCatatanPage';
import { DashboardPage } from './pages/DashboardPage';
import { Book } from './types/textbook';
import { fetchBooks, restoreSubchapterVersion } from './services/bookStore';
import { UnifiedSourceType } from './services/noteAnalysisService';
import { AlertCircle, RefreshCw } from 'lucide-react';

function parseRouteFromHash(): ActiveRoute {
  const hash = window.location.hash.replace(/^#/, '');
  if (hash.startsWith('/book/')) {
    const rest = hash.slice('/book/'.length);
    const [slugPart, subPart] = rest.split('?sub=');
    return {
      page: 'book',
      slug: decodeURIComponent(slugPart),
      subchapterId: subPart ? decodeURIComponent(subPart) : undefined,
    };
  }
  if (hash === '/scan') {
    return { page: 'scan' };
  }
  if (hash === '/dashboard') {
    return { page: 'dashboard' };
  }
  return { page: 'home' };
}

function routeToHash(route: ActiveRoute): string {
  switch (route.page) {
    case 'book':
      return `#/book/${encodeURIComponent(route.slug)}${
        route.subchapterId ? `?sub=${encodeURIComponent(route.subchapterId)}` : ''
      }`;
    case 'scan':
      return '#/scan';
    case 'dashboard':
      return '#/dashboard';
    default:
      return '#/';
  }
}

export default function App() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [dbError, setDbError] = useState<string | null>(null);

  const [route, setRoute] = useState<ActiveRoute>(parseRouteFromHash);
  const [activeHomeSection, setActiveHomeSection] = useState<HomeSection>('hero');
  const [scanPreselectedBookId, setScanPreselectedBookId] = useState<string | undefined>(
    undefined
  );
  const [scanInitialMode, setScanInitialMode] = useState<UnifiedSourceType>('camera');

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('edunotes-theme');
    if (saved === 'dark' || saved === 'light') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  const loadLibrary = useCallback(async () => {
    setLoading(true);
    setDbError(null);
    try {
      const data = await fetchBooks();
      setBooks(data);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Gagal menghubungi database Supabase Cloud. Pastikan VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY telah dikonfigurasi.';
      setDbError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLibrary();
  }, [loadLibrary]);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('edunotes-theme', theme);
  }, [theme]);

  useEffect(() => {
    const onHashChange = () => {
      setRoute(parseRouteFromHash());
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const navigate = useCallback((next: ActiveRoute) => {
    if (next.page === 'scan') {
      setScanPreselectedBookId(next.preselectedBookId);
      setScanInitialMode(next.initialMode || 'camera');
    }
    const targetHash = routeToHash(next);
    if (window.location.hash !== targetHash) {
      window.location.hash = targetHash;
    } else {
      setRoute(next);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleScrollToHomeSection = useCallback(
    (section: HomeSection) => {
      setActiveHomeSection(section);
      const scrollNow = () => {
        const elId = section === 'books' ? 'book-library' : 'home-hero';
        document.getElementById(elId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      };

      if (route.page !== 'home') {
        const targetHash = '#/';
        if (window.location.hash !== targetHash) {
          window.location.hash = targetHash;
        } else {
          setRoute({ page: 'home' });
        }
        setTimeout(scrollNow, 80);
      } else {
        scrollNow();
      }
    },
    [route.page]
  );

  return (
    <div className="flex min-h-screen flex-col bg-white text-neutral-950 transition-colors dark:bg-neutral-950 dark:text-neutral-50">
      <Header
        route={route}
        activeHomeSection={activeHomeSection}
        onNavigate={navigate}
        onScrollToHomeSection={handleScrollToHomeSection}
        theme={theme}
        onToggleTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
      />

      <main className="flex-1">
        {loading ? (
          <div className="mx-auto flex max-w-4xl flex-col items-center justify-center py-24 px-4 text-center">
            <RefreshCw className="h-8 w-8 animate-spin text-yellow-500" />
            <p className="mt-4 text-sm font-semibold text-neutral-800 dark:text-neutral-200">
              Menghubungkan ke Database Supabase Cloud...
            </p>
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
              Memuat kurikulum buku pelajaran digital.
            </p>
          </div>
        ) : dbError ? (
          <div className="mx-auto max-w-2xl px-4 py-16">
            <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center dark:border-red-900/60 dark:bg-red-950/30">
              <AlertCircle className="mx-auto h-10 w-10 text-red-600 dark:text-red-400" />
              <h2 className="mt-3 text-base font-bold text-red-950 dark:text-red-200">
                Koneksi Database Supabase Bermasalah
              </h2>
              <p className="mt-2 text-xs leading-relaxed text-red-800 dark:text-red-300">
                {dbError}
              </p>
              <div className="mt-4 rounded-xl border border-red-200 bg-white p-4 text-left text-xs dark:border-red-900/40 dark:bg-neutral-900">
                <p className="font-semibold text-neutral-900 dark:text-white">
                  Langkah Penanganan:
                </p>
                <ol className="mt-1.5 list-decimal space-y-1 pl-4 text-neutral-700 dark:text-neutral-300">
                  <li>
                    Pastikan file <code className="font-mono text-neutral-900 dark:text-white">.env</code> di root project sudah memiliki <code className="font-mono">VITE_SUPABASE_URL</code> dan <code className="font-mono">VITE_SUPABASE_ANON_KEY</code>.
                  </li>
                  <li>
                    Pastikan skema database telah dijalankan di Supabase SQL Editor (<code className="font-mono">supabase/migrations/003_edunotes_textbook_schema.sql</code>).
                  </li>
                  <li>
                    Untuk Netlify, pastikan variabel telah ditambahkan di <strong>Site configuration → Environment variables</strong>.
                  </li>
                </ol>
              </div>
              <button
                type="button"
                onClick={loadLibrary}
                className="mt-5 inline-flex items-center gap-1.5 rounded-lg bg-neutral-950 px-4 py-2 text-xs font-bold text-white hover:bg-neutral-800 dark:bg-yellow-400 dark:text-neutral-950 dark:hover:bg-yellow-300"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Coba Hubungkan Ulang
              </button>
            </div>
          </div>
        ) : (
          <>
            {route.page === 'home' && (
              <HomePage
                books={books}
                onNavigate={navigate}
                onActiveSectionChange={setActiveHomeSection}
              />
            )}

            {route.page === 'book' && (
              <BookReaderPage
                book={books.find((b) => b.slug === route.slug)}
                initialSubchapterId={route.subchapterId}
                onNavigate={navigate}
                onRestoreVersion={async (bookId, chapterId, subchapterId, version) => {
                  try {
                    const targetBook = books.find((b) => b.id === bookId);
                    const targetCh = targetBook?.chapters.find((c) => c.id === chapterId);
                    const targetSub = targetCh?.subchapters.find((s) => s.id === subchapterId);
                    const verCount = targetSub?.versions.length || 1;
                    await restoreSubchapterVersion(subchapterId, version, verCount);
                    const refreshed = await fetchBooks();
                    setBooks(refreshed);
                  } catch (err) {
                    alert(err instanceof Error ? err.message : 'Gagal memulihkan versi');
                  }
                }}
              />
            )}

            {route.page === 'scan' && (
              <ScanCatatanPage
                books={books}
                preselectedBookId={scanPreselectedBookId}
                initialMode={scanInitialMode}
                onUpdateBooks={setBooks}
                onNavigate={navigate}
              />
            )}

            {route.page === 'dashboard' && (
              <DashboardPage
                books={books}
                onUpdateBooks={setBooks}
                onNavigate={navigate}
              />
            )}
          </>
        )}
      </main>

      <footer className="no-print border-t border-neutral-200 py-8 dark:border-neutral-800">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 text-xs text-neutral-500 sm:flex-row sm:px-6 lg:px-8 dark:text-neutral-400">
          <p className="font-semibold text-neutral-900 dark:text-neutral-200">
            EduNotes — Platform Buku Pelajaran Digital
          </p>
          <p>Database Cloud Supabase · Didukung Gemini AI</p>
        </div>
      </footer>
    </div>
  );
}
