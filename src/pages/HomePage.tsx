import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, BookOpen, ScanLine, Search, X } from 'lucide-react';
import { Book } from '../types/textbook';
import { getBookStats } from '../services/bookStore';
import { formatDate } from '../lib/format';
import { SubjectIcon } from '../components/SubjectIcon';
import { ActiveRoute, HomeSection } from '../components/Header';

interface HomePageProps {
  books: Book[];
  onNavigate: (route: ActiveRoute) => void;
  onActiveSectionChange: (section: HomeSection) => void;
}

export function HomePage({ books, onNavigate, onActiveSectionChange }: HomePageProps) {
  const [query, setQuery] = useState('');

  // Scroll-aware IntersectionObserver for Beranda vs Buku Pelajaran
  useEffect(() => {
    const heroEl = document.getElementById('home-hero');
    const booksEl = document.getElementById('book-library');
    if (!heroEl || !booksEl) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            if (entry.target.id === 'book-library') {
              onActiveSectionChange('books');
            } else if (entry.target.id === 'home-hero') {
              onActiveSectionChange('hero');
            }
          }
        }
      },
      {
        rootMargin: '-35% 0px -55% 0px',
        threshold: 0,
      }
    );

    observer.observe(heroEl);
    observer.observe(booksEl);
    return () => observer.disconnect();
  }, [onActiveSectionChange]);

  const trimmed = query.trim().toLowerCase();

  const filteredBooks = useMemo(() => {
    if (!trimmed) return books;
    return books.filter(
      (b) =>
        b.name.toLowerCase().includes(trimmed) ||
        b.description.toLowerCase().includes(trimmed) ||
        b.chapters.some(
          (ch) =>
            ch.title.toLowerCase().includes(trimmed) ||
            ch.subchapters.some(
              (s) =>
                s.title.toLowerCase().includes(trimmed) ||
                s.description.toLowerCase().includes(trimmed)
            )
        )
    );
  }, [books, trimmed]);

  const matchingSubchapters = useMemo(() => {
    if (!trimmed) return [];
    const results: Array<{
      book: Book;
      chapterTitle: string;
      subchapterId: string;
      code: string;
      title: string;
    }> = [];
    for (const book of books) {
      for (const ch of book.chapters) {
        for (const sub of ch.subchapters) {
          if (
            sub.title.toLowerCase().includes(trimmed) ||
            sub.description.toLowerCase().includes(trimmed) ||
            sub.tags.some((t) => t.toLowerCase().includes(trimmed))
          ) {
            results.push({
              book,
              chapterTitle: `BAB ${ch.number} — ${ch.title}`,
              subchapterId: sub.id,
              code: sub.code,
              title: sub.title,
            });
          }
        }
      }
    }
    return results;
  }, [books, trimmed]);

  return (
    <div className="mx-auto max-w-6xl px-4 pb-24 sm:px-6 lg:px-8">
      {/* Section 1: Beranda (Hero) */}
      <section
        id="home-hero"
        className="scroll-mt-20 border-b border-neutral-200 py-16 sm:py-24 dark:border-neutral-800"
      >
        <div className="max-w-3xl">
          <h1 className="text-3xl font-extrabold tracking-tight text-neutral-950 sm:text-5xl sm:leading-[1.1] dark:text-white">
            Catatan belajar yang tersusun rapi seperti buku pelajaran.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-neutral-600 sm:text-lg dark:text-neutral-400">
            Pilih mata pelajaran untuk mulai membaca, atau masukkan foto, file, dan teks catatan agar disusun otomatis ke dalam BAB dan subbab.
          </p>

          {/* Search Bar */}
          <div className="mt-8 max-w-xl">
            <div className="relative flex items-center">
              <Search className="pointer-events-none absolute left-4 h-4 w-4 text-neutral-400" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari mata pelajaran, bab, atau materi..."
                aria-label="Cari buku atau materi"
                className="h-12 w-full rounded-xl border border-neutral-300 bg-white pr-11 pl-11 text-sm text-neutral-950 placeholder:text-neutral-400 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/25 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  aria-label="Hapus pencarian"
                  className="absolute right-3 flex h-7 w-7 items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => onNavigate({ page: 'scan' })}
                className="inline-flex items-center gap-2 rounded-lg bg-yellow-400 px-4 py-2.5 text-xs font-bold text-neutral-950 transition-colors hover:bg-yellow-300"
              >
                <ScanLine className="h-4 w-4" />
                Scan Catatan
              </button>
              <button
                type="button"
                onClick={() => onNavigate({ page: 'dashboard' })}
                className="rounded-lg border border-neutral-300 px-4 py-2.5 text-xs font-semibold text-neutral-800 transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-900"
              >
                Buka Dashboard
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Search Results for Subchapters */}
      {trimmed && matchingSubchapters.length > 0 && (
        <section className="border-b border-neutral-200 py-10 dark:border-neutral-800">
          <h2 className="text-base font-bold text-neutral-950 dark:text-white">
            Materi yang Cocok ({matchingSubchapters.length})
          </h2>
          <div className="mt-4 divide-y divide-neutral-200 border-y border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
            {matchingSubchapters.map((item) => (
              <button
                key={item.subchapterId}
                type="button"
                onClick={() =>
                  onNavigate({
                    page: 'book',
                    slug: item.book.slug,
                    subchapterId: item.subchapterId,
                  })
                }
                className="group flex w-full items-center justify-between gap-4 py-4 text-left transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-900/40"
              >
                <div className="min-w-0">
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    <span className="font-semibold text-neutral-900 dark:text-yellow-400">
                      {item.book.name}
                    </span>{' '}
                    · {item.chapterTitle}
                  </p>
                  <p className="mt-0.5 font-semibold text-neutral-950 group-hover:underline decoration-yellow-400 underline-offset-4 dark:text-white">
                    {item.code} {item.title}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-neutral-400 transition-transform group-hover:translate-x-1 group-hover:text-neutral-950 dark:group-hover:text-yellow-400" />
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Section 2: Buku Pelajaran (Simplified, Clean Editorial List/Grid) */}
      <section id="book-library" className="scroll-mt-20 py-16">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-neutral-950 dark:text-white">
              Buku Pelajaran
            </h2>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
              Pilih mata pelajaran untuk membuka daftar isi dan membaca materi.
            </p>
          </div>
          <span className="text-xs text-neutral-500 tabular-nums dark:text-neutral-400">
            {filteredBooks.length} mata pelajaran
          </span>
        </div>

        {filteredBooks.length === 0 ? (
          <div className="rounded-xl border border-neutral-200 py-12 text-center dark:border-neutral-800">
            <BookOpen className="mx-auto h-6 w-6 text-neutral-400" />
            <p className="mt-3 text-sm font-semibold text-neutral-950 dark:text-white">
              Mata pelajaran tidak ditemukan
            </p>
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
              Coba kata kunci lain atau tambahkan buku baru di Dashboard.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-200 border-y border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
            {filteredBooks.map((book) => {
              const stats = getBookStats(book);
              return (
                <button
                  key={book.id}
                  type="button"
                  onClick={() => onNavigate({ page: 'book', slug: book.slug })}
                  className="group flex w-full flex-col justify-between gap-4 py-6 text-left transition-colors hover:bg-neutral-50/70 sm:flex-row sm:items-center sm:px-3 dark:hover:bg-neutral-900/40"
                >
                  <div className="flex items-start gap-4 min-w-0">
                    <span
                      className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-neutral-950"
                      style={{ backgroundColor: book.color || '#FACC15' }}
                    >
                      <SubjectIcon name={book.icon} className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-lg font-bold text-neutral-950 group-hover:underline decoration-yellow-400 underline-offset-4 dark:text-white">
                        {book.name}
                      </h3>
                      <p className="mt-1 line-clamp-1 max-w-xl text-sm text-neutral-600 dark:text-neutral-400">
                        {book.description || 'Buku catatan dan rangkuman pembelajaran digital.'}
                      </p>
                      <p className="mt-2 text-xs text-neutral-500 tabular-nums dark:text-neutral-400">
                        {stats.chapterCount} BAB · {stats.materialCount} materi · Diperbarui{' '}
                        {formatDate(book.updatedAt)}
                      </p>
                    </div>
                  </div>

                  <span className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-lg border border-neutral-200 px-3.5 py-2 text-xs font-semibold text-neutral-900 transition-colors group-hover:border-neutral-950 group-hover:bg-yellow-400 group-hover:text-neutral-950 sm:self-center dark:border-neutral-800 dark:text-neutral-200 dark:group-hover:border-yellow-400">
                    Buka Buku
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
