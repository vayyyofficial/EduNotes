import { GoogleGenAI, Type } from '@google/genai';
import { SERVER_CONFIG } from '../netlify/functions/_shared/config.ts';

export interface ContentBlock {
  id?: string;
  type:
  | 'heading'
  | 'subheading'
  | 'paragraph'
  | 'bullet_list'
  | 'numbered_list'
  | 'table'
  | 'quote'
  | 'note'
  | 'takeaway'
  | 'definition';
  text?: string;
  title?: string;
  term?: string;
  author?: string;
  items?: string[];
  headers?: string[];
  rows?: string[][];
}

export interface ExistingSubchapterSummary {
  id: string;
  code: string;
  title: string;
  description: string;
  contentSummary?: string;
}

export interface ExistingChapterSummary {
  id: string;
  number: number;
  title: string;
  description: string;
  subchapters: ExistingSubchapterSummary[];
}

export interface AnalyzeRequestPayload {
  sourceType: 'camera' | 'file' | 'text';
  bookId: string;
  bookName: string;
  bookDescription?: string;
  existingChapters: ExistingChapterSummary[];
  textContent?: string;
  optionalTitle?: string;
  files?: Array<{
    name: string;
    mimeType: string;
    base64Data: string;
  }>;
}

export interface ProposedSubchapterAction {
  id: string;
  action: 'update_existing' | 'add_new';
  targetSubchapterId?: string;
  title: string;
  description: string;
  originalContent?: ContentBlock[];
  proposedContent: ContentBlock[];
  changeNote: string;
}

export interface ProposedChapterPlan {
  id: string;
  action: 'keep_existing' | 'create_new';
  targetChapterId?: string;
  chapterTitle: string;
  chapterDescription: string;
  subchapters: ProposedSubchapterAction[];
}

export interface AutoStructuringProposal {
  bookId: string;
  bookName: string;
  photoCount: number;
  plainLanguageSummary: string;
  chapterPlans: ProposedChapterPlan[];
  mergedOrMovedNotes: string[];
  unclearHandwritingItems: string[];
  createdAt: string;
}

function uid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export function getGeminiApiKey(): string | null {
  const key = process.env.GEMINI_API_KEY?.trim() || '';
  if (!key || key === 'MY_GEMINI_API_KEY' || key === 'YOUR_GEMINI_API_KEY_HERE' || key.length < 10) {
    return null;
  }
  return key;
}

export function getGeminiClient(): GoogleGenAI {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY belum dikonfigurasi. Silakan tambahkan GEMINI_API_KEY di file .env (lokal) atau Environment Variables Netlify (production).'
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      timeout: 90_000,
      retryOptions: {
        attempts: 1,
      },
    },
  });
}

export async function verifyGeminiConnection(): Promise<{
  connected: boolean;
  model: string;
  message: string;
}> {
  const ai = getGeminiClient();
  let activeModel: string = SERVER_CONFIG.geminiModel;
  let text = '';

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: activeModel,
        contents: 'Jawab dengan kata OK jika Anda dapat membaca instruksi ini.',
      });
      text = response.text || '';
      break;
    } catch (err: any) {
      const is503 = err?.status === 503 || err?.message?.includes('503') || err?.message?.includes('high demand');
      console.error('[Gemini Analysis Error]', {
        model: activeModel,
        status: err?.status,
        message: err?.message,
      });
      if (is503 && attempt === 1) {
        await new Promise((r) => setTimeout(r, 1500));
        continue;
      }
      if (is503 && attempt === 2) {
        // Fallback to stable secondary model if 3.8 demand spike persists
        activeModel = SERVER_CONFIG.fallbackModel;
        const response = await ai.models.generateContent({
          model: activeModel,
          contents: 'Jawab dengan kata OK jika Anda dapat membaca instruksi ini.',
        });
        text = response.text || '';
        break;
      }
      throw err;
    }
  }

  return {
    connected: Boolean(text),
    model: activeModel,
    message: `Koneksi Gemini API (${activeModel}) berhasil diverifikasi dan siap digunakan.`,
  };
}

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    plainLanguageSummary: {
      type: Type.STRING,
      description: 'Ringkasan singkat dalam Bahasa Indonesia mengenai apa yang dianalisis dan bagaimana materi disusun atau digabungkan ke dalam buku.',
    },
    mergedOrMovedNotes: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Daftar materi yang digabungkan ke BAB/subbab yang sudah ada atau dipindahkan agar tidak terjadi duplikasi.',
    },
    unclearHandwritingItems: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Daftar bagian tulisan tangan atau gambar yang kabur/kurang jelas sehingga perlu diperiksa pengguna.',
    },
    chapterPlans: {
      type: Type.ARRAY,
      description: 'Daftar usulan susunan BAB (baik melengkapi BAB yang ada atau membuat BAB baru).',
      items: {
        type: Type.OBJECT,
        properties: {
          action: {
            type: Type.STRING,
            description: '"keep_existing" jika memanfaatkan BAB yang sudah ada, atau "create_new" jika mengusulkan BAB baru.',
          },
          targetChapterId: {
            type: Type.STRING,
            description: 'ID bab yang sudah ada jika action="keep_existing". Kosongkan jika create_new.',
          },
          chapterTitle: {
            type: Type.STRING,
            description: 'Judul BAB yang jelas dan edukatif.',
          },
          chapterDescription: {
            type: Type.STRING,
            description: 'Deskripsi ringkas mengenai cakupan materi pada BAB ini.',
          },
          subchapters: {
            type: Type.ARRAY,
            description: 'Daftar usulan subbab di bawah BAB ini.',
            items: {
              type: Type.OBJECT,
              properties: {
                action: {
                  type: Type.STRING,
                  description: '"update_existing" jika materi melengkapi subbab yang sudah ada, atau "add_new" jika membuat subbab baru.',
                },
                targetSubchapterId: {
                  type: Type.STRING,
                  description: 'ID subbab lama jika action="update_existing". Kosongkan jika add_new.',
                },
                title: {
                  type: Type.STRING,
                  description: 'Judul subbab.',
                },
                description: {
                  type: Type.STRING,
                  description: 'Ringkasan pengantar singkat subbab (1-2 kalimat).',
                },
                changeNote: {
                  type: Type.STRING,
                  description: 'Catatan alasan penempatan atau pembaruan (misal: "Menggabungkan rumus baru ke materi gaya gesek tanpa menduplikasi definisi lama").',
                },
                content: {
                  type: Type.ARRAY,
                  description: 'Daftar blok konten terstruktur.',
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      type: {
                        type: Type.STRING,
                        description: 'Tipe blok: heading, subheading, paragraph, bullet_list, numbered_list, definition, note, takeaway, table.',
                      },
                      text: { type: Type.STRING, description: 'Teks utama (untuk paragraph, heading, subheading, note, takeaway).' },
                      term: { type: Type.STRING, description: 'Istilah teknis / kata kunci (khusus definition).' },
                      items: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Daftar butir poin (khusus bullet_list dan numbered_list).' },
                      headers: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Header kolom (khusus table).' },
                      rows: {
                        type: Type.ARRAY,
                        items: { type: Type.ARRAY, items: { type: Type.STRING } },
                        description: 'Baris data tabel (khusus table).',
                      },
                    },
                    required: ['type'],
                  },
                },
              },
              required: ['action', 'title', 'description', 'changeNote', 'content'],
            },
          },
        },
        required: ['action', 'chapterTitle', 'chapterDescription', 'subchapters'],
      },
    },
  },
  required: ['plainLanguageSummary', 'mergedOrMovedNotes', 'unclearHandwritingItems', 'chapterPlans'],
};

export async function analyzeNotesWithGemini(
  payload: AnalyzeRequestPayload
): Promise<AutoStructuringProposal> {
  const ai = getGeminiClient();
  let activeModel: string = SERVER_CONFIG.geminiModel;

  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];

  const files = payload.files || [];
  for (const f of files) {
    if (f.base64Data && f.mimeType) {
      parts.push({
        inlineData: {
          mimeType: f.mimeType,
          data: f.base64Data,
        },
      });
    }
  }

  const existingOutline = (payload.existingChapters || []).map((ch) => ({
    chapterId: ch.id,
    chapterNumber: ch.number,
    chapterTitle: ch.title,
    chapterDescription: ch.description,
    subchapters: ch.subchapters.map((sub) => ({
      subchapterId: sub.id,
      code: sub.code,
      title: sub.title,
      description: sub.description,
      summary: sub.contentSummary || '',
    })),
  }));

  const systemPrompt = `
Anda adalah asisten kurikulum dan editor buku pelajaran digital profesional untuk platform EduNotes.
Tugas Anda adalah membaca materi/catatan pelajaran (dari foto tulisan tangan, dokumen PDF, atau teks) untuk mata pelajaran: "${payload.bookName}".

DESKRIPSI BUKU:
${payload.bookDescription || 'Buku rangkuman pelajaran komprehensif.'}

STRUKTUR BAB & SUBBAB YANG SUDAH TERSEDIA SAAT INI:
${JSON.stringify(existingOutline, null, 2)}

JUDUL OPSIONAL DARI PENGGUNA:
${payload.optionalTitle || '(tidak ada)'}

TEKS CATATAN / TRANSKRIPSI LANGSUNG:
${payload.textContent ? payload.textContent.slice(0, 30000) : '(tidak ada teks langsung, pelajari lampiran gambar/PDF)'}

ATURAN WAJIB & PEDOMAN PENYUSUNAN:
1. AKURASI MATERI: Pertahankan seluruh fakta, konsep, istilah teknis, rumus, tanggal peristiwa, dan definisi dari catatan asli. Jangan mengarang informasi di luar konteks pelajaran.
2. PENGGABUNGAN CERDAS (MERGE & DEDUPLIKASI):
   - Bandingkan topik catatan dengan daftar BAB dan subbab yang sudah ada di atas.
   - Jika materi catatan memperdalam atau menambahkan poin baru pada subbab yang sudah ada: pilih action "update_existing", cantumkan targetChapterId dan targetSubchapterId, gabungkan materi baru secara harmonis, dan hindari pengulangan kalimat yang sama.
   - Jika catatan membahas topik baru di bawah ranah BAB yang sudah ada: pilih action "keep_existing" pada bab, dan action "add_new" pada subbab baru tersebut.
   - Jika catatan membahas tema besar baru yang belum terwadahi oleh BAB manapun: buat BAB baru dengan action "create_new" dan subbab baru dengan action "add_new".
3. BLOK KONTEN TERSTRUKTUR:
   Setiap subbab wajib memiliki array "content" berupa blok-blok rapi:
   - "paragraph": penjelasan konsep mendalam dengan format markdown tebal (**kata kunci**) dan miring (*istilah asing*).
   - "heading" / "subheading": pembagi segmen materi jika panjang.
   - "bullet_list" / "numbered_list": untuk langkah, klasifikasi, jenis, atau poin penting.
   - "definition": untuk istilah penting (sertakan term dan text).
   - "table": jika terdapat perbandingan, data terstruktur, atau kronologi waktu (sertakan headers dan rows).
   - "note": catatan peringatan atau tips mengingat rumus/materi.
   - "takeaway": rangkuman poin inti di akhir subbab.
4. TULISAN TANGAN KABUR:
   Jika menemukan tulisan tangan atau gambar yang buram/terpotong, cantumkan catatannya di array "unclearHandwritingItems" agar pengguna dapat meninjaunya secara manual.
5. Gunakan Bahasa Indonesia akademis yang baku, terstruktur, mudah dipahami siswa, dan profesional.
6. Kembalikan HANYA format JSON yang sesuai dengan RESPONSE_SCHEMA yang diminta.
`;

  parts.push({ text: systemPrompt });

  let rawText = '';


  try {
    const response = await ai.models.generateContent({
      model: activeModel,
      contents: { parts },
      config: {
        responseMimeType: 'application/json',
        responseSchema: RESPONSE_SCHEMA,
      },
    });

    rawText = (response.text || '').trim();
  } catch (err: any) {
    const errorMessage = String(err?.message || '').toLowerCase();

    const shouldUseFallback =
      err?.status === 503 ||
      err?.status === 504 ||
      errorMessage.includes('503') ||
      errorMessage.includes('504') ||
      errorMessage.includes('high demand') ||
      errorMessage.includes('deadline_exceeded') ||
      errorMessage.includes('deadline expired');

    if (!shouldUseFallback) {
      throw err;
    }

    console.warn(
      `[Gemini] Model utama ${activeModel} gagal. Mencoba fallback ${SERVER_CONFIG.fallbackModel}.`,
      err?.status || errorMessage
    );

    activeModel = SERVER_CONFIG.fallbackModel;

    try {
      const response = await ai.models.generateContent({
        model: activeModel,
        contents: { parts },
        config: {
          responseMimeType: 'application/json',
          responseSchema: RESPONSE_SCHEMA,
        },
      });

      rawText = (response.text || '').trim();
    } catch (fallbackError) {
      console.error('[Gemini] Model fallback juga gagal:', fallbackError);

      throw new Error(
        `Model utama gagal dan model fallback (${activeModel}) juga tidak dapat menyelesaikan analisis. Silakan coba kembali nanti.`
      );
    }
  }


  let parsed: {
    plainLanguageSummary: string;
    mergedOrMovedNotes: string[];
    unclearHandwritingItems: string[];
    chapterPlans: Array<{
      action: 'keep_existing' | 'create_new';
      targetChapterId?: string;
      chapterTitle: string;
      chapterDescription: string;
      subchapters: Array<{
        action: 'update_existing' | 'add_new';
        targetSubchapterId?: string;
        title: string;
        description: string;
        changeNote: string;
        content: ContentBlock[];
      }>;
    }>;
  };

  try {
    parsed = JSON.parse(rawText);
  } catch {
    throw new Error('Gagal memproses format JSON yang dikembalikan oleh AI.');
  }

  // Ensure unique IDs and robust structure
  const formattedPlans: ProposedChapterPlan[] = (parsed.chapterPlans || []).map((cp) => ({
    id: uid('plan_ch'),
    action: cp.action === 'create_new' ? 'create_new' : 'keep_existing',
    targetChapterId: cp.targetChapterId || undefined,
    chapterTitle: cp.chapterTitle || 'BAB Rangkuman Baru',
    chapterDescription: cp.chapterDescription || '',
    subchapters: (cp.subchapters || []).map((sub) => {
      const formattedBlocks: ContentBlock[] = (sub.content || []).map((b) => ({
        id: uid('blk'),
        type: b.type || 'paragraph',
        text: b.text || '',
        title: b.title || undefined,
        term: b.term || undefined,
        author: b.author || undefined,
        items: Array.isArray(b.items) ? b.items : undefined,
        headers: Array.isArray(b.headers) ? b.headers : undefined,
        rows: Array.isArray(b.rows) ? b.rows : undefined,
      }));

      return {
        id: uid('plan_sub'),
        action: sub.action === 'update_existing' ? 'update_existing' : 'add_new',
        targetSubchapterId: sub.targetSubchapterId || undefined,
        title: sub.title || 'Subbab Materi',
        description: sub.description || '',
        changeNote: sub.changeNote || 'Disusun otomatis oleh AI.',
        proposedContent: formattedBlocks,
      };
    }),
  }));

  return {
    bookId: payload.bookId,
    bookName: payload.bookName,
    photoCount: files.length > 0 ? files.length : payload.sourceType === 'text' ? 1 : 0,
    plainLanguageSummary: parsed.plainLanguageSummary || 'Materi berhasil dianalisis dan disusun oleh Gemini AI.',
    chapterPlans: formattedPlans,
    mergedOrMovedNotes: parsed.mergedOrMovedNotes || [],
    unclearHandwritingItems: parsed.unclearHandwritingItems || [],
    createdAt: new Date().toISOString(),
  };
}
