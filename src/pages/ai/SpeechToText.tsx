import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';

// This page records microphone audio, tries to produce MP4 natively,
// falls back to WebM, and if needed, transcodes to MP4 via ffmpeg.wasm before uploading.

type RecorderState = 'idle' | 'recording' | 'stopping' | 'ready';

const preferredTypes = [
  'audio/mp4;codecs=mp4a.40.2',
  'audio/mp4',
  'video/mp4',
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/ogg',
];

const SpeechToText: React.FC = () => {
  const [state, setState] = useState<RecorderState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [mime, setMime] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [transcribedText, setTranscribedText] = useState<string | null>(null);
  const [serverMessage, setServerMessage] = useState<string | null>(null);
  const [ffmpegProgress, setFfmpegProgress] = useState<number | null>(null);
  const { user, awardCoins } = useAuth();
  const [awarding, setAwarding] = useState(false);
  const [awardError, setAwardError] = useState<string | null>(null);

  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<number | null>(null);

  useEffect(() => () => { stopTimer(); stopStream(); }, []);

  const startTimer = () => {
    stopTimer();
    const started = Date.now();
    timerRef.current = window.setInterval(() => {
      setDuration(Math.floor((Date.now() - started) / 1000));
    }, 500) as unknown as number;
  };
  const stopTimer = () => {
    if (timerRef.current) { clearInterval(timerRef.current as any); timerRef.current = null; }
  };
  const stopStream = () => {
    try { mediaStreamRef.current?.getTracks().forEach(t => t.stop()); } catch {}
    mediaStreamRef.current = null;
  };

  const pickMime = (): string | null => {
    if (!(window as any).MediaRecorder) return null;
    for (const t of preferredTypes) {
      if ((window as any).MediaRecorder.isTypeSupported?.(t)) return t;
    }
    return null;
  };

  const start = async () => {
    setError(null);
    setDuration(0);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      const type = pickMime();
      setMime(type || '');
      const rec = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
      chunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunksRef.current.push(e.data); };
      rec.onstop = () => { setState('ready'); stopTimer(); stopStream(); };
      rec.onerror = (e) => { setError((e as any).error?.message || 'Ошибка записи'); };
      recorderRef.current = rec;
      rec.start(500); // collect chunks
      setState('recording');
      startTimer();
    } catch (e: any) {
      setError(e?.message || 'Нет доступа к микрофону');
    }
  };

  const stop = () => {
    if (recorderRef.current && state === 'recording') {
      setState('stopping');
      recorderRef.current.stop();
    }
  };

  const ensureMp4 = async (blob: Blob): Promise<Blob> => {
    if (mime.includes('mp4')) return blob;
    // Try to transcode WebM/Ogg -> MP4 using ffmpeg.wasm (loaded on demand)
    setFfmpegProgress(0);
    try {
      // dynamic load from CDN to avoid bundling
      const ffmpegModuleUrl = 'https://unpkg.com/@ffmpeg/ffmpeg@0.12.6/dist/ffmpeg.min.js';
      await new Promise<void>((resolve, reject) => {
        const s = document.createElement('script');
        s.src = ffmpegModuleUrl; s.async = true;
        s.onload = () => resolve();
        s.onerror = () => reject(new Error('Не удалось загрузить ffmpeg.wasm'));
        document.head.appendChild(s);
      });
      const coreUrl = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/ffmpeg-core.js';

      // @ts-ignore
      const { createFFmpeg } = (window as any).FFmpeg || (window as any)['@ffmpeg/ffmpeg'];
      if (!createFFmpeg) throw new Error('FFmpeg не инициализирован');
      const ffmpeg = createFFmpeg({ log: false, corePath: coreUrl });
      await ffmpeg.load();
      const arrayBuf = await blob.arrayBuffer();
      ffmpeg.FS('writeFile', 'input.webm', new Uint8Array(arrayBuf));
      ffmpeg.setProgress(({ ratio }: any) => setFfmpegProgress(Math.round(ratio * 100)));
      await ffmpeg.run('-i', 'input.webm', '-c:a', 'aac', '-b:a', '128k', '-movflags', 'faststart', 'out.mp4');
      const out = ffmpeg.FS('readFile', 'out.mp4');
      setFfmpegProgress(null);
      return new Blob([out.buffer], { type: 'audio/mp4' });
    } catch (e: any) {
      setFfmpegProgress(null);
      throw new Error(e?.message || 'Не удалось конвертировать в MP4');
    }
  };

  const upload = async () => {
    setError(null);
  setUploading(true);
  setTranscribedText(null);
  setServerMessage(null);
    try {
      const raw = new Blob(chunksRef.current, { type: mime || 'application/octet-stream' });
      const mp4 = await ensureMp4(raw);
      const fd = new FormData();
      fd.append('file', mp4, 'audio.mp4');
  const res = await fetch('https://tou-event.ddns.net/api/v1/qr-code/transcribe', {
        method: 'POST',
        headers: user?.telegramId ? { Authorization: user.telegramId } : undefined,
        body: fd
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`Ошибка загрузки (${res.status}): ${text || 'unknown'}`);
      }
      try {
        const data = await res.json();
        if (typeof data?.text === 'string') setTranscribedText(data.text);
        if (typeof data?.message === 'string') setServerMessage(data.message);
      } catch {
        // ignore json parse errors
      }
    } catch (e: any) {
      setError(e?.message || 'Ошибка отправки');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-text-primary p-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-lg font-bold text-primary mb-4">Audio → Text (запись и отправка на бэк)</h1>

        <div className="bg-surface border border-border-color rounded p-3 space-y-3">
          <div className="text-[11px] text-text-secondary">Формат записи: {mime || '—'}</div>
          <div className="flex gap-2">
            <button onClick={start} disabled={state==='recording'} className="px-3 py-1 bg-primary/20 text-primary border border-primary/40 rounded text-sm disabled:opacity-50">Запись</button>
            <button onClick={stop} disabled={state!=='recording'} className="px-3 py-1 bg-white/10 text-white border border-white/20 rounded text-sm disabled:opacity-50">Стоп</button>
            <button onClick={upload} disabled={state!=='ready' || uploading} className="px-3 py-1 bg-primary/20 text-primary border border-primary/40 rounded text-sm disabled:opacity-50">Отправить</button>
          </div>
          <div className="text-xs">Длительность: {duration}s</div>
          {ffmpegProgress !== null && (
            <div className="text-[11px] text-text-secondary">Конвертация в MP4: {ffmpegProgress}%</div>
          )}
          {error && (
            <div className="text-[11px] text-red-400">{error}</div>
          )}
          {uploading && <div className="text-[11px] text-text-secondary">Загрузка...</div>}
          {transcribedText && (
            <div className="text-xs mt-2">
              <div className="font-semibold text-primary mb-1">Результат:</div>
              <div className="text-white/90 break-words">{transcribedText}</div>
              {serverMessage && <div className="text-[10px] text-text-secondary mt-1">{serverMessage}</div>}
              {!user?.isTranscribed && (
                <div className="mt-2">
                  <button
                    disabled={awarding}
                    onClick={async () => {
                      setAwardError(null); setAwarding(true);
                      try { await awardCoins('isTranscribed', 50); } catch (e:any){ setAwardError(e?.message||'Ошибка награды'); } finally { setAwarding(false); }
                    }}
                    className="px-3 py-1 bg-primary/20 text-primary border border-primary/40 rounded text-xs disabled:opacity-50"
                  >{awarding ? 'Начисление...' : 'Ознакомиться (награда)'}
                  </button>
                  {awardError && <div className="text-[10px] text-red-400 mt-1">{awardError}</div>}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SpeechToText;
