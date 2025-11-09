import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
// import { useAuth } from '../context/AuthContext';

// Lazy-load jsQR from CDN to avoid adding local deps
const loadScript = (src: string) => new Promise<void>((resolve, reject) => {
  const s = document.createElement('script');
  s.src = src; s.async = true;
  s.onload = () => resolve();
  s.onerror = () => reject(new Error('Failed to load ' + src));
  document.head.appendChild(s);
});
const ensureJsQR = async () => {
  if (window.jsQR) return;
  try {
    await loadScript('https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js');
  } catch {
    await loadScript('https://unpkg.com/jsqr@1.4.0/dist/jsQR.js');
  }
};

declare global {
  interface Window { jsQR?: any }
}

const isHttpUrl = (u: string) => {
  try { const url = new URL(u); return url.protocol === 'http:' || url.protocol === 'https:'; } catch { return false; }
};

const QRQuest: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(true);
  // No overlay UI; we navigate directly on successful scan
  const [loading, setLoading] = useState(true);
  const streamRef = useRef<MediaStream | null>(null);
  const navigate = useNavigate();
  const [showHelp, setShowHelp] = useState(false);
  // const { user } = useAuth();

  useEffect(() => {
    // Prevent second getUserMedia after scanning finishes: only init when scanning===true
    if (!scanning) return; // when scanning toggles to false effect re-runs but exits early
    let stream: MediaStream | null = null;
    let raf = 0;
    let lastScan = 0;

    const init = async () => {
      try {
        setLoading(true);
        await ensureJsQR();
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error('Камера не поддерживается этим устройством/браузером');
        }
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
        streamRef.current = stream;
        if (!videoRef.current) return;
        videoRef.current.srcObject = stream;
        try {
          await videoRef.current.play();
        } catch (e: any) {
          // Ignore benign Chrome warning: play() interrupted by a new load request
          const msg = e?.message || '';
          if (!msg.includes('The play() request was interrupted by a new load request')) {
            setError(msg || 'Не удалось запустить видео');
          }
        }
        setLoading(false);

        const tick = () => {
          raf = requestAnimationFrame(tick);
          if (!scanning || !videoRef.current || !canvasRef.current) return;
          const now = performance.now();
          if (now - lastScan < 80) return; // ~12.5 fps
          lastScan = now;

          const video = videoRef.current;
          const canvas = canvasRef.current;
          const w = video.videoWidth;
          const h = video.videoHeight;
          if (w === 0 || h === 0) return;
          canvas.width = w; canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (!ctx) return;
          ctx.drawImage(video, 0, 0, w, h);
          const img = ctx.getImageData(0, 0, w, h);
          try {
            const code = window.jsQR?.(img.data, w, h, { inversionAttempts: 'dontInvert' });
            if (code?.data) {
              const raw = String(code.data).trim();
              try { streamRef.current?.getTracks().forEach(t => t.stop()); } catch {}
              setScanning(false);
              // Expecting either full http(s) URL or internal reward pattern like qr-reward:isTranscribed
              if (isHttpUrl(raw)) {
                // If QR points to same-origin SPA route -> use client-side navigation to avoid full reload & 404 on static hosting.
                try {
                  const url = new URL(raw);
                  const sameOrigin = url.origin === window.location.origin;
                  if (sameOrigin) {
                    navigate(url.pathname + url.search + url.hash);
                  } else {
                    window.location.assign(raw);
                  }
                } catch {
                  window.location.assign(raw);
                }
              } else if (raw.startsWith('qr-reward:')) {
                const feature = raw.split(':')[1];
                navigate(`/qr-reward/${feature}`);
              } else {
                setError('Неизвестный формат QR');
              }
            }
          } catch (e: any) {
            // ignore transient decode errors
          }
        };
        raf = requestAnimationFrame(tick);
      } catch (e: any) {
        const msg = e?.message || String(e);
        if (!msg.includes('The play() request was interrupted by a new load request')) {
          setError(msg);
        }
        setLoading(false);
      }
    };

    init();
    return () => {
      cancelAnimationFrame(raf);
      try { (streamRef.current || stream)?.getTracks().forEach(t => t.stop()); } catch {}
    };
  }, [scanning]);

  return (
    <div className="relative min-h-screen bg-background text-text-primary">
      {/* Help button and modal */}
      <div className="absolute top-0 left-0 p-4 z-50">
        <button
          className="px-3 py-1 text-[11px] bg-white/10 text-white border border-white/20 rounded"
          onClick={() => setShowHelp(true)}
        >Как пройти</button>
      </div>
  {/* Video preview */}
  <video ref={videoRef} className="w-full h-[calc(100vh-4rem)] object-cover" playsInline muted autoPlay />
      <canvas ref={canvasRef} className="hidden" />

      {/* Overlay frame */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="w-64 h-64 rounded-xl border-2 border-primary shadow-[0_0_20px_rgba(64,224,208,0.6)]" />
      </div>

      {/* HUD */}
      <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between">
        <div className="text-xs text-white/80 bg-black/40 px-3 py-1 rounded">Наведите камеру на QR‑код</div>
        <a href="/event" className="text-xs text-primary underline">Назад</a>
      </div>

      {/* Loading */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="text-white text-sm">Запуск камеры...</div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-surface border border-border-color text-xs text-white px-3 py-2 rounded">
          {error}
        </div>
      )}

      {/* No overlay after scan; direct navigation happens immediately */}
      {showHelp && (
        <div className="absolute inset-0 flex items-center justify-center p-6 z-50">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowHelp(false)} />
          <div className="relative bg-surface border border-border-color rounded-xl p-4 text-xs leading-relaxed max-w-md w-full">
            <div className="font-semibold text-primary mb-2">Как пройти QR‑ивент</div>
            <ol className="list-decimal list-inside space-y-1 text-text-secondary">
              <li>Разрешите доступ к камере.</li>
              <li>Наведите рамку на QR‑код так, чтобы он полностью поместился.</li>
              <li>Если код содержит ссылку на внутреннюю страницу — произойдёт мгновенный переход.</li>
              <li>Специальные коды формата qr-reward:feature откроют страницу награды.</li>
            </ol>
            <div className="mt-3 text-right">
              <button onClick={() => setShowHelp(false)} className="px-3 py-1 text-[11px] bg-primary/20 text-primary border border-primary/40 rounded">Понятно</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QRQuest;
