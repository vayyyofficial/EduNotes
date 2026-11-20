import { fileToBase64, extractTextFromDocx, compressImageFile } from '../lib/fileReader';
import { requireSupabaseClient } from '../lib/supabase';
import {
  AutoStructuringProposal,
  Book,
  LocalScanHistoryItem,
} from '../types/textbook';
import {
  addChapter,
  addSubchapter,
  updateSubchapter,
  fetchBooks,
} from './bookStore';

function uid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export type UnifiedSourceType = 'camera' | 'file' | 'text';

export interface UnifiedAiInput {
  sourceType: UnifiedSourceType;
  book: Book;
  files?: File[];
  extractedTexts?: string[];
  textContent?: string;
  optionalTitle?: string;
}

/**
 * Memuat riwayat scan catatan dari database Supabase Cloud.
 */
export async function loadScanHistory(): Promise<LocalScanHistoryItem[]> {
  try {
    const supabase = requireSupabaseClient();
    const { data, error } = await supabase
      .from('scan_history')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.warn('Gagal memuat scan history dari Supabase:', error.message);
      return [];
    }

    return (data || []).map((row) => ({
      id: row.id,
      bookName: row.book_name,
      photoCount: row.photo_count || 0,
      summary: row.summary || '',
      createdAt: row.created_at,
    }));
  } catch {
    return [];
  }
}

/**
 * Menyimpan entri riwayat scan baru ke Supabase Cloud.
 */
export async function saveScanHistoryItem(item: Omit<LocalScanHistoryItem, 'id'>): Promise<void> {
  try {
    const supabase = requireSupabaseClient();
    const id = uid('scan');
    await supabase.from('scan_history').insert({
      id,
      book_name: item.bookName,
      photo_count: item.photoCount,
      summary: item.summary,
      created_at: item.createdAt || new Date().toISOString(),
    });
  } catch (err) {
    console.warn('Gagal menyimpan scan history ke Supabase:', err);
  }
}

/**
 * Pipeline analisis AI terpadu yang memanggil endpoint backend (/api/ai/analyze).
 * Mendukung foto kamera, unggahan dokumen (PDF, DOCX, TXT, JPG, PNG, WEBP), serta teks langsung.
 * Mengompresi gambar otomatis untuk menjaga ukuran payload aman dalam batas Netlify Functions.
 */
export async function analyzeUnifiedInput(
  input: UnifiedAiInput
): Promise<AutoStructuringProposal> {
  const { sourceType, book, files = [], extractedTexts = [], textContent = '', optionalTitle } =
    input;

  const outgoingFiles: Array<{ name: string; mimeType: string; base64Data: string }> = [];
  const textParts: string[] = [];

  if (textContent.trim()) {
    textParts.push(textContent.trim());
  }
  for (const extText of extractedTexts) {
    if (extText.trim()) {
      textParts.push(extText.trim());
    }
  }

  for (const file of files) {
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
      const { base64 } = await compressImageFile(file);
      outgoingFiles.push({ name: file.name, mimeType: 'image/jpeg', base64Data: base64 });
    } else if (ext === 'pdf') {
      const base64 = await fileToBase64(file);
      outgoingFiles.push({ name: file.name, mimeType: 'application/pdf', base64Data: base64 });
    } else if (ext === 'txt') {
      const txt = await file.text();
      if (txt.trim()) textParts.push(`[File: ${file.name}]\n${txt.trim()}`);
    } else if (ext === 'docx') {
      const docxText = await extractTextFromDocx(file);
      if (docxText.trim()) textParts.push(`[File: ${file.name}]\n${docxText.trim()}`);
    }
  }

  const existingChaptersPayload = book.chapters.map((ch) => ({
    id: ch.id,
    number: ch.number,
    title: ch.title,
    description: ch.description,
    subchapters: ch.subchapters.map((sub) => {
      const summaryText = sub.content
        .map((b) => b.text || b.title || (b.items ? b.items.join(' ') : ''))
        .filter(Boolean)
        .join(' ')
        .slice(0, 300);
      return {
        id: sub.id,
        code: sub.code,
        title: sub.title,
        description: sub.description,
        contentSummary: summaryText,
      };
    }),
  }));

  const payload = {
    sourceType,
    bookId: book.id,
    bookName: book.name,
    bookDescription: book.description,
    existingChapters: existingChaptersPayload,
    textContent: textParts.join('\n\n'),
    optionalTitle: optionalTitle?.trim() || undefined,
    files: outgoingFiles,
  };

  const response = await fetch('/api/ai/analyze', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let errorMsg = `Server mengembalikan status ${response.status}.`;
    try {
      const errJson = await response.json();
      if (errJson && errJson.error) {
        errorMsg = errJson.error;
      }
    } catch {
      // Fallback
    }
    throw new Error(errorMsg);
  }

  const result = await response.json();
  if (!result.data || !Array.isArray(result.data.chapterPlans)) {
    throw new Error('Format hasil analisis AI dari server tidak valid.');
  }

  const proposal: AutoStructuringProposal = result.data;

  // Enrich update_existing subchapters with originalContent from the target book for side-by-side review
  for (const plan of proposal.chapterPlans) {
    const targetCh = book.chapters.find((c) => c.id === plan.targetChapterId);
    for (const sub of plan.subchapters) {
      if (sub.action === 'update_existing' && sub.targetSubchapterId && targetCh) {
        const targetSub = targetCh.subchapters.find((s) => s.id === sub.targetSubchapterId);
        if (targetSub) {
          sub.originalContent = targetSub.content;
        }
      }
    }
  }

  return proposal;
}

/**
 * Menerapkan seluruh proposal penataan materi AI langsung ke Supabase Cloud Database.
 * Menyimpan seluruh BAB baru, pembaruan subbab, dan riwayat scan secara persisten di cloud.
 */
export async function applyAutoStructuringProposal(
  books: Book[],
  proposal: AutoStructuringProposal
): Promise<Book[]> {
  const targetBook = books.find((b) => b.id === proposal.bookId);
  if (!targetBook) {
    throw new Error(`Buku dengan ID "${proposal.bookId}" tidak ditemukan.`);
  }

  let currentChapters = [...targetBook.chapters];

  for (const plan of proposal.chapterPlans) {
    let targetChapterId = plan.targetChapterId;
    let targetChapter = currentChapters.find((c) => c.id === targetChapterId);

    // 1. Jika create_new atau bab belum ada, tambahkan bab ke Supabase
    if (plan.action === 'create_new' || !targetChapterId || !targetChapter) {
      const createdCh = await addChapter(
        proposal.bookId,
        {
          title: plan.chapterTitle,
          description: plan.chapterDescription,
        },
        currentChapters.length
      );
      targetChapterId = createdCh.id;
      targetChapter = createdCh;
      currentChapters.push(createdCh);
    }

    // 2. Terapkan subbab ke dalam bab tersebut
    for (const sub of plan.subchapters) {
      if (sub.action === 'update_existing' && sub.targetSubchapterId) {
        const existingSub = targetChapter.subchapters.find(
          (s) => s.id === sub.targetSubchapterId
        );
        await updateSubchapter(sub.targetSubchapterId, {
          title: sub.title,
          description: sub.description,
          content: sub.proposedContent,
          tags: ['hasil-scan'],
          changeSummary: sub.changeNote,
          sourceMode: 'scan_update',
          currentVersionCount: existingSub?.versions.length || 1,
        });
      } else {
        await addSubchapter(
          proposal.bookId,
          targetChapterId,
          {
            title: sub.title,
            description: sub.description,
            content: sub.proposedContent,
            tags: ['hasil-scan'],
            changeSummary: sub.changeNote,
            sourceMode: 'scan_new',
          },
          targetChapter.subchapters.length,
          targetChapter.number
        );
      }
    }
  }

  // 3. Simpan riwayat scan ke Supabase
  await saveScanHistoryItem({
    bookName: proposal.bookName,
    photoCount: proposal.photoCount,
    summary: proposal.plainLanguageSummary,
    createdAt: new Date().toISOString(),
  });

  // 4. Ambil data terbaru dari Supabase
  return fetchBooks();
}
