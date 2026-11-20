import { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Camera,
  CheckCircle2,
  ClipboardType,
  FileText,
  Pencil,
  Plus,
  RefreshCw,
  ScanLine,
  Trash2,
  Upload,
} from 'lucide-react';
import { AutoStructuringProposal, Book } from '../types/textbook';
import { INTEGRATION_CONFIG } from '../config/integrations';
import {
  UnifiedSourceType,
  analyzeUnifiedInput,
  applyAutoStructuringProposal,
} from '../services/noteAnalysisService';
import { createBook, fetchBooks } from '../services/bookStore';
import { ParsedUploadFile, parseUploadedFile } from '../lib/fileReader';
import { CameraCapturePanel } from '../components/CameraCapturePanel';
import { RichContentRenderer } from '../components/RichContentRenderer';
import { StructuredEditor } from '../components/StructuredEditor';
import { ActiveRoute } from '../components/Header';

interface CameraPhoto {
  id: string;
  file: File;
  previewUrl: string;
}

interface ScanCatatanPageProps {
  books: Book[];
  preselectedBookId?: string;
  initialMode?: UnifiedSourceType;
  onUpdateBooks: (books: Book[]) => void;
  onNavigate: (route: ActiveRoute) => void;
}

export function ScanCatatanPage({
  books,
  preselectedBookId,
  initialMode = 'camera',
  onUpdateBooks,
  onNavigate,
}: ScanCatatanPageProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraPhotosRef = useRef<CameraPhoto[]>([]);
  const uploadedFilesRef = useRef<ParsedUploadFile[]>([]);

  const [sourceType, setSourceType] = useState<UnifiedSourceType>(initialMode);

  // 1. Scan Camera state
  const [cameraPhotos, setCameraPhotos] = useState<CameraPhoto[]>([]);
  const [showCameraPermissionDialog, setShowCameraPermissionDialog] = useState(false);
  const [cameraDeclinedNotice, setCameraDeclinedNotice] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);

  // 2. Upload File state (PDF, DOCX, TXT, JPG, PNG, WEBP)
  const [uploadedFiles, setUploadedFiles] = useState<ParsedUploadFile[]>([]);

  // 3. Tempel Catatan state
  const [pastedTitle, setPastedTitle] = useState('');
  const [pastedText, setPastedText] = useState('');

  // Shared target book & analysis state
  const [selectedBookId, setSelectedBookId] = useState<string>(preselectedBookId || '');
  const [showNewBookInline, setShowNewBookInline] = useState(false);
  const [newBookName, setNewBookName] = useState('');
  const [newBookDesc, setNewBookDesc] = useState('');

  const [analyzing, setAnalyzing] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [proposal, setProposal] = useState<AutoStructuringProposal | null>(null);
  const [editingSubId, setEditingSubId] = useState<string | null>(null);

  cameraPhotosRef.current = cameraPhotos;
  uploadedFilesRef.current = uploadedFiles;

  useEffect(() => {
    setSourceType(initialMode);
  }, [initialMode]);

  useEffect(() => {
    return () => {
      cameraPhotosRef.current.forEach((p) => URL.revokeObjectURL(p.previewUrl));
      uploadedFilesRef.current.forEach((f) => {
        if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
      });
    };
  }, []);

  const maxPhotos = INTEGRATION_CONFIG.limits.maxScanPhotos;
  const remainingCameraSlots = Math.max(0, maxPhotos - cameraPhotos.length);
  const isCameraAtLimit = cameraPhotos.length >= maxPhotos;

  const wordCount = pastedText.trim() ? pastedText.trim().split(/\s+/).length : 0;

  const hasValidInput =
    sourceType === 'camera'
      ? cameraPhotos.length > 0
      : sourceType === 'file'
        ? uploadedFiles.length > 0
        : pastedText.trim().length >= 10;

  const currentStep = proposal ? 3 : selectedBookId && hasValidInput ? 2 : 1;

  // Camera handlers
  const handleAddCameraFile = (file: File) => {
    setError(null);
    if (cameraPhotos.length >= maxPhotos) {
      setError(`Maksimal ${maxPhotos} foto dalam satu proses analisis.`);
      return;
    }
    setCameraPhotos((prev) => [
      ...prev,
      {
        id: `cam_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        file,
        previewUrl: URL.createObjectURL(file),
      },
    ]);
  };

  const removeCameraPhoto = (id: string) => {
    setCameraPhotos((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((p) => p.id !== id);
    });
  };

  const moveCameraPhoto = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= cameraPhotos.length) return;
    const next = [...cameraPhotos];
    [next[index], next[target]] = [next[target], next[index]];
    setCameraPhotos(next);
  };

  // Upload File handlers
  const handleFilesSelected = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setError(null);
    const incoming = Array.from(fileList);
    if (uploadedFiles.length + incoming.length > maxPhotos) {
      setError(`Maksimal ${maxPhotos} file dalam satu kali analisis.`);
      return;
    }

    const parsedList: ParsedUploadFile[] = [];
    for (const file of incoming) {
      try {
        const parsed = await parseUploadedFile(file);
        parsedList.push(parsed);
      } catch (err) {
        setError(err instanceof Error ? err.message : `Gagal membaca file ${file.name}.`);
      }
    }
    if (parsedList.length > 0) {
      setUploadedFiles((prev) => [...prev, ...parsedList]);
    }
  };

  const removeUploadedFile = (id: string) => {
    setUploadedFiles((prev) => {
      const target = prev.find((f) => f.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((f) => f.id !== id);
    });
  };

  const handleQuickCreateBook = async () => {
    setError(null);
    try {
      const created = await createBook({
        name: newBookName,
        description: newBookDesc,
        icon: 'BookOpen',
        color: '#FACC15',
      });
      const refreshed = await fetchBooks();
      onUpdateBooks(refreshed);
      setSelectedBookId(created.id);
      setNewBookName('');
      setNewBookDesc('');
      setShowNewBookInline(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal membuat mata pelajaran baru.');
    }
  };

  const handleAnalyze = async () => {
    setError(null);
    setSuccessMsg(null);
    if (!hasValidInput) {
      setError(
        sourceType === 'camera'
          ? 'Ambil minimal 1 foto catatan terlebih dahulu.'
          : sourceType === 'file'
            ? 'Unggah minimal 1 file materi terlebih dahulu.'
            : 'Tulis atau tempel minimal 10 karakter catatan.'
      );
      return;
    }
    const targetBook = books.find((b) => b.id === selectedBookId);
    if (!targetBook) {
      setError('Pilih mata pelajaran tujuan sebelum memulai analisis.');
      return;
    }

    setCameraOpen(false);
    setAnalyzing(true);
    try {
      const result = await analyzeUnifiedInput({
        sourceType,
        book: targetBook,
        files:
          sourceType === 'camera'
            ? cameraPhotos.map((p) => p.file)
            : sourceType === 'file'
              ? uploadedFiles.map((f) => f.file)
              : [],
        extractedTexts:
          sourceType === 'file'
            ? uploadedFiles.map((f) => f.extractedText || '').filter(Boolean)
            : [],
        textContent: sourceType === 'text' ? pastedText : undefined,
        optionalTitle: sourceType === 'text' ? pastedTitle : undefined,
      });
      setProposal(result);
      setEditingSubId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menganalisis materi.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleApproveAll = async () => {
    if (!proposal) return;
    setApplying(true);
    setError(null);
    try {
      const updatedBooks = await applyAutoStructuringProposal(books, proposal);
      onUpdateBooks(updatedBooks);
      const targetBook = updatedBooks.find((b) => b.id === proposal.bookId);
      setProposal(null);
      cameraPhotos.forEach((p) => URL.revokeObjectURL(p.previewUrl));
      uploadedFiles.forEach((f) => {
        if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
      });
      setCameraPhotos([]);
      setUploadedFiles([]);
      setPastedText('');
      setPastedTitle('');
      setSuccessMsg(`Susunan materi berhasil disimpan ke Supabase Cloud untuk Buku ${proposal.bookName}.`);
      if (targetBook) {
        setTimeout(() => onNavigate({ page: 'book', slug: targetBook.slug }), 700);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan perubahan ke database Supabase Cloud.');
    } finally {
      setApplying(false);
    }
  };

  const updateProposedSubchapter = (
    planId: string,
    subId: string,
    patch: {
      title?: string;
      proposedContent?: AutoStructuringProposal['chapterPlans'][0]['subchapters'][0]['proposedContent'];
    }
  ) => {
    if (!proposal) return;
    setProposal({
      ...proposal,
      chapterPlans: proposal.chapterPlans.map((plan) =>
        plan.id !== planId
          ? plan
          : {
              ...plan,
              subchapters: plan.subchapters.map((sub) =>
                sub.id === subId ? { ...sub, ...patch } : sub
              ),
            }
      ),
    });
  };

  const removeProposedSubchapter = (planId: string, subId: string) => {
    if (!proposal) return;
    const nextPlans = proposal.chapterPlans
      .map((plan) => {
        if (plan.id !== planId) return plan;
        return {
          ...plan,
          subchapters: plan.subchapters.filter((s) => s.id !== subId),
        };
      })
      .filter((plan) => plan.subchapters.length > 0);

    if (nextPlans.length === 0) {
      setProposal(null);
    } else {
      setProposal({
        ...proposal,
        chapterPlans: nextPlans,
      });
    }
  };

  const removeProposedChapter = (planId: string) => {
    if (!proposal) return;
    const nextPlans = proposal.chapterPlans.filter((plan) => plan.id !== planId);
    if (nextPlans.length === 0) {
      setProposal(null);
    } else {
      setProposal({
        ...proposal,
        chapterPlans: nextPlans,
      });
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 pb-24 sm:px-6 lg:px-8">
      {/* Header & Stepper */}
      <header className="border-b border-neutral-200 pb-6 dark:border-neutral-800">
        <h1 className="text-3xl font-extrabold tracking-tight text-neutral-950 dark:text-white">
          Scan & Tambah Catatan
        </h1>
        <p className="mt-1.5 text-sm text-neutral-600 dark:text-neutral-400">
          Pilih salah satu metode input di bawah. Seluruh materi akan dianalisis dan ditata otomatis ke dalam BAB dan subbab.
        </p>

        <ol className="mt-6 grid grid-cols-3 gap-2 text-xs">
          {[
            { num: 1, label: 'Masukkan Materi' },
            { num: 2, label: 'Pilih Mata Pelajaran' },
            { num: 3, label: 'Periksa & Terapkan' },
          ].map((step) => {
            const active = currentStep === step.num;
            const done = currentStep > step.num;
            return (
              <li
                key={step.num}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 font-semibold ${
                  active
                    ? 'border-neutral-950 bg-yellow-400 text-neutral-950 dark:border-yellow-400'
                    : done
                      ? 'border-neutral-200 bg-neutral-100 text-neutral-900 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200'
                      : 'border-neutral-200 text-neutral-400 dark:border-neutral-800 dark:text-neutral-500'
                }`}
              >
                <span className="tabular-nums">{step.num}.</span>
                <span className="truncate">{step.label}</span>
              </li>
            );
          })}
        </ol>
      </header>

      {error && (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </div>
      )}

      {successMsg && (
        <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200">
          {successMsg}
        </div>
      )}

      {!proposal ? (
        <div className="mt-8 space-y-8">
          {/* 3 UNIFIED INPUT METHODS */}
          <section className="space-y-6">
            <div className="flex flex-wrap items-center gap-1 border-b border-neutral-200 dark:border-neutral-800">
              {(
                [
                  { id: 'camera', label: 'Scan Camera', icon: <Camera className="h-4 w-4" /> },
                  { id: 'file', label: 'Upload File', icon: <Upload className="h-4 w-4" /> },
                  {
                    id: 'text',
                    label: 'Tempel Catatan',
                    icon: <ClipboardType className="h-4 w-4" />,
                  },
                ] as const
              ).map((tab) => {
                const active = sourceType === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      if (tab.id !== 'camera') setCameraOpen(false);
                      setSourceType(tab.id);
                      setError(null);
                    }}
                    className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                      active
                        ? 'border-yellow-400 text-neutral-950 dark:text-white'
                        : 'border-transparent text-neutral-500 hover:text-neutral-950 dark:text-neutral-400 dark:hover:text-white'
                    }`}
                  >
                    {tab.icon}
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* METHOD A: SCAN CAMERA */}
            {sourceType === 'camera' && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs text-neutral-500 tabular-nums dark:text-neutral-400">
                    {cameraPhotos.length} dari {maxPhotos} foto diambil
                  </p>
                  <button
                    type="button"
                    disabled={isCameraAtLimit}
                    onClick={() => {
                      if (cameraOpen) {
                        setCameraOpen(false);
                      } else {
                        setCameraDeclinedNotice(false);
                        setShowCameraPermissionDialog(true);
                      }
                    }}
                    className="inline-flex items-center gap-2 rounded-lg bg-yellow-400 px-4 py-2.5 text-xs font-bold text-neutral-950 transition-colors hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Camera className="h-4 w-4" />
                    {cameraOpen ? 'Tutup Kamera' : 'Buka Kamera'}
                  </button>
                </div>

                {cameraDeclinedNotice && (
                  <p className="rounded-lg border border-neutral-200 bg-neutral-50 px-3.5 py-2.5 text-xs text-neutral-700 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300">
                    Akses kamera tidak diberikan. Kamu dapat beralih ke tab <strong>Upload File</strong> atau <strong>Tempel Catatan</strong>.
                  </p>
                )}

                {cameraOpen && (
                  <CameraCapturePanel
                    remainingSlots={remainingCameraSlots}
                    onCaptureFile={handleAddCameraFile}
                    onClose={() => setCameraOpen(false)}
                    onSwitchToUpload={() => {
                      setCameraOpen(false);
                      setSourceType('file');
                    }}
                  />
                )}

                {cameraPhotos.length === 0 && !cameraOpen ? (
                  <div className="rounded-xl border border-dashed border-neutral-300 py-10 text-center text-xs text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
                    Klik <strong>Buka Kamera</strong> untuk mengambil foto halaman buku catatan secara langsung.
                  </div>
                ) : (
                  cameraPhotos.length > 0 && (
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
                      {cameraPhotos.map((photo, idx) => (
                        <div
                          key={photo.id}
                          className="overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-950"
                        >
                          <img
                            src={photo.previewUrl}
                            alt={`Foto ${idx + 1}`}
                            className="h-32 w-full object-cover"
                          />
                          <div className="flex items-center justify-between px-2 py-1.5 text-xs">
                            <span className="font-semibold tabular-nums text-neutral-700 dark:text-neutral-300">
                              Hal. {idx + 1}
                            </span>
                            <div className="flex items-center gap-0.5">
                              <button
                                type="button"
                                onClick={() => moveCameraPhoto(idx, -1)}
                                disabled={idx === 0}
                                className="rounded p-1 text-neutral-500 hover:bg-neutral-200 disabled:opacity-30 dark:hover:bg-neutral-800"
                              >
                                <ArrowUp className="h-3 w-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => moveCameraPhoto(idx, 1)}
                                disabled={idx === cameraPhotos.length - 1}
                                className="rounded p-1 text-neutral-500 hover:bg-neutral-200 disabled:opacity-30 dark:hover:bg-neutral-800"
                              >
                                <ArrowDown className="h-3 w-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => removeCameraPhoto(photo.id)}
                                className="rounded p-1 text-red-600 hover:bg-red-50 dark:text-red-400"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                )}
              </div>
            )}

            {/* METHOD B: UPLOAD FILE */}
            {sourceType === 'file' && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                      Format didukung: PDF, DOCX, TXT, JPG, PNG, WEBP (maks. 10 MB/file, hingga {maxPhotos} file)
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={uploadedFiles.length >= maxPhotos}
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-2 rounded-lg bg-yellow-400 px-4 py-2.5 text-xs font-bold text-neutral-950 transition-colors hover:bg-yellow-300 disabled:opacity-50"
                  >
                    <Upload className="h-4 w-4" />
                    Pilih File
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.docx,.txt,.jpg,.jpeg,.png,.webp"
                    multiple
                    onChange={(e) => {
                      handleFilesSelected(e.target.files);
                      e.target.value = '';
                    }}
                    className="hidden"
                  />
                </div>

                {uploadedFiles.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-neutral-300 py-10 text-center text-xs text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
                    Belum ada file dipilih. Klik <strong>Pilih File</strong> untuk mengunggah dokumen atau foto materi.
                  </div>
                ) : (
                  <div className="divide-y divide-neutral-200 rounded-xl border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
                    {uploadedFiles.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-start justify-between gap-4 px-4 py-3.5 text-xs"
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          {item.previewUrl ? (
                            <img
                              src={item.previewUrl}
                              alt={item.name}
                              className="h-12 w-12 shrink-0 rounded-lg object-cover"
                            />
                          ) : (
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-700 dark:bg-neutral-900 dark:text-neutral-300">
                              <FileText className="h-4 w-4" />
                            </span>
                          )}
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-neutral-950 dark:text-white">
                              {item.name}
                            </p>
                            <p className="mt-0.5 text-neutral-500 tabular-nums">
                              {item.extension} · {item.sizeLabel}
                            </p>
                            <p className="mt-1 text-neutral-600 dark:text-neutral-400">
                              {item.statusNote}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeUploadedFile(item.id)}
                          aria-label="Hapus file"
                          className="rounded p-1.5 text-red-600 hover:bg-red-50 dark:text-red-400"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* METHOD C: TEMPEL CATATAN */}
            {sourceType === 'text' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                    Judul Catatan (Opsional)
                  </label>
                  <input
                    type="text"
                    value={pastedTitle}
                    onChange={(e) => setPastedTitle(e.target.value)}
                    placeholder="Boleh dikosongkan — AI akan menyimpulkan judulnya sendiri"
                    className="mt-1.5 h-10 w-full rounded-lg border border-neutral-300 bg-white px-3 text-sm text-neutral-950 focus:border-yellow-400 focus:outline-none dark:border-neutral-700 dark:bg-neutral-950 dark:text-white"
                  />
                </div>

                <div>
                  <textarea
                    rows={8}
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    placeholder="Tempel catatan pelajaran di sini. AI akan membantu memahami isi catatan, mengelompokkan materi, dan menyusunnya ke dalam buku pelajaran."
                    className="w-full rounded-xl border border-neutral-300 bg-white p-4 text-sm leading-relaxed text-neutral-950 focus:border-yellow-400 focus:outline-none dark:border-neutral-700 dark:bg-neutral-950 dark:text-white"
                  />
                  <div className="mt-2 flex items-center justify-between text-xs text-neutral-500 tabular-nums">
                    <span>
                      {wordCount} kata · {pastedText.length} karakter
                    </span>
                    {pastedText && (
                      <button
                        type="button"
                        onClick={() => {
                          setPastedText('');
                          setPastedTitle('');
                        }}
                        className="font-semibold text-red-600 hover:underline dark:text-red-400"
                      >
                        Hapus Isi
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* STEP 2: SELECT TARGET SUBJECT */}
          <section className="border-t border-neutral-200 pt-8 dark:border-neutral-800">
            <h2 className="text-base font-bold text-neutral-950 dark:text-white">
              Pilih Mata Pelajaran Tujuan
            </h2>
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
              Kamu cukup memilih mata pelajaran. Susunan BAB dan subbab akan diatur otomatis.
            </p>

            <div className="mt-4 max-w-md">
              <select
                value={selectedBookId}
                onChange={(e) => setSelectedBookId(e.target.value)}
                className="h-11 w-full rounded-lg border border-neutral-300 bg-white px-3 text-sm text-neutral-950 focus:border-yellow-400 focus:outline-none dark:border-neutral-700 dark:bg-neutral-950 dark:text-white"
              >
                <option value="">-- Pilih mata pelajaran --</option>
                {books.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.chapters.length} BAB)
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => setShowNewBookInline((v) => !v)}
                className="mt-2.5 inline-flex items-center gap-1 text-xs font-semibold text-neutral-700 hover:underline dark:text-yellow-400"
              >
                <Plus className="h-3.5 w-3.5" />
                Buat mata pelajaran baru
              </button>
            </div>

            {showNewBookInline && (
              <div className="mt-4 flex flex-col gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-4 sm:flex-row dark:border-neutral-800 dark:bg-neutral-950">
                <input
                  type="text"
                  value={newBookName}
                  onChange={(e) => setNewBookName(e.target.value)}
                  placeholder="Nama mata pelajaran"
                  className="h-9 flex-1 rounded-lg border border-neutral-300 bg-white px-3 text-xs text-neutral-950 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
                />
                <input
                  type="text"
                  value={newBookDesc}
                  onChange={(e) => setNewBookDesc(e.target.value)}
                  placeholder="Deskripsi singkat (opsional)"
                  className="h-9 flex-1 rounded-lg border border-neutral-300 bg-white px-3 text-xs text-neutral-950 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
                />
                <button
                  type="button"
                  onClick={handleQuickCreateBook}
                  className="h-9 rounded-lg bg-yellow-400 px-4 text-xs font-bold text-neutral-950 hover:bg-yellow-300"
                >
                  Simpan
                </button>
              </div>
            )}

            <div className="mt-6">
              <button
                type="button"
                onClick={handleAnalyze}
                disabled={analyzing || !hasValidInput || !selectedBookId}
                className="inline-flex items-center gap-2 rounded-lg bg-neutral-950 px-5 py-3 text-xs font-bold text-white transition-colors hover:bg-neutral-800 disabled:opacity-50 dark:bg-yellow-400 dark:text-neutral-950 dark:hover:bg-yellow-300"
              >
                <ScanLine className="h-4 w-4" />
                {analyzing ? 'Menganalisis & Menyusun Materi...' : 'Lanjutkan Analisis'}
              </button>
            </div>
          </section>
        </div>
      ) : (
        /* STEP 3: UNIFIED REVIEW & APPROVAL */
        <section className="mt-8 space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-neutral-200 pb-5 dark:border-neutral-800">
            <div>
              <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                Hasil Analisis Gemini AI
              </p>
              <h2 className="mt-1 text-xl font-extrabold text-neutral-950 dark:text-white">
                Usulan Susunan — {proposal.bookName}
              </h2>
              <p className="mt-1 text-sm text-neutral-700 dark:text-neutral-300">
                {proposal.plainLanguageSummary}
              </p>
            </div>
            <button
              type="button"
              onClick={handleAnalyze}
              className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-semibold text-neutral-800 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Analisis Ulang
            </button>
          </div>

          {proposal.unclearHandwritingItems.length > 0 && (
            <div className="rounded-xl border border-yellow-400/70 bg-yellow-50 p-4 text-xs dark:border-yellow-400/40 dark:bg-yellow-400/10">
              <p className="flex items-center gap-1.5 font-bold text-neutral-950 dark:text-yellow-300">
                <AlertTriangle className="h-4 w-4" />
                Bagian yang Perlu Diperiksa
              </p>
              <ul className="mt-1.5 list-disc space-y-1 pl-4 text-neutral-800 dark:text-yellow-100">
                {proposal.unclearHandwritingItems.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="space-y-6">
            {proposal.chapterPlans.map((plan) => (
              <div
                key={plan.id}
                className="space-y-3 border-b border-neutral-200 pb-6 dark:border-neutral-800"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                      {plan.action === 'create_new'
                        ? 'BAB Baru Diusulkan Otomatis'
                        : 'BAB Lama Dilengkapi'}
                    </p>
                    <h3 className="text-base font-bold text-neutral-950 dark:text-white">
                      {plan.chapterTitle}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeProposedChapter(plan.id)}
                    className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-950/30"
                    title="Tolak seluruh usulan untuk BAB ini"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Tolak BAB Ini
                  </button>
                </div>

                <div className="space-y-3">
                  {plan.subchapters.map((sub) => {
                    const isEditing = editingSubId === sub.id;
                    return (
                      <div
                        key={sub.id}
                        className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900/50"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="text-[11px] font-medium text-neutral-500">
                              {sub.action === 'update_existing'
                                ? 'Subbab Diperbarui'
                                : 'Subbab Baru'}
                            </p>
                            <h4 className="text-sm font-bold text-neutral-950 dark:text-white">
                              {sub.title}
                            </h4>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setEditingSubId(isEditing ? null : sub.id)}
                              className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200"
                            >
                              <Pencil className="h-3 w-3" />
                              {isEditing ? 'Selesai Edit' : 'Edit Hasil'}
                            </button>
                            <button
                              type="button"
                              onClick={() => removeProposedSubchapter(plan.id, sub.id)}
                              className="inline-flex items-center gap-1 rounded-lg border border-red-100 px-2 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 dark:border-red-900/40 dark:text-red-400"
                              title="Tolak usulan subbab ini"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>

                        {isEditing ? (
                          <div className="mt-4 space-y-3">
                            <input
                              type="text"
                              value={sub.title}
                              onChange={(e) =>
                                updateProposedSubchapter(plan.id, sub.id, {
                                  title: e.target.value,
                                })
                              }
                              className="h-9 w-full rounded-lg border border-neutral-300 bg-white px-3 text-sm font-semibold text-neutral-950 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white"
                            />
                            <StructuredEditor
                              blocks={sub.proposedContent}
                              onChange={(blocks) =>
                                updateProposedSubchapter(plan.id, sub.id, {
                                  proposedContent: blocks,
                                })
                              }
                            />
                          </div>
                        ) : (
                          <div className="mt-3 border-t border-neutral-100 pt-3 dark:border-neutral-800">
                            <RichContentRenderer blocks={sub.proposedContent} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={() => setProposal(null)}
              className="rounded-lg border border-red-200 px-4 py-2.5 text-xs font-semibold text-red-700 hover:bg-red-50 dark:border-red-900/50 dark:text-red-400"
            >
              Tolak Perubahan
            </button>
            <button
              type="button"
              onClick={handleApproveAll}
              disabled={applying}
              className="inline-flex items-center gap-2 rounded-lg bg-yellow-400 px-5 py-2.5 text-xs font-bold text-neutral-950 hover:bg-yellow-300 disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" />
              {applying ? 'Menyimpan ke Database Cloud...' : 'Terapkan Semua Perubahan'}
            </button>
          </div>
        </section>
      )}

      {/* IN-APP CAMERA PERMISSION DIALOG */}
      {showCameraPermissionDialog && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="camera-permission-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
        >
          <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-400 text-neutral-950">
              <Camera className="h-5 w-5" />
            </div>
            <h3
              id="camera-permission-title"
              className="mt-4 text-lg font-extrabold text-neutral-950 dark:text-white"
            >
              Izinkan Akses Kamera?
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
              EduNotes membutuhkan akses kamera untuk mengambil foto catatan secara langsung. Kamera hanya akan digunakan ketika kamu memilih fitur Scan Camera.
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowCameraPermissionDialog(false);
                  setCameraOpen(false);
                  setCameraDeclinedNotice(true);
                }}
                className="rounded-lg border border-neutral-300 px-4 py-2.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
              >
                Jangan Izinkan
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCameraPermissionDialog(false);
                  setCameraDeclinedNotice(false);
                  setCameraOpen(true);
                }}
                className="rounded-lg bg-yellow-400 px-5 py-2.5 text-xs font-bold text-neutral-950 hover:bg-yellow-300"
              >
                Izinkan Kamera
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
