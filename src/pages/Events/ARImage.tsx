import React, { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    MINDAR: any;
    THREE: any;
  }
}

// Helper to dynamically load external scripts only once
const loadScript = (src: string) => {
  return new Promise<void>((resolve, reject) => {
    // If the script already exists, resolve immediately
    const existing = document.querySelector(`script[src="${src}"]`) as HTMLScriptElement | null;
    if (existing) {
      if ((existing as any)._loaded) return resolve();
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error(`Failed to load ${src}`)));
      return;
    }

    const script = document.createElement('script');
  script.src = src;
  script.async = false; // preserve order
  script.defer = false;
    (script as any)._loaded = false;
    script.addEventListener('load', () => {
      (script as any)._loaded = true;
      resolve();
    });
    script.addEventListener('error', () => reject(new Error(`Failed to load ${src}`)));
    document.head.appendChild(script);
  });
};

// Try multiple CDNs/versions as fallbacks
const loadOneOf = async (urls: string[]) => {
  let lastErr: any;
  for (const url of urls) {
    try {
      await loadScript(url);
      return;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error('Failed to load any of the provided URLs');
};

const ensureMindARScripts = async () => {
  // If already present, skip loading
  if ((window as any).THREE && (window as any).MINDAR && (window as any).MINDAR.IMAGE) {
    return;
  }
  // Prefer local files (public/libs) for reliability, fall back to CDNs
  // Load Three FIRST (some mindar builds expect global THREE)
  try {
    await loadOneOf([
      '/libs/three.min.js',
      'https://cdn.jsdelivr.net/npm/three@0.152.2/build/three.min.js',
      'https://unpkg.com/three@0.152.2/build/three.min.js',
    ]);
  } catch (e) {
    console.warn('[ARImage] Failed to load THREE from local/CDN', e);
    throw e;
  }

  // MindAR image + three integration
  try {
    await loadOneOf([
      '/libs/mindar-image-three.prod.js',
      'https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-image-three.prod.js',
      'https://cdn.jsdelivr.net/npm/mind-ar@1.2.4/dist/mindar-image-three.prod.js',
      'https://unpkg.com/mind-ar@1.2.5/dist/mindar-image-three.prod.js',
      'https://unpkg.com/mind-ar@1.2.4/dist/mindar-image-three.prod.js',
    ]);
  } catch (e) {
    console.warn('[ARImage] Failed to load MindAR image-three bundle; trying separated builds', e);
    await loadOneOf([
      'https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-image.prod.js',
      'https://unpkg.com/mind-ar@1.2.5/dist/mindar-image.prod.js',
    ]);
    await loadOneOf([
      'https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-image-three.prod.js',
      'https://unpkg.com/mind-ar@1.2.5/dist/mindar-image-three.prod.js',
    ]);
  }

  // Extra check/diagnostic
  if (!(window as any).MINDAR) {
    // Try to hint which file is missing
    try {
      const [threeRes, mindarRes] = await Promise.all([
        fetch('/libs/three.min.js', { method: 'GET' }),
        fetch('/libs/mindar-image-three.prod.js', { method: 'GET' }),
      ]);
      if (!threeRes.ok) {
        throw new Error('Не найден /libs/three.min.js (скопируйте файл в public/libs)');
      }
      if (!mindarRes.ok) {
        throw new Error('Не найден /libs/mindar-image-three.prod.js (скопируйте файл в public/libs)');
      }
    } catch (probeErr: any) {
      throw new Error(`window.MINDAR is undefined after loading scripts. Проверка файлов: ${probeErr?.message || probeErr}`);
    }
    throw new Error('window.MINDAR is undefined after loading scripts');
  }
  if (!(window as any).MINDAR.IMAGE) {
    throw new Error('window.MINDAR.IMAGE is undefined; mind-ar image tracking not available');
  }
};

const findTargetPath = async (): Promise<string> => {
  const candidates = ['/targets/target.mind', '/target/target.mind'];
  for (const c of candidates) {
    try {
      const res = await fetch(c, { method: 'GET' });
      if (res.ok) return c;
    } catch {
      // try next
    }
  }
  // default
  return '/targets/target.mind';
};

const makeCoinFaceTexture = (diameter = 512, bg = '#1b3439', fg = '#ffd166') => {
  const canvas = document.createElement('canvas');
  canvas.width = diameter;
  canvas.height = diameter;
  const ctx = canvas.getContext('2d')!;

  // background circle
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.arc(diameter / 2, diameter / 2, diameter / 2, 0, Math.PI * 2);
  ctx.fill();

  // inner rim
  ctx.strokeStyle = '#40e0d0';
  ctx.lineWidth = diameter * 0.03;
  ctx.beginPath();
  ctx.arc(diameter / 2, diameter / 2, diameter * 0.46, 0, Math.PI * 2);
  ctx.stroke();

  // bitcoin symbol (₿) or fallback B
  ctx.fillStyle = fg;
  ctx.font = `${Math.floor(diameter * 0.55)}px "Press Start 2P", system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const symbol = '₿';
  ctx.fillText(symbol, diameter / 2, diameter / 2 + diameter * 0.02);

  // subtle lines
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 20; i++) {
    const angle = (i / 20) * Math.PI * 2;
    const r1 = diameter * 0.2;
    const r2 = diameter * 0.46;
    ctx.beginPath();
    ctx.moveTo(diameter / 2 + Math.cos(angle) * r1, diameter / 2 + Math.sin(angle) * r1);
    ctx.lineTo(diameter / 2 + Math.cos(angle) * r2, diameter / 2 + Math.sin(angle) * r2);
    ctx.stroke();
  }

  const texture = new window.THREE.CanvasTexture(canvas);
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
};

const ARImage: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingStep, setLoadingStep] = useState<string>('Подготовка...');
  const [attempt, setAttempt] = useState(1);
  const [hasTHREE, setHasTHREE] = useState<boolean>(!!(window as any).THREE);
  const [hasMINDAR, setHasMINDAR] = useState<boolean>(!!((window as any).MINDAR && (window as any).MINDAR.IMAGE));
  const [resolvedTarget, setResolvedTarget] = useState<string>('');
  const isSecure = typeof window !== 'undefined' ? (window.isSecureContext || window.location.hostname === 'localhost') : false;

  useEffect(() => {
    let stopped = false;
    let mindarThree: any;
    let renderer: any;
  let scene: any;
  let camera: any;
  let coin: any;

    const withTimeout = async <T,>(p: Promise<T>, ms: number, label: string): Promise<T> => {
      return await Promise.race([
        p,
        new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`Таймаут: ${label}`)), ms)),
      ]);
    };

    const start = async () => {
      try {
        setLoading(true);
        setLoadingStep('Загрузка библиотек AR...');
  await withTimeout(ensureMindARScripts(), 8000, 'загрузка скриптов');
  setHasTHREE(!!(window as any).THREE);
  setHasMINDAR(!!((window as any).MINDAR && (window as any).MINDAR.IMAGE));
        if (!containerRef.current) return;

        setLoadingStep('Поиск файла таргета...');
  const targetSrc = await withTimeout(findTargetPath(), 3000, 'поиск target.mind');
  setResolvedTarget(targetSrc);
  console.info('[ARImage] Using target:', targetSrc);

        // Initialize MindAR
        if (!window.MINDAR || !window.MINDAR.IMAGE) {
          throw new Error('MindAR scripts did not initialize properly (MINDAR.IMAGE missing)');
        }

        setLoadingStep('Инициализация камеры...');
        mindarThree = new window.MINDAR.IMAGE.MindARThree({
          container: containerRef.current,
          imageTargetSrc: targetSrc,
          // ui: remove default if any
        });

        const context = mindarThree;
        renderer = context.renderer;
        scene = context.scene;
        camera = context.camera;

        // Add light
        const light = new window.THREE.HemisphereLight(0xffffff, 0x444444, 1.2);
        scene.add(light);

        // Anchor for first target (index 0)
        const anchor = mindarThree.addAnchor(0);
        const group = new window.THREE.Group();
        anchor.group.add(group);

        // Build a 3D Bitcoin-like coin in Three.js
        const radius = 0.45;
        const thickness = 0.12;
        const radialSeg = 64;
        const geo = new window.THREE.CylinderGeometry(radius, radius, thickness, radialSeg);

        const gold = new window.THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.85, roughness: 0.25 });
        const faceTex = makeCoinFaceTexture(512, '#0f262b', '#ffd166');
        const faceMat = new window.THREE.MeshStandardMaterial({ map: faceTex, metalness: 0.6, roughness: 0.35 });

        // Order: around (index 0), top (1), bottom (2)
        const materials = [gold, faceMat, faceMat];
        coin = new window.THREE.Mesh(geo, materials);
        coin.rotation.x = Math.PI / 2; // face towards camera
        coin.castShadow = false;
        coin.receiveShadow = false;
        group.add(coin);

        // Show/Hide coin with anchor visibility
        anchor.onTargetFound = () => {
          group.visible = true;
        };
        anchor.onTargetLost = () => {
          group.visible = false;
        };
        group.visible = false;

        await withTimeout(mindarThree.start(), 8000, 'запуск камеры/AR');

        renderer.setAnimationLoop(() => {
          if (coin && group.visible) {
            coin.rotation.z += 0.01;
          }
          renderer.render(scene, camera);
        });
        if (!stopped) {
          setLoading(false);
          setLoadingStep('Готово');
        }
      } catch (e: any) {
        console.error('[ARImage] init error:', e);
        const isLocalhost = typeof window !== 'undefined' && window.location.hostname === 'localhost';
        const advice = [
          '1) Разрешите доступ к камере (браузер спросит).',
          '2) Проверьте наличие файла цели: public/targets/target.mind или public/target/target.mind.',
          '3) Для мобильного устройства откройте по HTTPS (localhost допустим).',
          '4) Если экран пуст — возможно, CDN недоступен. Перезагрузите страницу.',
        ];
        const rootCauseHint = /MINDAR\.IMAGE/.test(e?.message || '')
          ? 'MindAR bundle не загрузился (CDN блокируется или версия изменилась).'
          : '';
        setError(
          `Не удалось запустить AR. ${isLocalhost ? '' : 'На iOS камера доступна только по HTTPS. '}\n\nПодсказки:\n${advice.join('\n')}\n\n${rootCauseHint}\nДетали: ${e?.message || e}`
        );
        setLoading(false);
      }
    };

    start();

    return () => {
      stopped = true;
      try {
        if (mindarThree) {
          mindarThree.stop();
          mindarThree.renderer.setAnimationLoop(null);
          mindarThree.renderer.dispose?.();
        }
      } catch {
        // ignore
      }
    };
  }, []);

  return (
    <div className="relative min-h-screen bg-background text-text-primary">
      <div ref={containerRef} className="w-full h-[calc(100vh-4rem)] overflow-hidden" />

      {/* HUD */}
      <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between pointer-events-none">
        <div className="text-xs text-white/80 bg-black/40 px-3 py-1 rounded pointer-events-auto">
          Наведите камеру на целевое изображение
        </div>
        <a href="/event" className="text-xs text-primary underline pointer-events-auto">
          Назад
        </a>
      </div>
      <div className="absolute bottom-2 left-2 text-[10px] text-white/80 bg-black/50 px-2 py-1 rounded space-y-0.5">
        <div>MindAR + Three (local/CDN)</div>
        <div>HTTPS/localhost: {isSecure ? 'ok' : 'нет'}</div>
        <div>THREE: {hasTHREE ? 'ok' : 'нет'}</div>
        <div>MINDAR.IMAGE: {hasMINDAR ? 'ok' : 'нет'}</div>
        <div>target: {resolvedTarget || '/targets/target.mind | /target/target.mind'}</div>
      </div>

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-surface/80 border border-border-color rounded-xl p-4 text-xs text-white max-w-sm w-full">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded-full bg-primary animate-ping" />
              <div>
                <div className="font-semibold">Инициализация AR...</div>
                <div className="text-[11px] opacity-80 mt-1">{loadingStep}</div>
                <div className="text-[10px] opacity-60 mt-1">Попытка: {attempt}</div>
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <button
                className="px-3 py-1 text-[11px] bg-primary/20 text-primary border border-primary/40 rounded"
                onClick={() => {
                  // retry by increasing attempt and re-running effect
                  setAttempt((a) => a + 1);
                  setError(null);
                  setLoading(true);
                }}
              >
                Повторить
              </button>
              <button
                className="px-3 py-1 text-[11px] bg-white/10 text-white border border-white/20 rounded"
                onClick={async () => {
                  // quick camera permission probe
                  try {
                    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                    stream.getTracks().forEach(t => t.stop());
                    alert('Камера доступна. Попробуйте ещё раз.');
                  } catch (err: any) {
                    alert('Нет доступа к камере: ' + (err?.message || err));
                  }
                }}
              >
                Проверить камеру
              </button>
            </div>
          </div>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center p-6">
          <div className="bg-surface border border-border-color rounded-xl p-4 text-xs leading-relaxed max-w-md text-center">
            {error}
            <ul className="text-text-secondary text-[10px] mt-3 list-disc list-inside text-left">
              <li>Положите target файл в public/targets/target.mind</li>
              <li>Рядом можно положить печатное изображение target.jpg</li>
              <li>Модель (необязательно): public/models/model.glb</li>
            </ul>
            <div className="mt-3 flex justify-center">
              <button
                className="px-3 py-1 text-[11px] bg-primary/20 text-primary border border-primary/40 rounded"
                onClick={() => {
                  setError(null);
                  setAttempt((a) => a + 1);
                  setLoading(true);
                }}
              >
                Повторить запуск
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ARImage;
