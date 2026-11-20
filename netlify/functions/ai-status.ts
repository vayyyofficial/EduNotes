import { isGeminiConfigured, SERVER_CONFIG } from './_shared/config';
import { verifyGeminiConnection } from '../../server/geminiService';

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'GET') {
    return Response.json({ error: 'Method tidak diizinkan.' }, { status: 405 });
  }

  const configured = isGeminiConfigured();
  if (!configured) {
    return Response.json(
      {
        configured: false,
        connected: false,
        model: SERVER_CONFIG.geminiModel,
        message: 'GEMINI_API_KEY belum dikonfigurasi pada Netlify Environment Variables.',
      },
      { status: 200 }
    );
  }

  try {
    const result = await verifyGeminiConnection();
    return Response.json({ configured: true, ...result }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Gagal menghubungi Gemini API.';
    return Response.json(
      {
        configured: true,
        connected: false,
        model: SERVER_CONFIG.geminiModel,
        message,
      },
      { status: 502 }
    );
  }
}
