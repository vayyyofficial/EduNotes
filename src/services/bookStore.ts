import { requireSupabaseClient } from '../lib/supabase';
import { slugify } from '../lib/format';
import { INITIAL_BOOKS } from '../data/initialBooks';
import {
  Book,
  BookReference,
  Chapter,
  ContentBlock,
  Subchapter,
  SubchapterVersion,
} from '../types/textbook';

function uid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function handleSupabaseQueryError(label: string, err: { code?: string; message: string }): Error {
  if (err.code === '42501' || err.message?.includes('permission denied')) {
    return new Error(
      `${label}: Izin akses tabel belum diberikan ke role database (Kode: ${err.code || '42501'}). Silakan jalankan file migrasi 'supabase/migrations/005_grant_table_permissions.sql' di Supabase SQL Editor.`
    );
  }
  return new Error(`${label}: ${err.message}`);
}

export function getBookStats(book: Book) {
  const chapterCount = book.chapters.length;
  const materialCount = book.chapters.reduce((sum, ch) => sum + ch.subchapters.length, 0);
  return { chapterCount, materialCount };
}

/**
 * Mengambil seluruh data buku, bab, subbab, versi, dan referensi dari database Supabase Cloud.
 * Tidak ada fallback ke localStorage. Jika Supabase gagal, error akan dilempar secara transparan.
 */
export async function fetchBooks(): Promise<Book[]> {
  const supabase = requireSupabaseClient();

  const [
    { data: rawBooks, error: bErr },
    { data: rawChapters, error: cErr },
    { data: rawSubchapters, error: sErr },
    { data: rawVersions, error: vErr },
    { data: rawReferences, error: rErr },
  ] = await Promise.all([
    supabase.from('books').select('*').order('display_order', { ascending: true }),
    supabase.from('chapters').select('*').order('number', { ascending: true }),
    supabase.from('subchapters').select('*').order('display_order', { ascending: true }),
    supabase.from('subchapter_versions').select('*').order('version_number', { ascending: false }),
    supabase.from('book_references').select('*').order('created_at', { ascending: true }),
  ]);

  if (bErr) throw handleSupabaseQueryError('Gagal memuat data buku dari Supabase', bErr);
  if (cErr) throw handleSupabaseQueryError('Gagal memuat bab buku dari Supabase', cErr);
  if (sErr) throw handleSupabaseQueryError('Gagal memuat subbab dari Supabase', sErr);
  if (vErr) throw handleSupabaseQueryError('Gagal memuat riwayat versi dari Supabase', vErr);
  if (rErr) throw handleSupabaseQueryError('Gagal memuat referensi dari Supabase', rErr);

  // Build hierarchical textbook structure
  const versionsBySubId = new Map<string, SubchapterVersion[]>();
  for (const v of rawVersions || []) {
    const list = versionsBySubId.get(v.subchapter_id) || [];
    list.push({
      id: v.id,
      versionNumber: v.version_number,
      title: v.title,
      content: (v.content as ContentBlock[]) || [],
      changeSummary: v.change_summary || '',
      sourceMode: (v.source_mode as SubchapterVersion['sourceMode']) || 'manual',
      createdAt: v.created_at,
    });
    versionsBySubId.set(v.subchapter_id, list);
  }

  const subchaptersByChapterId = new Map<string, Subchapter[]>();
  for (const s of rawSubchapters || []) {
    const list = subchaptersByChapterId.get(s.chapter_id) || [];
    list.push({
      id: s.id,
      code: s.code,
      title: s.title,
      description: s.description || '',
      content: (s.content as ContentBlock[]) || [],
      tags: s.tags || [],
      updatedAt: s.updated_at,
      versions: versionsBySubId.get(s.id) || [],
    });
    subchaptersByChapterId.set(s.chapter_id, list);
  }

  const chaptersByBookId = new Map<string, Chapter[]>();
  for (const c of rawChapters || []) {
    const list = chaptersByBookId.get(c.book_id) || [];
    list.push({
      id: c.id,
      number: c.number,
      title: c.title,
      description: c.description || '',
      subchapters: subchaptersByChapterId.get(c.id) || [],
    });
    chaptersByBookId.set(c.book_id, list);
  }

  const referencesByBookId = new Map<string, BookReference[]>();
  for (const r of rawReferences || []) {
    const list = referencesByBookId.get(r.book_id) || [];
    list.push({
      id: r.id,
      title: r.title,
      author: r.author || '',
      year: r.year || '',
      publisherOrUrl: r.publisher_or_url || '',
      linkedChapterId: r.linked_chapter_id || undefined,
      linkedSubchapterId: r.linked_subchapter_id || undefined,
    });
    referencesByBookId.set(r.book_id, list);
  }

  const books: Book[] = (rawBooks || []).map((b) => ({
    id: b.id,
    name: b.name,
    slug: b.slug,
    description: b.description || '',
    icon: b.icon || 'BookOpen',
    color: b.color || '#FACC15',
    updatedAt: b.updated_at,
    chapters: chaptersByBookId.get(b.id) || [],
    references: referencesByBookId.get(b.id) || [],
  }));

  return books;
}

/**
 * Menyimpan buku baru ke Supabase Cloud.
 */
export async function createBook(input: {
  name: string;
  description: string;
  icon: string;
  color: string;
}): Promise<Book> {
  const supabase = requireSupabaseClient();
  const name = input.name.trim();
  if (!name) throw new Error('Nama mata pelajaran wajib diisi.');

  const slug = slugify(name) || uid('slug');
  const id = uid('book');
  const now = new Date().toISOString();

  const { error } = await supabase.from('books').insert({
    id,
    name,
    slug,
    description: input.description.trim(),
    icon: input.icon || 'BookOpen',
    color: input.color || '#FACC15',
    display_order: 999,
    is_published: true,
    created_at: now,
    updated_at: now,
  });

  if (error) {
    if (error.code === '23505') {
      throw new Error(`Mata pelajaran dengan nama atau slug "${name}" sudah ada di database.`);
    }
    throw new Error(`Gagal menyimpan mata pelajaran baru ke Supabase: ${error.message}`);
  }

  return {
    id,
    name,
    slug,
    description: input.description.trim(),
    icon: input.icon || 'BookOpen',
    color: input.color || '#FACC15',
    updatedAt: now,
    chapters: [],
    references: [],
  };
}

/**
 * Memperbarui data buku di Supabase.
 */
export async function updateBook(
  bookId: string,
  input: { name: string; description: string; icon: string; color: string }
): Promise<void> {
  const supabase = requireSupabaseClient();
  const name = input.name.trim();
  if (!name) throw new Error('Nama mata pelajaran wajib diisi.');

  const now = new Date().toISOString();
  const { error } = await supabase
    .from('books')
    .update({
      name,
      slug: slugify(name),
      description: input.description.trim(),
      icon: input.icon,
      color: input.color,
      updated_at: now,
    })
    .eq('id', bookId);

  if (error) {
    throw new Error(`Gagal memperbarui buku di Supabase: ${error.message}`);
  }
}

/**
 * Menghapus buku dari Supabase (menghapus seluruh bab, subbab, dan referensi terkait via CASCADE).
 */
export async function deleteBook(bookId: string): Promise<void> {
  const supabase = requireSupabaseClient();
  const { error } = await supabase.from('books').delete().eq('id', bookId);
  if (error) {
    throw new Error(`Gagal menghapus buku dari Supabase: ${error.message}`);
  }
}

/**
 * Menambahkan BAB baru ke dalam buku di Supabase.
 */
export async function addChapter(
  bookId: string,
  input: { title: string; description: string },
  currentChapterCount: number
): Promise<Chapter> {
  const supabase = requireSupabaseClient();
  const title = input.title.trim();
  if (!title) throw new Error('Judul bab wajib diisi.');

  const id = uid('ch');
  const number = currentChapterCount + 1;
  const now = new Date().toISOString();

  const { error } = await supabase.from('chapters').insert({
    id,
    book_id: bookId,
    number,
    title,
    description: input.description.trim(),
    display_order: number,
    created_at: now,
    updated_at: now,
  });

  if (error) {
    throw new Error(`Gagal menambahkan BAB ke Supabase: ${error.message}`);
  }

  // Update book timestamp
  await supabase.from('books').update({ updated_at: now }).eq('id', bookId);

  return {
    id,
    number,
    title,
    description: input.description.trim(),
    subchapters: [],
  };
}

/**
 * Memperbarui BAB di Supabase.
 */
export async function updateChapter(
  chapterId: string,
  input: { title: string; description: string }
): Promise<void> {
  const supabase = requireSupabaseClient();
  const title = input.title.trim();
  if (!title) throw new Error('Judul bab wajib diisi.');

  const now = new Date().toISOString();
  const { error } = await supabase
    .from('chapters')
    .update({
      title,
      description: input.description.trim(),
      updated_at: now,
    })
    .eq('id', chapterId);

  if (error) {
    throw new Error(`Gagal memperbarui BAB di Supabase: ${error.message}`);
  }
}

/**
 * Menghapus BAB dari Supabase.
 */
export async function deleteChapter(chapterId: string): Promise<void> {
  const supabase = requireSupabaseClient();
  const { error } = await supabase.from('chapters').delete().eq('id', chapterId);
  if (error) {
    throw new Error(`Gagal menghapus BAB dari Supabase: ${error.message}`);
  }
}

/**
 * Mengubah urutan BAB di Supabase.
 */
export async function moveChapter(
  bookId: string,
  chapters: Chapter[],
  chapterIndex: number,
  direction: -1 | 1
): Promise<void> {
  const targetIndex = chapterIndex + direction;
  if (targetIndex < 0 || targetIndex >= chapters.length) return;

  const supabase = requireSupabaseClient();
  const reordered = [...chapters];
  [reordered[chapterIndex], reordered[targetIndex]] = [reordered[targetIndex], reordered[chapterIndex]];

  // Update numbers and display orders
  const updates = reordered.map((ch, idx) => ({
    id: ch.id,
    book_id: bookId,
    number: idx + 1,
    title: ch.title,
    description: ch.description,
    display_order: idx + 1,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase.from('chapters').upsert(updates);
  if (error) {
    throw new Error(`Gagal memindahkan posisi BAB: ${error.message}`);
  }
}

/**
 * Menambahkan Subbab baru ke dalam BAB di Supabase beserta snapshot Versi 1.
 */
export async function addSubchapter(
  bookId: string,
  chapterId: string,
  input: {
    title: string;
    description: string;
    content: ContentBlock[];
    tags: string[];
    changeSummary?: string;
    sourceMode?: SubchapterVersion['sourceMode'];
  },
  currentSubCount: number,
  chapterNumber: number
): Promise<Subchapter> {
  const supabase = requireSupabaseClient();
  const title = input.title.trim();
  if (!title) throw new Error('Judul subbab wajib diisi.');

  const subId = uid('sub');
  const verId = uid('ver');
  const code = `${chapterNumber}.${currentSubCount + 1}`;
  const now = new Date().toISOString();

  // 1. Insert subchapter row
  const { error: sErr } = await supabase.from('subchapters').insert({
    id: subId,
    chapter_id: chapterId,
    book_id: bookId,
    code,
    title,
    description: input.description.trim(),
    content: input.content,
    tags: input.tags,
    display_order: currentSubCount + 1,
    created_at: now,
    updated_at: now,
  });

  if (sErr) throw new Error(`Gagal menambahkan subbab ke Supabase: ${sErr.message}`);

  // 2. Insert initial version
  const initialVersion: SubchapterVersion = {
    id: verId,
    versionNumber: 1,
    title,
    content: input.content,
    changeSummary: input.changeSummary || 'Versi awal subbab',
    sourceMode: input.sourceMode || 'manual',
    createdAt: now,
  };

  const { error: vErr } = await supabase.from('subchapter_versions').insert({
    id: verId,
    subchapter_id: subId,
    version_number: 1,
    title,
    description: input.description.trim(),
    content: input.content,
    change_summary: initialVersion.changeSummary,
    source_mode: initialVersion.sourceMode,
    created_at: now,
  });

  if (vErr) {
    console.warn('Gagal menyimpan snapshot versi awal:', vErr.message);
  }

  return {
    id: subId,
    code,
    title,
    description: input.description.trim(),
    content: input.content,
    tags: input.tags,
    updatedAt: now,
    versions: [initialVersion],
  };
}

/**
 * Memperbarui subbab di Supabase dan menambahkan snapshot versi baru.
 */
export async function updateSubchapter(
  subchapterId: string,
  input: {
    title: string;
    description: string;
    content: ContentBlock[];
    tags: string[];
    changeSummary?: string;
    sourceMode?: SubchapterVersion['sourceMode'];
    currentVersionCount: number;
  }
): Promise<void> {
  const supabase = requireSupabaseClient();
  const title = input.title.trim();
  if (!title) throw new Error('Judul subbab wajib diisi.');

  const now = new Date().toISOString();
  const nextVerNum = (input.currentVersionCount || 1) + 1;
  const verId = uid('ver');

  // 1. Save version snapshot
  await supabase.from('subchapter_versions').insert({
    id: verId,
    subchapter_id: subchapterId,
    version_number: nextVerNum,
    title,
    description: input.description.trim(),
    content: input.content,
    change_summary: input.changeSummary || 'Pembaruan materi',
    source_mode: input.sourceMode || 'manual',
    created_at: now,
  });

  // 2. Update subchapter row
  const { error } = await supabase
    .from('subchapters')
    .update({
      title,
      description: input.description.trim(),
      content: input.content,
      tags: input.tags,
      updated_at: now,
    })
    .eq('id', subchapterId);

  if (error) {
    throw new Error(`Gagal memperbarui subbab di Supabase: ${error.message}`);
  }
}

/**
 * Menghapus subbab dari Supabase.
 */
export async function deleteSubchapter(subchapterId: string): Promise<void> {
  const supabase = requireSupabaseClient();
  const { error } = await supabase.from('subchapters').delete().eq('id', subchapterId);
  if (error) {
    throw new Error(`Gagal menghapus subbab dari Supabase: ${error.message}`);
  }
}

/**
 * Memulihkan versi subbab sebelumnya.
 */
export async function restoreSubchapterVersion(
  subchapterId: string,
  version: SubchapterVersion,
  currentVersionCount: number
): Promise<void> {
  return updateSubchapter(subchapterId, {
    title: version.title,
    description: '',
    content: version.content,
    tags: [],
    changeSummary: `Dipulihkan dari Versi ${version.versionNumber}`,
    sourceMode: 'restore',
    currentVersionCount,
  });
}

/**
 * Menyimpan atau memperbarui referensi / daftar pustaka di Supabase.
 */
export async function saveReference(
  bookId: string,
  ref: Omit<BookReference, 'id'>,
  editId?: string
): Promise<void> {
  const supabase = requireSupabaseClient();
  const title = ref.title.trim();
  if (!title) throw new Error('Judul referensi wajib diisi.');

  const id = editId || uid('ref');
  const now = new Date().toISOString();

  if (editId) {
    const { error } = await supabase
      .from('book_references')
      .update({
        title,
        author: ref.author || '',
        year: ref.year || '',
        publisher_or_url: ref.publisherOrUrl || '',
        linked_chapter_id: ref.linkedChapterId || null,
        linked_subchapter_id: ref.linkedSubchapterId || null,
      })
      .eq('id', editId);

    if (error) throw new Error(`Gagal memperbarui referensi di Supabase: ${error.message}`);
  } else {
    const { error } = await supabase.from('book_references').insert({
      id,
      book_id: bookId,
      title,
      author: ref.author || '',
      year: ref.year || '',
      publisher_or_url: ref.publisherOrUrl || '',
      linked_chapter_id: ref.linkedChapterId || null,
      linked_subchapter_id: ref.linkedSubchapterId || null,
      created_at: now,
    });

    if (error) throw new Error(`Gagal menyimpan referensi ke Supabase: ${error.message}`);
  }
}

/**
 * Menghapus referensi dari Supabase.
 */
export async function deleteReference(refId: string): Promise<void> {
  const supabase = requireSupabaseClient();
  const { error } = await supabase.from('book_references').delete().eq('id', refId);
  if (error) {
    throw new Error(`Gagal menghapus referensi dari Supabase: ${error.message}`);
  }
}

/**
 * Menyinkronkan buku kurikulum standar awal ke Supabase jika database masih kosong.
 */
export async function seedInitialLibraryToSupabase(): Promise<void> {
  const supabase = requireSupabaseClient();

  for (let bIdx = 0; bIdx < INITIAL_BOOKS.length; bIdx++) {
    const book = INITIAL_BOOKS[bIdx];
    await supabase.from('books').upsert({
      id: book.id,
      name: book.name,
      slug: book.slug,
      description: book.description,
      icon: book.icon,
      color: book.color,
      display_order: bIdx + 1,
      is_published: true,
      created_at: book.updatedAt,
      updated_at: book.updatedAt,
    });

    for (let cIdx = 0; cIdx < book.chapters.length; cIdx++) {
      const ch = book.chapters[cIdx];
      await supabase.from('chapters').upsert({
        id: ch.id,
        book_id: book.id,
        number: ch.number,
        title: ch.title,
        description: ch.description,
        display_order: cIdx + 1,
        created_at: book.updatedAt,
        updated_at: book.updatedAt,
      });

      for (let sIdx = 0; sIdx < ch.subchapters.length; sIdx++) {
        const sub = ch.subchapters[sIdx];
        await supabase.from('subchapters').upsert({
          id: sub.id,
          chapter_id: ch.id,
          book_id: book.id,
          code: sub.code,
          title: sub.title,
          description: sub.description,
          content: sub.content,
          tags: sub.tags,
          display_order: sIdx + 1,
          created_at: sub.updatedAt,
          updated_at: sub.updatedAt,
        });

        for (const ver of sub.versions) {
          await supabase.from('subchapter_versions').upsert({
            id: ver.id,
            subchapter_id: sub.id,
            version_number: ver.versionNumber,
            title: ver.title,
            content: ver.content,
            change_summary: ver.changeSummary,
            source_mode: ver.sourceMode,
            created_at: ver.createdAt,
          });
        }
      }
    }
  }
}
