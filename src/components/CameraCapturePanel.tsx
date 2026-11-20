import { useEffect, useRef, useState } from 'react';
import { AlertCircle, Camera, Check, RefreshCw, Upload, X } from 'lucide-react';

interface CameraCapturePanelProps {
  remainingSlots: number;
  onCaptureFile: (file: File) => void;
  onClose: () => void;
  onSwitchToUpload: () => void;
}

export function CameraCapturePanel({
  remainingSlots,
  onCaptureFile,
  onClose,
  onSwitchToUpload,
}: CameraCapturePanelProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const previewUrlRef = useRef<string | null>(null);

  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [errorHint, setErrorHint] = useState<string>('');
  const [lastPreviewUrl, setLastPreviewUrl] = useState<string | null>(null);
  const [lastCapturedFile, setLastCapturedFile] = useState<File | null>(null);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const clearPreview = () => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    setLastPreviewUrl(null);
    setLastCapturedFile(null);
  };

  const startCamera = async () => {
    stopCamera();
    setStatus('loading');
    setErrorMessage('');
    setErrorHint('');

    if (typeof window !== 'undefined' && !window.isSecureContext) {
      setStatus('error');
      setErrorMessage('Kamera hanya dapat diakses melalui koneksi aman (HTTPS atau localhost).');
      setErrorHint('Gunakan tombol Upload Foto di bawah sebagai alternatif.');
      return;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setStatus('error');
      setErrorMessage('Browser yang Anda gunakan belum mendukung akses kamera langsung.');
      setErrorHint('Silakan gunakan tombol Upload Foto untuk memilih gambar dari perangkat.');
      return;
    }

    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setStatus('ready');
    } catch (err) {
      setStatus('error');
      const name = err instanceof Error ? err.name : '';
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        setErrorMessage('Izin akses kamera ditolak oleh browser.');
        setErrorHint(
          'Jika ingin mengaktifkan lagi, klik ikon gembok/kamera di sebelah kiri alamat website pada browser Anda, ubah izin Kamera menjadi Izinkan, lalu muat ulang halaman.'
        );
      } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        setErrorMessage('Perangkat ini tidak memiliki kamera yang terdeteksi.');
        setErrorHint('Anda tetap dapat menggunakan tombol Upload Foto untuk memasukkan catatan.');
      } else if (name === 'NotReadableError' || name === 'TrackStartError') {
        setErrorMessage('Kamera sedang digunakan oleh aplikasi lain.');
        setErrorHint('Tutup aplikasi lain yang memakai kamera lalu tekan Coba Lagi.');
      } else {
        setErrorMessage('Kamera tidak dapat dibuka saat ini.');
        setErrorHint('Periksa pengaturan browser Anda atau gunakan tombol Upload Foto.');
      }
    }
  };

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
      clearPreview();
    };
  }, []);

  const handleSnap = () => {
    if (!videoRef.current || !canvasRef.current || remainingSlots <= 0) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, width, height);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `catatan-kamera-${Date.now()}.jpg`, {
          type: 'image/jpeg',
        });
        clearPreview();
        const url = URL.createObjectURL(blob);
        previewUrlRef.current = url;
        setLastPreviewUrl(url);
        setLastCapturedFile(file);
      },
      'image/jpeg',
      0.92
    );
  };

  const handleUseCaptured = () => {
    if (!lastCapturedFile) return;
    onCaptureFile(lastCapturedFile);
    clearPreview();
  };

  return (
    <div className="rounded-2xl border border-neutral-300 bg-neutral-950 p-4 text-white sm:p-5 dark:border-neutral-700">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-bold">
          <Camera className="h-4 w-4 text-yellow-400" />
          <span>Kamera Aktif</span>
          <span className="font-normal text-neutral-400 tabular-nums">
            (Sisa kuota: {remainingSlots} foto)
          </span>
        </div>
        <button
          type="button"
          onClick={() => {
            stopCamera();
            clearPreview();
            onClose();
          }}
          className="inline-flex items-center gap-1 rounded-lg bg-neutral-800 px-2.5 py-1.5 text-xs font-semibold text-neutral-200 hover:bg-neutral-700"
        >
          <X className="h-3.5 w-3.5" />
          Tutup Kamera
        </button>
      </div>

      {status === 'error' ? (
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5 text-center">
          <AlertCircle className="mx-auto h-7 w-7 text-yellow-400" />
          <p className="mt-3 text-sm font-semibold text-white">{errorMessage}</p>
          {errorHint && (
            <p className="mx-auto mt-1.5 max-w-md text-xs leading-relaxed text-neutral-400">
              {errorHint}
            </p>
          )}
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={startCamera}
              className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-neutral-800"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Coba Lagi
            </button>
            <button
              type="button"
              onClick={() => {
                stopCamera();
                onSwitchToUpload();
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-yellow-400 px-4 py-2 text-xs font-bold text-neutral-950 hover:bg-yellow-300"
            >
              <Upload className="h-3.5 w-3.5" />
              Upload Foto
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="relative overflow-hidden rounded-xl bg-black">
            {lastPreviewUrl ? (
              <img
                src={lastPreviewUrl}
                alt="Hasil foto kamera"
                className="max-h-[420px] w-full object-contain"
              />
            ) : (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="max-h-[420px] w-full object-cover"
              />
            )}
            {status === 'loading' && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/70 text-xs text-neutral-300">
                Menghubungkan ke kamera perangkat...
              </div>
            )}
          </div>

          <canvas ref={canvasRef} className="hidden" />

          <div className="flex flex-wrap items-center justify-center gap-3">
            {lastPreviewUrl ? (
              <>
                <button
                  type="button"
                  onClick={clearPreview}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-700 px-4 py-2.5 text-xs font-semibold text-white hover:bg-neutral-800"
                >
                  <RefreshCw className="h-4 w-4" />
                  Ambil Ulang
                </button>
                <button
                  type="button"
                  onClick={handleUseCaptured}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-yellow-400 px-5 py-2.5 text-xs font-bold text-neutral-950 hover:bg-yellow-300"
                >
                  <Check className="h-4 w-4" />
                  Simpan ke Antrean
                </button>
              </>
            ) : (
              <button
                type="button"
                disabled={status !== 'ready' || remainingSlots <= 0}
                onClick={handleSnap}
                className="inline-flex items-center gap-2 rounded-full bg-yellow-400 px-6 py-3 text-xs font-extrabold text-neutral-950 transition-colors hover:bg-yellow-300 disabled:opacity-50"
              >
                <Camera className="h-4 w-4" />
                {remainingSlots <= 0 ? 'Batas 10 Foto Tercapai' : 'Ambil Foto'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
