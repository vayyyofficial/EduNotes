export interface ParsedUploadFile {
  id: string;
  file: File;
  name: string;
  extension: string;
  sizeLabel: string;
  kind: 'image' | 'text' | 'document';
  previewUrl?: string;
  extractedText?: string;
  base64Data?: string;
  mimeType: string;
  statusNote: string;
}

export const SUPPORTED_UPLOAD_EXTENSIONS = ['pdf', 'docx', 'txt', 'jpg', 'jpeg', 'png', 'webp'];
export const MAX_UPLOAD_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export async function fileToBase64(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = '';
  const len = bytes.byteLength;
  const chunkSize = 8192;
  for (let i = 0; i < len; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, len));
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  return btoa(binary);
}

/**
 * Mengompresi gambar di sisi client untuk mencegah payload melebihi batas request Netlify Functions (6MB).
 * Menyesuaikan dimensi maksimal ke 1600px dan mengonversi ke JPEG dengan kualitas 0.82 yang tajam untuk OCR Gemini.
 */
export async function compressImageFile(
  file: File,
  maxDimension = 1600,
  quality = 0.82
): Promise<{ file: File; base64: string }> {
  return new Promise((resolve) => {
    // If not in browser or window is undefined
    if (typeof window === 'undefined') {
      fileToBase64(file).then((base64) => resolve({ file, base64 }));
      return;
    }

    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;

      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        fileToBase64(file).then((base64) => resolve({ file, base64 }));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        async (blob) => {
          if (!blob) {
            const base64 = await fileToBase64(file);
            resolve({ file, base64 });
            return;
          }

          const compressedFile = new File(
            [blob],
            file.name.replace(/\.[^.]+$/, '.jpg'),
            { type: 'image/jpeg' }
          );

          const base64 = await fileToBase64(compressedFile);
          resolve({ file: compressedFile, base64 });
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = async () => {
      URL.revokeObjectURL(url);
      const base64 = await fileToBase64(file);
      resolve({ file, base64 });
    };

    img.src = url;
  });
}

/**
 * Ekstraksi teks dari file DOCX secara native menggunakan Web Stream Decompression.
 * Format DOCX adalah arsip ZIP yang menyimpan isi materi di word/document.xml.
 */
export async function extractTextFromDocx(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    const view = new DataView(arrayBuffer);
    let offset = 0;

    while (offset < bytes.length - 30) {
      if (view.getUint32(offset, true) === 0x04034b50) {
        const compressionMethod = view.getUint16(offset + 8, true);
        const compressedSize = view.getUint32(offset + 18, true);
        const fileNameLength = view.getUint16(offset + 26, true);
        const extraFieldLength = view.getUint16(offset + 28, true);
        const fileNameBytes = bytes.subarray(offset + 30, offset + 30 + fileNameLength);
        const fileName = new TextDecoder().decode(fileNameBytes);

        const dataOffset = offset + 30 + fileNameLength + extraFieldLength;

        if (fileName === 'word/document.xml') {
          const compressedData = bytes.subarray(dataOffset, dataOffset + compressedSize);
          let xmlText = '';

          if (compressionMethod === 0) {
            xmlText = new TextDecoder().decode(compressedData);
          } else if (compressionMethod === 8) {
            const ds = new DecompressionStream('deflate-raw');
            const writer = ds.writable.getWriter();
            await writer.write(compressedData);
            await writer.close();

            const reader = ds.readable.getReader();
            const chunks: Uint8Array[] = [];
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              if (value) chunks.push(value);
            }
            const totalLen = chunks.reduce((acc, c) => acc + c.length, 0);
            const merged = new Uint8Array(totalLen);
            let cur = 0;
            for (const c of chunks) {
              merged.set(c, cur);
              cur += c.length;
            }
            xmlText = new TextDecoder('utf-8').decode(merged);
          }

          const paragraphs: string[] = [];
          const pRegex = /<w:p(?:\s[^>]*)?>([\s\S]*?)<\/w:p>/g;
          let pMatch: RegExpExecArray | null;
          while ((pMatch = pRegex.exec(xmlText)) !== null) {
            const pContent = pMatch[1];
            const tRegex = /<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g;
            let tMatch: RegExpExecArray | null;
            let pText = '';
            while ((tMatch = tRegex.exec(pContent)) !== null) {
              pText += tMatch[1];
            }
            if (pText.trim()) {
              paragraphs.push(pText.trim());
            }
          }
          return paragraphs.join('\n\n');
        }

        offset = dataOffset + compressedSize;
      } else {
        offset++;
      }
    }
    return '';
  } catch (err) {
    console.warn('Gagal mengekstrak teks DOCX:', err);
    return '';
  }
}

export async function parseUploadedFile(file: File): Promise<ParsedUploadFile> {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  if (!SUPPORTED_UPLOAD_EXTENSIONS.includes(ext)) {
    throw new Error(
      `Format ".${ext || 'tidak dikenal'}" tidak didukung. Gunakan PDF, DOCX, TXT, JPG, PNG, atau WEBP.`
    );
  }
  if (file.size > MAX_UPLOAD_FILE_SIZE) {
    throw new Error(`Ukuran file "${file.name}" melebihi batas maksimal 10 MB.`);
  }

  const id = `file_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
  const sizeLabel = formatFileSize(file.size);

  if (['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
    // Compress image to protect Netlify Functions request size limits
    const { file: compressedFile, base64 } = await compressImageFile(file);
    return {
      id,
      file: compressedFile,
      name: file.name,
      extension: ext.toUpperCase(),
      sizeLabel: formatFileSize(compressedFile.size),
      kind: 'image',
      mimeType: 'image/jpeg',
      base64Data: base64,
      previewUrl: URL.createObjectURL(compressedFile),
      statusNote: 'Foto catatan dioptimalkan & siap dianalisis oleh AI.',
    };
  }

  if (ext === 'txt') {
    const text = (await file.text()).trim();
    return {
      id,
      file,
      name: file.name,
      extension: 'TXT',
      sizeLabel,
      kind: 'text',
      mimeType: 'text/plain',
      extractedText: text,
      statusNote: text
        ? `Teks terbaca (${text.length} karakter).`
        : 'File TXT kosong.',
    };
  }

  if (ext === 'pdf') {
    const base64Data = await fileToBase64(file);
    return {
      id,
      file,
      name: file.name,
      extension: 'PDF',
      sizeLabel,
      kind: 'document',
      mimeType: 'application/pdf',
      base64Data,
      statusNote: 'Dokumen PDF siap diproses langsung oleh Gemini AI.',
    };
  }

  if (ext === 'docx') {
    const extracted = await extractTextFromDocx(file);
    return {
      id,
      file,
      name: file.name,
      extension: 'DOCX',
      sizeLabel,
      kind: 'document',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      extractedText: extracted,
      statusNote: extracted
        ? `Teks materi DOCX terbaca (${extracted.length} karakter).`
        : 'File DOCX siap diproses.',
    };
  }

  throw new Error(`Format file tidak didukung: ${ext}`);
}
