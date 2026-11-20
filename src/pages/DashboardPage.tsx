import React, { useEffect, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  BookOpen,
  Camera,
  ClipboardType,
  History,
  Lock,
  LogOut,
  Pencil,
  Plus,
  RotateCcw,
  ShieldCheck,
  Trash2,
  Upload,
} from 'lucide-react';
import { User } from '@supabase/supabase-js';
import { Book, ContentBlock, LocalScanHistoryItem, Subchapter, SubchapterVersion } from '../types/textbook';
import {
  addChapter,
  addSubchapter,
  createBook,
  deleteBook,
  deleteChapter,
  deleteReference,
  deleteSubchapter,
  fetchBooks,
  moveChapter,
  restoreSubchapterVersion,
  saveReference,
  seedInitialLibraryToSupabase,
  updateBook,
  updateSubchapter,
} from '../services/bookStore';
import { loadScanHistory } from '../services/noteAnalysisService';
import { formatDate, generateBlockId } from '../lib/format';
import { SUBJECT_ICON_OPTIONS, SubjectIcon } from '../components/SubjectIcon';
import { StructuredEditor } from '../components/StructuredEditor';
import { ActiveRoute } from '../components/Header';
import { getSupabaseClient } from '../lib/supabase';
import { AdminLoginModal } from '../components/AdminLoginModal';

type DashboardTab = 'buku' | 'tambah-materi' | 'riwayat';

interface DashboardPageProps {
  books: Book[];
  onUpdateBooks: (books: Book[]) => void;
  onNavigate: (route: ActiveRoute) => void;
}

export function DashboardPage({ books, onUpdateBooks, onNavigate }: DashboardPageProps) {
  const [tab, setTab] = useState<DashboardTab>('buku');
  const [selectedBookId, setSelectedBookId] = useState<string>(books[0]?.id || '');
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Admin Auth state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // Book form
  const [showBookForm, setShowBookForm] = useState(false);
  const [editingBookId, setEditingBookId] = useState<string | null>(null);
  const [bookName, setBookName] = useState('');
  const [bookDesc, setBookDesc] = useState('');
  const [bookIcon, setBookIcon] = useState('BookOpen');
  const [bookColor, setBookColor] = useState('#FACC15');

  // Chapter & manual subchapter form
  const [newChapterTitle, setNewChapterTitle] = useState('');
  const [editingSub, setEditingSub] = useState<{
    chapterId: string;
    subchapterId: string | null;
    title: string;
    description: string;
    content: ContentBlock[];
    currentVersionCount?: number;
  } | null>(null);

  // Reference form
  const [refTitle, setRefTitle] = useState('');
  const [refAuthor, setRefAuthor] = useState('');
  const [refYear, setRefYear] = useState('');
  const [refPublisher, setRefPublisher] = useState('');

  // Scan history from Supabase
  const [scanHistory, setScanHistory] = useState<LocalScanHistoryItem[]>([]);

  const selectedBook = books.find((b) => b.id === selectedBookId) || books[0] || null;

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (supabase) {
      supabase.auth.getUser().then(({ data }) => {
        setCurrentUser(data?.user || null);
      });

      const { data: authSub } = supabase.auth.onAuthStateChange((_event, session) => {
        setCurrentUser(session?.user || null);
      });

      return () => {
        authSub.subscription.unsubscribe();
      };
    }
  }, []);

  useEffect(() => {
    if (tab === 'riwayat') {
      loadScanHistory().then(setScanHistory);
    }
  }, [tab]);

  const notify = (msg: string) => {
    setError(null);
    setNotice(msg);
  };

  const handleLogout = async () => {
    const supabase = getSupabaseClient();
    if (supabase) {
      await supabase.auth.signOut();
      setCurrentUser(null);
      notify('Anda telah keluar dari sesi administrator.');
    }
  };

  const handleSaveBook = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsProcessing(true);
    try {
      if (editingBookId) {
        await updateBook(editingBookId, {
          name: bookName,
          description: bookDesc,
          icon: bookIcon,
          color: bookColor,
        });
      } else {
        const created = await createBook({
          name: bookName,
          description: bookDesc,
          icon: bookIcon,
          color: bookColor,
        });
        setSelectedBookId(created.id);
      }
      const refreshed = await fetchBooks();
      onUpdateBooks(refreshed);
      setShowBookForm(false);
      setEditingBookId(null);
      setBookName('');
      setBookDesc('');
      notify(editingBookId ? 'Mata pelajaran diperbarui di Supabase.' : 'Mata pelajaran baru disimpan ke Supabase.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan mata pelajaran.';
      setError(msg);
      if (msg.includes('row-level security') || msg.includes('permission denied')) {
        setIsLoginModalOpen(true);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteBook = async (book: Book) => {
    if (!window.confirm(`Hapus Buku "${book.name}" beserta seluruh isinya dari database cloud?`)) return;
    setError(null);
    setIsProcessing(true);
    try {
      await deleteBook(book.id);
      const refreshed = await fetchBooks();
      onUpdateBooks(refreshed);
      setSelectedBookId(refreshed[0]?.id || '');
      notify(`Buku "${book.name}" telah dihapus dari Supabase.`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal menghapus buku.';
      setError(msg);
      if (msg.includes('row-level security') || msg.includes('permission denied')) {
        setIsLoginModalOpen(true);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddChapter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBook) return;
    setError(null);
    setIsProcessing(true);
    try {
      await addChapter(
        selectedBook.id,
        { title: newChapterTitle, description: '' },
        selectedBook.chapters.length
      );
      const refreshed = await fetchBooks();
      onUpdateBooks(refreshed);
      setNewChapterTitle('');
      notify('BAB baru berhasil ditambahkan ke Supabase.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal menambahkan BAB.';
      setError(msg);
      if (msg.includes('row-level security') || msg.includes('permission denied')) {
        setIsLoginModalOpen(true);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMoveChapter = async (cIdx: number, dir: -1 | 1) => {
    if (!selectedBook) return;
    setError(null);
    try {
      await moveChapter(selectedBook.id, selectedBook.chapters, cIdx, dir);
      const refreshed = await fetchBooks();
      onUpdateBooks(refreshed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memindahkan posisi BAB.');
    }
  };

  const handleDeleteChapter = async (chapterId: string, chapterNumber: number) => {
    if (!window.confirm(`Hapus BAB ${chapterNumber} beserta seluruh subbab di dalamnya?`)) return;
    setError(null);
    setIsProcessing(true);
    try {
      await deleteChapter(chapterId);
      const refreshed = await fetchBooks();
      onUpdateBooks(refreshed);
      notify(`BAB ${chapterNumber} berhasil dihapus.`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal menghapus BAB.';
      setError(msg);
      if (msg.includes('row-level security') || msg.includes('permission denied')) {
        setIsLoginModalOpen(true);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveSubchapter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBook || !editingSub) return;
    setError(null);
    setIsProcessing(true);

    const targetCh = selectedBook.chapters.find((c) => c.id === editingSub.chapterId);
    if (!targetCh) {
      setError('BAB target tidak ditemukan.');
      setIsProcessing(false);
      return;
    }

    try {
      if (editingSub.subchapterId) {
        await updateSubchapter(editingSub.subchapterId, {
          title: editingSub.title,
          description: editingSub.description,
          content: editingSub.content,
          tags: [],
          changeSummary: 'Disunting manual oleh administrator',
          sourceMode: 'manual',
          currentVersionCount: editingSub.currentVersionCount || 1,
        });
      } else {
        await addSubchapter(
          selectedBook.id,
          editingSub.chapterId,
          {
            title: editingSub.title,
            description: editingSub.description,
            content: editingSub.content,
            tags: [],
            changeSummary: 'Materi baru dibuat manual',
            sourceMode: 'manual',
          },
          targetCh.subchapters.length,
          targetCh.number
        );
      }
      const refreshed = await fetchBooks();
      onUpdateBooks(refreshed);
      setEditingSub(null);
      notify('Materi subbab berhasil disimpan ke Supabase.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan materi subbab.';
      setError(msg);
      if (msg.includes('row-level security') || msg.includes('permission denied')) {
        setIsLoginModalOpen(true);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteSubchapter = async (subchapterId: string, subTitle: string) => {
    if (!window.confirm(`Hapus materi "${subTitle}" dari database?`)) return;
    setError(null);
    setIsProcessing(true);
    try {
      await deleteSubchapter(subchapterId);
      const refreshed = await fetchBooks();
      onUpdateBooks(refreshed);
      notify(`Materi "${subTitle}" berhasil dihapus.`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal menghapus subbab.';
      setError(msg);
      if (msg.includes('row-level security') || msg.includes('permission denied')) {
        setIsLoginModalOpen(true);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRestoreVersion = async (
    sub: Subchapter,
    ver: SubchapterVersion
  ) => {
    setError(null);
    setIsProcessing(true);
    try {
      await restoreSubchapterVersion(sub.id, ver, sub.versions.length);
      const refreshed = await fetchBooks();
      onUpdateBooks(refreshed);
      notify(`Materi ${sub.code} dipulihkan ke Versi ${ver.versionNumber}.`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal memulihkan versi materi.';
      setError(msg);
      if (msg.includes('row-level security') || msg.includes('permission denied')) {
        setIsLoginModalOpen(true);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddReference = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBook) return;
    setError(null);
    setIsProcessing(true);
    try {
      await saveReference(selectedBook.id, {
        title: refTitle,
        author: refAuthor,
        year: refYear,
        publisherOrUrl: refPublisher,
      });
      const refreshed = await fetchBooks();
      onUpdateBooks(refreshed);
      setRefTitle('');
      setRefAuthor('');
      setRefYear('');
      setRefPublisher('');
      notify('Referensi ditambahkan ke Supabase.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan referensi.';
      setError(msg);
      if (msg.includes('row-level security') || msg.includes('permission denied')) {
        setIsLoginModalOpen(true);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteReference = async (refId: string) => {
    setError(null);
    setIsProcessing(true);
    try {
      await deleteReference(refId);
      const refreshed = await fetchBooks();
      onUpdateBooks(refreshed);
      notify('Referensi berhasil dihapus.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal menghapus referensi.';
      setError(msg);
      if (msg.includes('row-level security') || msg.includes('permission denied')) {
        setIsLoginModalOpen(true);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSeedInitialLibrary = async () => {
    if (!window.confirm('Sinkronkan seluruh buku kurikulum awal ke database Supabase Cloud?')) return;
    setError(null);
    setIsProcessing(true);
    try {
      await seedInitialLibraryToSupabase();
      const refreshed = await fetchBooks();
      onUpdateBooks(refreshed);
      notify('Buku kurikulum standar berhasil disinkronkan ke Supabase Cloud.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal menyinkronkan buku kurikulum.';
      setError(msg);
      if (msg.includes('row-level security') || msg.includes('permission denied')) {
        setIsLoginModalOpen(true);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 pb-24 sm:px-6 lg:px-8">
      {/* Header with Admin Auth Status */}
      <header className="flex flex-col justify-between gap-4 border-b border-neutral-200 pb-6 sm:flex-row sm:items-center dark:border-neutral-800">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-neutral-950 dark:text-white">
            Dashboard
          </h1>
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            Kelola buku pelajaran, tambahkan materi baru, dan pantau riwayat perubahan di Supabase Cloud.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {currentUser ? (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200">
              <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span className="font-semibold">{currentUser.email}</span>
              <button
                type="button"
                onClick={handleLogout}
                className="ml-1 inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:underline dark:text-emerald-300"
                title="Keluar dari akun admin"
              >
                <LogOut className="h-3 w-3" />
                Keluar
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsLoginModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-300 bg-neutral-50 px-3 py-1.5 text-xs font-semibold text-neutral-800 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
            >
              <Lock className="h-3.5 w-3.5 text-yellow-500" />
              Masuk sebagai Admin
            </button>
          )}

          {books.length === 0 && (
            <button
              type="button"
              onClick={handleSeedInitialLibrary}
              disabled={isProcessing}
              className="rounded-xl bg-yellow-400 px-3 py-1.5 text-xs font-bold text-neutral-950 hover:bg-yellow-300 disabled:opacity-50"
            >
              Sinkronkan Buku Standar ke Cloud
            </button>
          )}
        </div>
      </header>

      {notice && (
        <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs font-medium text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200">
          {notice}
        </div>
      )}
      {error && (
        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs font-medium text-red-900 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
          {error}
        </div>
      )}

      {/* 3 Simplified Task-Based Tabs */}
      <nav className="mt-6 flex items-center gap-1 border-b border-neutral-200 dark:border-neutral-800">
        {(
          [
            { id: 'buku', label: 'Buku Pelajaran' },
            { id: 'tambah-materi', label: 'Tambah Materi' },
            { id: 'riwayat', label: 'Riwayat' },
          ] as const
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`border-b-2 px-4 py-3 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              tab === item.id
                ? 'border-yellow-400 text-neutral-950 dark:text-white'
                : 'border-transparent text-neutral-500 hover:text-neutral-950 dark:text-neutral-400 dark:hover:text-white'
            }`}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {/* TAB 1: BUKU PELAJARAN */}
      {tab === 'buku' && (
        <div className="mt-8 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-neutral-950 dark:text-white">
              Daftar Mata Pelajaran ({books.length})
            </h2>
            <button
              type="button"
              onClick={() => {
                setEditingBookId(null);
                setBookName('');
                setBookDesc('');
                setShowBookForm(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-yellow-400 px-4 py-2 text-xs font-bold text-neutral-950 hover:bg-yellow-300"
            >
              <Plus className="h-4 w-4" />
              Tambah Mata Pelajaran
            </button>
          </div>

          {showBookForm && (
            <form
              onSubmit={handleSaveBook}
              className="grid grid-cols-1 gap-4 rounded-xl border border-neutral-200 bg-neutral-50 p-5 sm:grid-cols-2 dark:border-neutral-800 dark:bg-neutral-900"
            >
              <input
                type="text"
                required
                value={bookName}
                onChange={(e) => setBookName(e.target.value)}
                placeholder="Nama Mata Pelajaran *"
                className="h-10 rounded-lg border border-neutral-300 bg-white px-3 text-sm text-neutral-950 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white"
              />
              <select
                value={bookIcon}
                onChange={(e) => setBookIcon(e.target.value)}
                className="h-10 rounded-lg border border-neutral-300 bg-white px-3 text-sm text-neutral-950 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white"
              >
                {SUBJECT_ICON_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={bookDesc}
                onChange={(e) => setBookDesc(e.target.value)}
                placeholder="Deskripsi singkat (opsional)"
                className="h-10 rounded-lg border border-neutral-300 bg-white px-3 text-sm text-neutral-950 sm:col-span-2 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white"
              />
              <div className="flex items-center gap-3 sm:col-span-2">
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="rounded-lg bg-yellow-400 px-4 py-2 text-xs font-bold text-neutral-950 hover:bg-yellow-300 disabled:opacity-50"
                >
                  {isProcessing ? 'Menyimpan...' : 'Simpan ke Supabase'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowBookForm(false)}
                  className="text-xs font-semibold text-neutral-500"
                >
                  Batal
                </button>
              </div>
            </form>
          )}

          {books.length === 0 ? (
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-8 text-center dark:border-neutral-800 dark:bg-neutral-900/40">
              <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                Belum ada buku pelajaran di database Supabase Cloud.
              </p>
              <p className="mt-1 text-xs text-neutral-500">
                Tambahkan mata pelajaran baru di atas atau sinkronkan buku kurikulum standar awal.
              </p>
              <button
                type="button"
                onClick={handleSeedInitialLibrary}
                disabled={isProcessing}
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-yellow-400 px-4 py-2 text-xs font-bold text-neutral-950 hover:bg-yellow-300 disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                Sinkronkan Buku Standar Awal
              </button>
            </div>
          ) : (
            <div className="divide-y divide-neutral-200 border-y border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
              {books.map((book) => (
                <div
                  key={book.id}
                  className="flex flex-wrap items-center justify-between gap-4 py-4"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-neutral-950"
                      style={{ backgroundColor: book.color || '#FACC15' }}
                    >
                      <SubjectIcon name={book.icon} className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="font-bold text-neutral-950 dark:text-white">{book.name}</p>
                      <p className="text-xs text-neutral-500 tabular-nums dark:text-neutral-400">
                        {book.chapters.length} BAB · Diperbarui {formatDate(book.updatedAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onNavigate({ page: 'book', slug: book.slug })}
                      className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200"
                    >
                      <BookOpen className="h-3.5 w-3.5" />
                      Lihat Buku
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingBookId(book.id);
                        setBookName(book.name);
                        setBookDesc(book.description);
                        setBookIcon(book.icon);
                        setBookColor(book.color);
                        setShowBookForm(true);
                      }}
                      className="rounded-lg border border-neutral-200 p-1.5 text-neutral-600 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300"
                      aria-label="Edit mata pelajaran"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteBook(book)}
                      className="rounded-lg border border-red-200 p-1.5 text-red-600 hover:bg-red-50 dark:border-red-900/50 dark:text-red-400"
                      aria-label="Hapus mata pelajaran"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: TAMBAH MATERI */}
      {tab === 'tambah-materi' && (
        <div className="mt-8 space-y-10">
          {/* Primary AI Input Actions */}
          <div>
            <h2 className="text-base font-bold text-neutral-950 dark:text-white">
              Tambah Materi Otomatis dengan AI
            </h2>
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
              Pilih cara memasukkan catatan. AI akan menata BAB dan subbab secara otomatis dan menyimpannya ke Supabase.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() =>
                  onNavigate({
                    page: 'scan',
                    preselectedBookId: selectedBook?.id,
                    initialMode: 'camera',
                  })
                }
                className="inline-flex items-center gap-2 rounded-lg bg-yellow-400 px-4 py-2.5 text-xs font-bold text-neutral-950 hover:bg-yellow-300"
              >
                <Camera className="h-4 w-4" />
                Scan Camera
              </button>
              <button
                type="button"
                onClick={() =>
                  onNavigate({
                    page: 'scan',
                    preselectedBookId: selectedBook?.id,
                    initialMode: 'file',
                  })
                }
                className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-xs font-semibold text-neutral-900 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
              >
                <Upload className="h-4 w-4" />
                Upload File
              </button>
              <button
                type="button"
                onClick={() =>
                  onNavigate({
                    page: 'scan',
                    preselectedBookId: selectedBook?.id,
                    initialMode: 'text',
                  })
                }
                className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-xs font-semibold text-neutral-900 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
              >
                <ClipboardType className="h-4 w-4" />
                Tempel Catatan
              </button>
            </div>
          </div>

          {/* Secondary Manual Controls */}
          <div className="space-y-5 border-t border-neutral-200 pt-8 dark:border-neutral-800">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-neutral-950 dark:text-white">
                  Pengelolaan Manual (Opsional)
                </h2>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Atur BAB, materi manual, atau daftar pustaka pada buku yang dipilih.
                </p>
              </div>
              <select
                value={selectedBook?.id || ''}
                onChange={(e) => {
                  setSelectedBookId(e.target.value);
                  setEditingSub(null);
                }}
                className="h-9 rounded-lg border border-neutral-300 bg-white px-3 text-xs font-semibold text-neutral-950 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white"
              >
                {books.map((b) => (
                  <option key={b.id} value={b.id}>
                    Buku {b.name}
                  </option>
                ))}
              </select>
            </div>

            {selectedBook && (
              <>
                {editingSub ? (
                  <form onSubmit={handleSaveSubchapter} className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-neutral-950 dark:text-white">
                        {editingSub.subchapterId ? 'Edit Materi' : 'Tambah Materi Manual'}
                      </h3>
                      <button
                        type="button"
                        onClick={() => setEditingSub(null)}
                        className="text-xs font-semibold text-neutral-500"
                      >
                        Batal
                      </button>
                    </div>
                    <input
                      type="text"
                      required
                      value={editingSub.title}
                      onChange={(e) => setEditingSub({ ...editingSub, title: e.target.value })}
                      placeholder="Judul materi *"
                      className="h-10 w-full rounded-lg border border-neutral-300 bg-white px-3 text-sm font-semibold text-neutral-950 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white"
                    />
                    <StructuredEditor
                      blocks={editingSub.content}
                      onChange={(blocks) => setEditingSub({ ...editingSub, content: blocks })}
                    />
                    <button
                      type="submit"
                      disabled={isProcessing}
                      className="rounded-lg bg-yellow-400 px-5 py-2.5 text-xs font-bold text-neutral-950 hover:bg-yellow-300 disabled:opacity-50"
                    >
                      {isProcessing ? 'Menyimpan...' : 'Simpan Materi ke Supabase'}
                    </button>
                  </form>
                ) : (
                  <>
                    <form onSubmit={handleAddChapter} className="flex gap-2.5">
                      <input
                        type="text"
                        required
                        value={newChapterTitle}
                        onChange={(e) => setNewChapterTitle(e.target.value)}
                        placeholder="Tambah BAB baru..."
                        className="h-9 flex-1 rounded-lg border border-neutral-300 bg-white px-3 text-xs text-neutral-950 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white"
                      />
                      <button
                        type="submit"
                        disabled={isProcessing}
                        className="h-9 rounded-lg bg-neutral-950 px-4 text-xs font-semibold text-white hover:bg-neutral-800 disabled:opacity-50 dark:bg-yellow-400 dark:text-neutral-950"
                      >
                        {isProcessing ? '...' : '+ BAB'}
                      </button>
                    </form>

                    <div className="divide-y divide-neutral-200 border-y border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
                      {selectedBook.chapters.map((ch, cIdx) => (
                        <div key={ch.id} className="py-4">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-bold text-neutral-950 dark:text-white">
                              BAB {ch.number} — {ch.title}
                            </p>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() =>
                                  setEditingSub({
                                    chapterId: ch.id,
                                    subchapterId: null,
                                    title: '',
                                    description: '',
                                    content: [{ id: generateBlockId(), type: 'paragraph', text: '' }],
                                  })
                                }
                                className="rounded border border-neutral-200 px-2.5 py-1 text-xs font-semibold text-neutral-700 dark:border-neutral-700 dark:text-neutral-200"
                              >
                                + Materi
                              </button>
                              <button
                                type="button"
                                disabled={cIdx === 0}
                                onClick={() => handleMoveChapter(cIdx, -1)}
                                className="rounded p-1 text-neutral-500 disabled:opacity-30"
                              >
                                <ArrowUp className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={cIdx === selectedBook.chapters.length - 1}
                                onClick={() => handleMoveChapter(cIdx, 1)}
                                className="rounded p-1 text-neutral-500 disabled:opacity-30"
                              >
                                <ArrowDown className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteChapter(ch.id, ch.number)}
                                className="rounded p-1 text-red-600 dark:text-red-400"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>

                          {ch.subchapters.length > 0 && (
                            <div className="mt-2 space-y-1.5 pl-4">
                              {ch.subchapters.map((sub: Subchapter) => (
                                <div
                                  key={sub.id}
                                  className="flex items-center justify-between gap-3 py-1 text-xs"
                                >
                                  <span className="text-neutral-700 dark:text-neutral-300">
                                    <span className="mr-2 font-mono text-neutral-400">
                                      {sub.code}
                                    </span>
                                    {sub.title}
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setEditingSub({
                                          chapterId: ch.id,
                                          subchapterId: sub.id,
                                          title: sub.title,
                                          description: sub.description,
                                          content: sub.content,
                                          currentVersionCount: sub.versions.length,
                                        })
                                      }
                                      className="font-semibold text-neutral-600 hover:underline dark:text-neutral-300"
                                    >
                                      Edit
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteSubchapter(sub.id, sub.title)}
                                      className="font-semibold text-red-600 hover:underline dark:text-red-400"
                                    >
                                      Hapus
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Daftar Pustaka */}
                    <div className="space-y-3 pt-4">
                      <h3 className="text-sm font-bold text-neutral-950 dark:text-white">
                        Daftar Pustaka ({selectedBook.references.length})
                      </h3>
                      <form
                        onSubmit={handleAddReference}
                        className="grid grid-cols-1 gap-2.5 sm:grid-cols-4"
                      >
                        <input
                          type="text"
                          required
                          value={refTitle}
                          onChange={(e) => setRefTitle(e.target.value)}
                          placeholder="Judul sumber *"
                          className="h-9 rounded-lg border border-neutral-300 bg-white px-3 text-xs text-neutral-950 sm:col-span-2 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white"
                        />
                        <input
                          type="text"
                          value={refAuthor}
                          onChange={(e) => setRefAuthor(e.target.value)}
                          placeholder="Penulis"
                          className="h-9 rounded-lg border border-neutral-300 bg-white px-3 text-xs text-neutral-950 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white"
                        />
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={refYear}
                            onChange={(e) => setRefYear(e.target.value)}
                            placeholder="Tahun"
                            className="h-9 w-20 rounded-lg border border-neutral-300 bg-white px-2.5 text-xs text-neutral-950 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white"
                          />
                          <button
                            type="submit"
                            disabled={isProcessing}
                            className="h-9 flex-1 rounded-lg bg-yellow-400 px-3 text-xs font-bold text-neutral-950 hover:bg-yellow-300 disabled:opacity-50"
                          >
                            {isProcessing ? '...' : 'Tambah'}
                          </button>
                        </div>
                      </form>
                      {selectedBook.references.length > 0 && (
                        <ul className="divide-y divide-neutral-200 text-xs dark:divide-neutral-800">
                          {selectedBook.references.map((ref) => (
                            <li
                              key={ref.id}
                              className="flex items-center justify-between gap-3 py-2"
                            >
                              <span className="text-neutral-700 dark:text-neutral-300">
                                {ref.title}
                                {ref.author ? ` — ${ref.author}` : ''}
                                {ref.year ? ` (${ref.year})` : ''}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleDeleteReference(ref.id)}
                                className="text-red-600 hover:underline dark:text-red-400"
                              >
                                Hapus
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: RIWAYAT */}
      {tab === 'riwayat' && (
        <div className="mt-8 space-y-10">
          {/* Riwayat Analisis */}
          <div>
            <h2 className="text-base font-bold text-neutral-950 dark:text-white">
              Riwayat Analisis Catatan (Supabase Cloud)
            </h2>
            {scanHistory.length === 0 ? (
              <p className="mt-2 text-xs text-neutral-500">
                Belum ada riwayat analisis catatan di database cloud.
              </p>
            ) : (
              <div className="mt-3 divide-y divide-neutral-200 border-y border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
                {scanHistory.map((item) => (
                  <div key={item.id} className="py-3.5 text-xs">
                    <p className="font-semibold text-neutral-950 dark:text-white">
                      {item.bookName} · {formatDate(item.createdAt)}
                    </p>
                    <p className="mt-0.5 text-neutral-600 dark:text-neutral-400">{item.summary}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Riwayat Perubahan & Versi Sebelumnya */}
          {selectedBook && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-base font-bold text-neutral-950 dark:text-white">
                  Riwayat Versi Materi
                </h2>
                <select
                  value={selectedBook.id}
                  onChange={(e) => setSelectedBookId(e.target.value)}
                  className="h-9 rounded-lg border border-neutral-300 bg-white px-3 text-xs font-semibold text-neutral-950 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white"
                >
                  {books.map((b) => (
                    <option key={b.id} value={b.id}>
                      Buku {b.name}
                    </option>
                  ))}
                </select>
              </div>

              {selectedBook.chapters.flatMap((ch) =>
                ch.subchapters.flatMap((sub) =>
                  sub.versions.map((ver: SubchapterVersion) => ({
                    chapterId: ch.id,
                    subchapter: sub,
                    version: ver,
                  }))
                )
              ).length === 0 ? (
                <p className="text-xs text-neutral-500">
                  Belum ada riwayat versi sebelumnya pada buku ini.
                </p>
              ) : (
                <div className="divide-y divide-neutral-200 border-y border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
                  {selectedBook.chapters.flatMap((ch) =>
                    ch.subchapters.flatMap((sub) =>
                      sub.versions.map((ver) => (
                        <div
                          key={ver.id}
                          className="flex flex-wrap items-center justify-between gap-4 py-3.5 text-xs"
                        >
                          <div>
                            <p className="font-semibold text-neutral-950 dark:text-white">
                              <History className="mr-1.5 inline h-3.5 w-3.5 text-yellow-500" />
                              {sub.code} {sub.title} · Versi {ver.versionNumber}
                            </p>
                            <p className="mt-0.5 text-neutral-500">
                              {ver.changeSummary} · {formatDate(ver.createdAt)}
                            </p>
                          </div>
                          {ver.content.length > 0 && (
                            <button
                              type="button"
                              onClick={() => handleRestoreVersion(sub, ver)}
                              disabled={isProcessing}
                              className="inline-flex items-center gap-1 rounded-lg bg-yellow-400 px-3 py-1.5 font-bold text-neutral-950 hover:bg-yellow-300 disabled:opacity-50"
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                              Pulihkan
                            </button>
                          )}
                        </div>
                      ))
                    )
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Admin Login Modal */}
      <AdminLoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onSuccess={(email) => {
          notify(`Selamat datang, ${email}! Akses administrator telah diverifikasi.`);
        }}
      />
    </div>
  );
}
