import { isGeminiConfigured } from './_shared/config';
import { analyzeNotesWithGemini, AnalyzeRequestPayload } from '../../server/geminiService';

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method tidak diizinkan.' }, { status: 405 });
  }

  if (!isGeminiConfigured()) {
    return Response.json(
      {
        error:
          'GEMINI_API_KEY belum dikonfigurasi di server. Tambahkan GEMINI_API_KEY di Environment Variables Netlify.',
      },
      { status: 503 }
    );
  }

  let body: AnalyzeRequestPayload;
  try {
    body = (await req.json()) as AnalyzeRequestPayload;
  } catch {
    return Response.json({ error: 'Format payload JSON tidak valid.' }, { status: 400 });
  }

  if (!body.bookId || !body.bookName) {
    return Response.json(
      { error: 'Parameter bookId dan bookName wajib diisi.' },
      { status: 400 }
    );
  }

  const hasContent =
    (body.files && body.files.length > 0) ||
    (body.textContent && body.textContent.trim().length > 0);

  if (!hasContent) {
    return Response.json(
      { error: 'Berikan minimal satu file/foto atau catatan teks untuk dianalisis.' },
      { status: 400 }
    );
  }

  try {
    const result = await analyzeNotesWithGemini(body);
    return Response.json({ data: result }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Gagal memproses analisis AI.';
    const status = message.includes('429') || message.includes('RESOURCE_EXHAUSTED')
      ? 429
      : message.includes('GEMINI_API_KEY')
        ? 503
        : 500;
    return Response.json({ error: message }, { status });
  }
}
