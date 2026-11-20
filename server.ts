import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import {
  analyzeNotesWithGemini,
  getGeminiApiKey,
  verifyGeminiConnection,
  AnalyzeRequestPayload,
} from './server/geminiService.ts';
import { SERVER_CONFIG } from './netlify/functions/_shared/config.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // Support multi-page base64 notebook photos and PDF safely up to 50MB
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Health & Gemini status endpoint
  app.get('/api/ai/status', async (_req, res) => {
    const key = getGeminiApiKey();
    if (!key) {
      return res.status(200).json({
        configured: false,
        connected: false,
        model: SERVER_CONFIG.geminiModel,
        message: 'GEMINI_API_KEY belum dikonfigurasi di file .env atau environment variables server.',
      });
    }
    try {
      const result = await verifyGeminiConnection();
      return res.status(200).json({ configured: true, ...result });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Gagal menghubungi Gemini API.';
      return res.status(502).json({
        configured: true,
        connected: false,
        model: SERVER_CONFIG.geminiModel,
        message,
      });
    }
  });

  // Main AI Analysis endpoint (server-side Gemini call)
  const handleAnalyze = async (req: express.Request, res: express.Response) => {
    try {
      const payload = req.body as AnalyzeRequestPayload;
      if (!payload || !payload.bookId || !payload.bookName) {
        return res.status(400).json({ error: 'Parameter bookId dan bookName wajib diisi.' });
      }

      const hasContent =
        (payload.files && payload.files.length > 0) ||
        (payload.textContent && payload.textContent.trim().length > 0);

      if (!hasContent) {
        return res
          .status(400)
          .json({ error: 'Berikan minimal satu file/foto atau catatan teks untuk dianalisis.' });
      }

      const result = await analyzeNotesWithGemini(payload);
      return res.status(200).json({ data: result });
    } catch (err) {
      console.error('[EduNotes Analyze Server Error]', err);

      const message = err instanceof Error ? err.message : 'Terjadi kesalahan pada layanan AI.';

      const status = message.includes('429') || message.includes('RESOURCE_EXHAUSTED')
        ? 429
        : message.includes('GEMINI_API_KEY')
          ? 503
          : 500;
      return res.status(status).json({ error: message });
    }
  };

  app.post('/api/ai/analyze', handleAnalyze);
  app.post('/api/ai/scan-notes', handleAnalyze);

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`EduNotes server running on http://localhost:${PORT}`);
  });
}

startServer();
