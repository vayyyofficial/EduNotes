import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Moon, ScanLine, Sun } from 'lucide-react';
import { UnifiedSourceType } from '../services/noteAnalysisService';

export type ActiveRoute =
  | { page: 'home' }
  | { page: 'book'; slug: string; subchapterId?: string }
  | { page: 'scan'; preselectedBookId?: string; initialMode?: UnifiedSourceType }
  | { page: 'dashboard' };

export type HomeSection = 'hero' | 'books';

interface HeaderProps {
  route: ActiveRoute;
  activeHomeSection: HomeSection;
  onNavigate: (route: ActiveRoute) => void;
  onScrollToHomeSection: (section: HomeSection) => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

type NavKey = 'beranda' | 'buku' | 'scan' | 'dashboard';

export function Header({
  route,
  activeHomeSection,
  onNavigate,
  onScrollToHomeSection,
  theme,
  onToggleTheme,
}: HeaderProps) {
  const navRef = useRef<HTMLElement | null>(null);
  const btnRefs = useRef<Record<NavKey, HTMLButtonElement | null>>({
    beranda: null,
    buku: null,
    scan: null,
    dashboard: null,
  });

  const [indicator, setIndicator] = useState<{ left: number; width: number; ready: boolean }>({
    left: 0,
    width: 0,
    ready: false,
  });

  const activeKey: NavKey =
    route.page === 'home'
      ? activeHomeSection === 'books'
        ? 'buku'
        : 'beranda'
      : route.page === 'book'
        ? 'buku'
        : route.page === 'scan'
          ? 'scan'
          : 'dashboard';

  const measureIndicator = useCallback(() => {
    const nav = navRef.current;
    const btn = btnRefs.current[activeKey];
    if (!nav || !btn) return;
    const navRect = nav.getBoundingClientRect();
    const btnRect = btn.getBoundingClientRect();
    setIndicator({
      left: btnRect.left - navRect.left,
      width: btnRect.width,
      ready: true,
    });
  }, [activeKey]);

  useLayoutEffect(() => {
    measureIndicator();
  }, [measureIndicator]);

  useEffect(() => {
    window.addEventListener('resize', measureIndicator);
    return () => window.removeEventListener('resize', measureIndicator);
  }, [measureIndicator]);

  const navItems: Array<{ key: NavKey; label: string; onClick: () => void }> = [
    {
      key: 'beranda',
      label: 'Beranda',
      onClick: () => onScrollToHomeSection('hero'),
    },
    {
      key: 'buku',
      label: 'Buku Pelajaran',
      onClick: () => onScrollToHomeSection('books'),
    },
    {
      key: 'scan',
      label: 'Scan Catatan',
      onClick: () => onNavigate({ page: 'scan' }),
    },
    {
      key: 'dashboard',
      label: 'Dashboard',
      onClick: () => onNavigate({ page: 'dashboard' }),
    },
  ];

  return (
    <header className="no-print sticky top-0 z-40 border-b border-neutral-200 bg-white/95 backdrop-blur-sm dark:border-neutral-800 dark:bg-neutral-950/95">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-8 px-4 sm:px-6 lg:px-8">
        {/* Zone 1: Brand Wordmark */}
        <button
          type="button"
          onClick={() => onScrollToHomeSection('hero')}
          className="flex shrink-0 items-center gap-2.5 text-left whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-yellow-400"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-yellow-400 text-sm font-extrabold text-neutral-950">
            E
          </span>
          <span className="text-lg font-extrabold tracking-tight text-neutral-950 dark:text-white">
            EduNotes
          </span>
        </button>

        {/* Zone 2: Animated Scroll-Aware Navigation */}
        <nav
          ref={navRef}
          aria-label="Navigasi utama"
          className="relative hidden h-full items-center gap-7 text-sm font-medium md:flex"
        >
          {navItems.map((item) => {
            const isActive = activeKey === item.key;
            return (
              <button
                key={item.key}
                ref={(el) => {
                  btnRefs.current[item.key] = el;
                }}
                type="button"
                onClick={item.onClick}
                className={`relative flex h-full items-center whitespace-nowrap shrink-0 transition-colors duration-200 ${
                  isActive
                    ? 'font-semibold text-neutral-950 dark:text-white'
                    : 'text-neutral-600 hover:text-neutral-950 dark:text-neutral-400 dark:hover:text-white'
                }`}
              >
                {item.label}
              </button>
            );
          })}

          {/* Smoothly Sliding Yellow Underline */}
          {indicator.ready && (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute bottom-0 h-[2.5px] rounded-full bg-yellow-400 transition-all duration-300 ease-out"
              style={{
                left: `${indicator.left}px`,
                width: `${indicator.width}px`,
              }}
            />
          )}
        </nav>

        {/* Zone 3: Theme Switcher & Primary Action */}
        <div className="flex shrink-0 items-center gap-3">
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={theme === 'dark' ? 'Aktifkan mode terang' : 'Aktifkan mode gelap'}
            title={theme === 'dark' ? 'Mode Terang' : 'Mode Gelap'}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 text-neutral-700 transition-colors hover:bg-neutral-100 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-900"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          <button
            type="button"
            onClick={() => onNavigate({ page: 'scan' })}
            className="inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg bg-yellow-400 px-3.5 py-2 text-xs font-bold text-neutral-950 transition-colors hover:bg-yellow-300"
          >
            <ScanLine className="h-3.5 w-3.5" />
            Scan Catatan
          </button>
        </div>
      </div>

      {/* Mobile Navigation Bar */}
      <div className="flex items-center justify-around border-t border-neutral-200 px-2 py-2 text-xs font-semibold md:hidden dark:border-neutral-800">
        {navItems.map((item) => {
          const isActive = activeKey === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={item.onClick}
              className={`relative pb-1 transition-colors ${
                isActive
                  ? 'text-neutral-950 dark:text-white'
                  : 'text-neutral-500 dark:text-neutral-400'
              }`}
            >
              {item.label}
              {isActive && (
                <span className="absolute right-0 bottom-0 left-0 h-0.5 rounded-full bg-yellow-400" />
              )}
            </button>
          );
        })}
      </div>
    </header>
  );
}
