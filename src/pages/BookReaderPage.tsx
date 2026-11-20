import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookMarked,
  Check,
  Copy,
  History,
  Menu,
  Printer,
  RotateCcw,
  ScanLine,
  X,
} from 'lucide-react';
import { Book, Chapter, Subchapter, SubchapterVersion } from '../types/textbook';
import { extractPlainTextFromBlocks, formatDate } from '../lib/format';
import { RichContentRenderer } from '../components/RichContentRenderer';
import { SubjectIcon } from '../components/SubjectIcon';
import { ActiveRoute } from '../components/Header';

interface BookReaderPageProps {
  book: Book | undefined;
  initialSubchapterId?: string;
  onNavigate: (route: ActiveRoute) => void;
  onRestoreVersion: (
    bookId: string,
    chapterId: string,
    subchapterId: string,
    version: SubchapterVersion
  ) => void;
}

export function BookReaderPage({
  book,
  initialSubchapterId,
  onNavigate,
  onRestoreVersion,
}: BookReaderPageProps) {
  const [mobileTocOpen, setMobileTocOpen] = useState(false);
  const [activeView, setActiveView] = useState<'material' | 'references'>('material');
  const [activeSubId, setActiveSubId] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const flatMaterials = useMemo(() => {
    if (!book) return [];
    const list: Array<{ chapter: Chapter; subchapter: Subchapter }> = [];
    for (const ch of book.chapters) {
      for (const sub of ch.subchapters) {
        list.push({ chapter: ch, subchapter: sub });
      }
    }
    return list;
  }, [book]);

  useEffect(() => {
    if (initialSubchapterId && flatMaterials.some((m) => m.subchapter.id === initialSubchapterId)) {
      setActiveSubId(initialSubchapterId);
      setActiveView('material');
    } else if (flatMaterials.length > 0 && !flatMaterials.some((m) => m.subchapter.id === activeSubId)) {
      setActiveSubId(flatMaterials[0].subchapter.id);
    }
  }, [book?.id, initialSubchapterId, flatMaterials.length]);

  if (!book) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <p className="text-base font-semibold text-neutral-950 dark:text-white">
          Buku pelajaran tidak ditemukan.
        </p>
        <button
          type="button"
          onClick={() => onNavigate({ page: 'home' })}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-yellow-400 px-4 py-2 text-xs font-bold text-neutral-950"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke Perpustakaan
        </button>
      </div>
    );
  }

  const currentIndex = flatMaterials.findIndex((m) => m.subchapter.id === activeSubId);
  const currentEntry = currentIndex >= 0 ? flatMaterials[currentIndex] : flatMaterials[0] || null;
  const prevEntry = currentIndex > 0 ? flatMaterials[currentIndex - 1] : null;
  const nextEntry =
    currentIndex >= 0 && currentIndex < flatMaterials.length - 1
      ? flatMaterials[currentIndex + 1]
      : null;

  const handleCopy = async () => {
    if (!currentEntry) return;
    const text = extractPlainTextFromBlocks(
      `${currentEntry.subchapter.code} ${currentEntry.subchapter.title}`,
      `Buku ${book.name}`,
      currentEntry.subchapter.content
    );
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore clipboard error
    }
  };

  const renderToc = () => (
    <div className="space-y-6">
      <div className="flex items-start gap-3 border-b border-neutral-200 pb-4 dark:border-neutral-800">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-neutral-950"
          style={{ backgroundColor: book.color || '#FACC15' }}
        >
          <SubjectIcon name={book.icon} className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <h2 className="text-sm font-extrabold text-neutral-950 dark:text-white">
            Buku {book.name}
          </h2>
          <p className="mt-0.5 line-clamp-2 text-xs text-neutral-500 dark:text-neutral-400">
            {book.description}
          </p>
        </div>
      </div>

      <div className="space-y-5">
        {book.chapters.length === 0 ? (
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Belum ada bab di buku ini. Tambahkan bab melalui Dashboard atau Scan Catatan.
          </p>
        ) : (
          book.chapters.map((ch) => (
            <div key={ch.id} className="space-y-1.5">
              <p className="text-xs font-extrabold tracking-tight text-neutral-900 dark:text-neutral-200">
                BAB {ch.number} — {ch.title}
              </p>
              {ch.subchapters.length === 0 ? (
                <p className="pl-2 text-xs text-neutral-400">Belum ada subbab</p>
              ) : (
                <ul className="space-y-1">
                  {ch.subchapters.map((sub) => {
                    const isActive =
                      activeView === 'material' && currentEntry?.subchapter.id === sub.id;
                    return (
                      <li key={sub.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveSubId(sub.id);
                            setActiveView('material');
                            setMobileTocOpen(false);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className={`flex w-full items-start gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition-colors ${
                            isActive
                              ? 'bg-yellow-400 font-bold text-neutral-950'
                              : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-950 dark:text-neutral-400 dark:hover:bg-neutral-900 dark:hover:text-white'
                          }`}
                        >
                          <span className="shrink-0 font-mono tabular-nums">{sub.code}</span>
                          <span className="leading-snug">{sub.title}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          ))
        )}
      </div>

      {/* References & Scan Shortcuts */}
      <div className="space-y-2 border-t border-neutral-200 pt-4 dark:border-neutral-800">
        <button
          type="button"
          onClick={() => {
            setActiveView('references');
            setMobileTocOpen(false);
          }}
          className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-semibold transition-colors ${
            activeView === 'references'
              ? 'bg-yellow-400 text-neutral-950'
              : 'text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-900'
          }`}
        >
          <BookMarked className="h-3.5 w-3.5" />
          Daftar Pustaka ({book.references.length})
        </button>

        <button
          type="button"
          onClick={() => onNavigate({ page: 'scan', preselectedBookId: book.id })}
          className="flex w-full items-center gap-2 rounded-lg border border-neutral-200 px-2.5 py-2 text-left text-xs font-semibold text-neutral-800 hover:bg-neutral-100 dark:border-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-900"
        >
          <ScanLine className="h-3.5 w-3.5 text-yellow-500" />
          Scan Catatan ke Buku Ini
        </button>
      </div>
    </div>
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 pb-24 sm:px-6 lg:px-8">
      {/* Top Breadcrumb + Mobile TOC Toggle */}
      <div className="no-print mb-6 flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => onNavigate({ page: 'home' })}
          className="inline-flex items-center gap-2 text-xs font-semibold text-neutral-600 hover:text-neutral-950 dark:text-neutral-400 dark:hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Daftar Buku Pelajaran
        </button>

        <button
          type="button"
          onClick={() => setMobileTocOpen((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-semibold text-neutral-800 lg:hidden dark:border-neutral-800 dark:text-neutral-200"
        >
          {mobileTocOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          Daftar Isi
        </button>
      </div>

      {/* Mobile Collapsible TOC */}
      {mobileTocOpen && (
        <div className="no-print mb-6 rounded-xl border border-neutral-200 bg-neutral-50 p-5 lg:hidden dark:border-neutral-800 dark:bg-neutral-900">
          {renderToc()}
        </div>
      )}

      {/* Main 2-Column Digital Textbook Layout */}
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
        {/* Desktop Sidebar TOC */}
        <aside className="no-print hidden lg:col-span-3 lg:block">
          <div className="sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto pr-2">
            {renderToc()}
          </div>
        </aside>

        {/* Reading Pane */}
        <article className="lg:col-span-9">
          {activeView === 'references' ? (
            <div className="max-w-3xl space-y-6">
              <header className="border-b border-neutral-200 pb-6 dark:border-neutral-800">
                <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                  Buku {book.name}
                </p>
                <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-neutral-950 dark:text-white">
                  Daftar Pustaka & Referensi
                </h1>
              </header>

              {book.references.length === 0 ? (
                <div className="rounded-xl border border-neutral-200 bg-neutral-50/70 p-8 text-center dark:border-neutral-800 dark:bg-neutral-900/40">
                  <p className="text-sm font-semibold text-neutral-950 dark:text-white">
                    Referensi belum ditambahkan
                  </p>
                  <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                    Anda dapat menambahkan sumber buku, artikel, atau tautan resmi melalui menu Dashboard → Daftar Pustaka.
                  </p>
                </div>
              ) : (
                <ol className="list-decimal space-y-4 pl-5 text-sm text-neutral-800 dark:text-neutral-200">
                  {book.references.map((ref) => (
                    <li key={ref.id} className="pl-1 leading-relaxed">
                      <span className="font-semibold text-neutral-950 dark:text-white">
                        {ref.author ? `${ref.author}. ` : ''}
                      </span>
                      {ref.year ? `(${ref.year}). ` : ''}
                      <em className="italic">{ref.title}</em>
                      {ref.publisherOrUrl ? `. ${ref.publisherOrUrl}` : ''}
                    </li>
                  ))}
                </ol>
              )}
            </div>
          ) : !currentEntry ? (
            <div className="rounded-xl border border-neutral-200 bg-neutral-50/70 p-10 text-center dark:border-neutral-800 dark:bg-neutral-900/40">
              <p className="text-sm font-semibold text-neutral-950 dark:text-white">
                Belum ada materi di Buku {book.name}
              </p>
              <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                Tambahkan bab dan subbab melalui Dashboard atau gunakan Scan Catatan.
              </p>
            </div>
          ) : (
            <div className="max-w-3xl">
              {/* Subchapter Header */}
              <header className="border-b border-neutral-200 pb-6 dark:border-neutral-800">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                    BAB {currentEntry.chapter.number} — {currentEntry.chapter.title}
                  </p>
                  <div className="no-print flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowHistory((v) => !v)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 px-2.5 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-900"
                    >
                      <History className="h-3.5 w-3.5" />
                      Riwayat ({currentEntry.subchapter.versions.length})
                    </button>
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 px-2.5 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-900"
                    >
                      {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                      {copied ? 'Disalin' : 'Salin'}
                    </button>
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 px-2.5 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-900"
                    >
                      <Printer className="h-3.5 w-3.5" />
                      Cetak
                    </button>
                  </div>
                </div>

                <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-neutral-950 sm:text-4xl dark:text-white">
                  <span className="mr-2 font-mono text-yellow-500">
                    {currentEntry.subchapter.code}
                  </span>
                  {currentEntry.subchapter.title}
                </h1>

                {currentEntry.subchapter.description && (
                  <p className="mt-3 text-base leading-relaxed text-neutral-600 dark:text-neutral-400">
                    {currentEntry.subchapter.description}
                  </p>
                )}

                <p className="mt-4 text-xs text-neutral-400 tabular-nums">
                  Diperbarui {formatDate(currentEntry.subchapter.updatedAt)}
                </p>
              </header>

              {/* Inline Version History Panel */}
              {showHistory && (
                <div className="no-print my-6 rounded-xl border border-neutral-200 bg-neutral-50 p-5 dark:border-neutral-800 dark:bg-neutral-900/60">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-xs font-bold text-neutral-950 dark:text-white">
                      Riwayat Versi Subbab Ini
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowHistory(false)}
                      className="text-xs text-neutral-500 hover:text-neutral-950 dark:hover:text-white"
                    >
                      Tutup
                    </button>
                  </div>
                  {currentEntry.subchapter.versions.length === 0 ? (
                    <p className="text-xs text-neutral-500">
                      Belum ada riwayat revisi sebelumnya.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {currentEntry.subchapter.versions.map((ver) => (
                        <div
                          key={ver.id}
                          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-neutral-200 bg-white px-3.5 py-2.5 text-xs dark:border-neutral-800 dark:bg-neutral-950"
                        >
                          <div>
                            <p className="font-semibold text-neutral-950 dark:text-white">
                              Versi {ver.versionNumber} · {ver.changeSummary}
                            </p>
                            <p className="text-[11px] text-neutral-400 tabular-nums">
                              {formatDate(ver.createdAt)}
                            </p>
                          </div>
                          {ver.content.length > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                onRestoreVersion(
                                  book.id,
                                  currentEntry.chapter.id,
                                  currentEntry.subchapter.id,
                                  ver
                                );
                                setShowHistory(false);
                              }}
                              className="inline-flex items-center gap-1 rounded-md bg-yellow-400 px-2.5 py-1 text-[11px] font-bold text-neutral-950 hover:bg-yellow-300"
                            >
                              <RotateCcw className="h-3 w-3" />
                              Pulihkan
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Content Body */}
              <div className="mt-8">
                <RichContentRenderer blocks={currentEntry.subchapter.content} />
              </div>

              {/* Previous / Next Subchapter Navigation */}
              <nav
                aria-label="Navigasi materi"
                className="no-print mt-14 grid grid-cols-1 gap-4 border-t border-neutral-200 pt-8 sm:grid-cols-2 dark:border-neutral-800"
              >
                {prevEntry ? (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveSubId(prevEntry.subchapter.id);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="rounded-xl border border-neutral-200 p-4 text-left transition-colors hover:border-neutral-950 dark:border-neutral-800 dark:hover:border-yellow-400"
                  >
                    <span className="inline-flex items-center gap-1 text-xs text-neutral-500">
                      <ArrowLeft className="h-3.5 w-3.5" />
                      Materi Sebelumnya
                    </span>
                    <p className="mt-1 text-sm font-bold text-neutral-950 dark:text-white">
                      {prevEntry.subchapter.code} {prevEntry.subchapter.title}
                    </p>
                  </button>
                ) : (
                  <div />
                )}

                {nextEntry && (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveSubId(nextEntry.subchapter.id);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="rounded-xl border border-neutral-200 p-4 text-right transition-colors hover:border-neutral-950 dark:border-neutral-800 dark:hover:border-yellow-400"
                  >
                    <span className="inline-flex items-center gap-1 text-xs text-neutral-500">
                      Materi Selanjutnya
                      <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                    <p className="mt-1 text-sm font-bold text-neutral-950 dark:text-white">
                      {nextEntry.subchapter.code} {nextEntry.subchapter.title}
                    </p>
                  </button>
                )}
              </nav>
            </div>
          )}
        </article>
      </div>
    </div>
  );
}
