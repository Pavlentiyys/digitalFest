import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
// import { useAuth } from '../../context/AuthContext';

// Helper to dynamically load external scripts only once (classic <script>)
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

// Helper to dynamically load external CSS using <link>
const loadCss = (href: string) => {
  return new Promise<void>((resolve, reject) => {
    const existing = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
      .find((l) => (l as HTMLLinkElement).href === href) as HTMLLinkElement | undefined;
    if (existing) return resolve();
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.addEventListener('load', () => resolve());
    link.addEventListener('error', () => reject(new Error(`Failed to load CSS ${href}`)));
    document.head.appendChild(link);
  });
};


// Try multiple CDNs/versions as fallbacks for classic scripts / css
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

const loadCssOneOf = async (urls: string[]) => {
  let lastErr: any;
  for (const url of urls) {
    try {
      await loadCss(url);
      return;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error('Failed to load any of the provided CSS URLs');
};

// Ensure classic UMD globals (window.THREE, window.MINDAR.IMAGE)
const ensureMindARGlobals = async () => {
  // THREE first
  await loadOneOf([
    '/libs/three.min.js',
    'https://cdn.jsdelivr.net/npm/three@0.146.0/build/three.min.js',
    'https://cdn.jsdelivr.net/npm/three@0.152.2/build/three.min.js',
    'https://unpkg.com/three@0.146.0/build/three.min.js',
  ]);
  // MindAR UMD bundle (stable 1.1.5 first)
  await loadOneOf([
    '/libs/mindar-image-three.prod.js',
    'https://cdn.jsdelivr.net/npm/mind-ar@1.1.5/dist/mindar-image-three.prod.js',
    'https://cdn.jsdelivr.net/npm/mind-ar@1.2.0/dist/mindar-image-three.prod.js',
    'https://cdn.jsdelivr.net/npm/mind-ar@1.2.4/dist/mindar-image-three.prod.js',
    'https://unpkg.com/mind-ar@1.1.5/dist/mindar-image-three.prod.js',
  ]);
  // MindAR CSS (not strictly required, but gives default styles & z-index layering). Ignore errors.
  try {
    await loadCssOneOf([
      '/libs/mindar-image-three.prod.css',
      'https://cdn.jsdelivr.net/npm/mind-ar@1.1.5/dist/mindar-image-three.prod.css',
      'https://cdn.jsdelivr.net/npm/mind-ar@1.2.4/dist/mindar-image-three.prod.css',
      'https://unpkg.com/mind-ar@1.1.5/dist/mindar-image-three.prod.css',
    ]);
  } catch {/* optional */}
  if (!(window as any).THREE) throw new Error('THREE global not found after loading script');
  if (!(window as any).MINDAR || !(window as any).MINDAR.IMAGE) {
    throw new Error('MindAR UMD global not found (window.MINDAR.IMAGE missing)');
  }
};

// Ensure GLTFLoader (non-module build) is available on window.THREE
const ensureGLTFLoader = async () => {
  if ((window as any).THREE?.GLTFLoader) return;
  await loadOneOf([
    'https://cdn.jsdelivr.net/npm/three@0.146.0/examples/js/loaders/GLTFLoader.js',
    'https://cdn.jsdelivr.net/npm/three@0.152.2/examples/js/loaders/GLTFLoader.js',
    'https://unpkg.com/three@0.146.0/examples/js/loaders/GLTFLoader.js',
  ]);
  if (!(window as any).THREE?.GLTFLoader) throw new Error('GLTFLoader not available');
};

const findTargetPath = async (): Promise<string> => {
  const candidates = ['/targets/target.mind', '/target/target.mind'];
  for (const c of candidates) {
    try {
      const res = await fetch(c, { method: 'GET', cache: 'no-store' });
      if (!res.ok) continue;
      const ct = res.headers.get('content-type') || '';
      if (ct.includes('text/html')) continue; // SPA fallback => wrong
      const buf = await res.arrayBuffer();
      if (buf.byteLength > 0) return c;
    } catch {
      // try next
    }
  }
  // default guess
  return '/targets/target.mind';
};

// (Deprecated) Texture-based coin generator was replaced by GLTF models from public/objects

const ARImage: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingStep, setLoadingStep] = useState<string>('Подготовка...');
  const [attempt, setAttempt] = useState(1);
  // Debug flags (kept for potential future HUD; currently unused -> removed to silence lint)
  // const [hasTHREE, setHasTHREE] = useState<boolean>(!!(window as any).THREE);
  // const [hasMINDAR, setHasMINDAR] = useState<boolean>(!!((window as any).MINDAR && (window as any).MINDAR.IMAGE));
  // const [resolvedTarget, setResolvedTarget] = useState<string>('');
//   const { user } = useAuth();
  // derive visibility from activeCoin, no separate flag
  const [activeCoin, setActiveCoin] = useState<null | 'btc' | 'eth' | 'doge'>(null);
  // const isSecure = typeof window !== 'undefined' ? (window.isSecureContext || window.location.hostname === 'localhost') : false; // unused
  const navigate = useNavigate();
  const [showHelp, setShowHelp] = useState(false);
  const [needsGesture, setNeedsGesture] = useState(false);
  const mindarRef = useRef<any>(null);

  useEffect(() => {
  let stopped = false;
    let mindarThree: any;
    let renderer: any;
    let scene: any;
    let camera: any;
  let modelBTC: any;
  let modelETH: any;
  let modelDOGE: any;
    let fallbackVideo: HTMLVideoElement | null = null; // raw getUserMedia fallback
    // use window globals for UMD

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
  await withTimeout(ensureMindARGlobals(), 12000, 'загрузка скриптов');
  await withTimeout(ensureGLTFLoader(), 8000, 'загрузка GLTFLoader');
  // Globals loaded
        if (!containerRef.current) return;

        setLoadingStep('Поиск файла таргета...');
  const targetSrc = await withTimeout(findTargetPath(), 3000, 'поиск target.mind');

        // Initialize MindAR (UMD)
        if (!(window as any).MINDAR || !(window as any).MINDAR.IMAGE) {
          throw new Error('MindAR UMD did not initialize (window.MINDAR.IMAGE missing)');
        }

        setLoadingStep('Инициализация камеры...');
        const srcWithBust = (targetSrc + (targetSrc.includes('?') ? '&' : '?') + 'v=' + Math.floor(Date.now() / 30000));
        mindarThree = new (window as any).MINDAR.IMAGE.MindARThree({
          container: containerRef.current,
          imageTargetSrc: srcWithBust,
          // hide default scanning/loading overlay (that square you see)
          uiLoading: false,
          uiScanning: false,
        });
        mindarRef.current = mindarThree;

        const context = mindarThree;
        renderer = context.renderer;
        scene = context.scene;
        camera = context.camera;

    // Add light
    const light = new (window as any).THREE.HemisphereLight(0xffffff, 0x444444, 1.2);
        scene.add(light);

    // Helper to load and fit GLTF/GLB model
    const loadAndFitModel = async (url: string, targetSize = 0.9) => {
      const loader = new (window as any).THREE.GLTFLoader();
      const gltf = await loader.loadAsync(url);
      const obj = gltf.scene || gltf.scenes?.[0];
      if (!obj) return null;
      // Normalize scale
      const box = new (window as any).THREE.Box3().setFromObject(obj);
      const size = new (window as any).THREE.Vector3();
      box.getSize(size);
      const maxDim = Math.max(size.x, size.y, size.z) || 1;
      const s = targetSize / maxDim;
      obj.scale.setScalar(s);
      // Optional small elevation to avoid z-fighting
      obj.position.set(0, 0, 0);
      return obj;
    };

    // Anchors: 0 BTC, 1 ETH, 2 DOGE (target.mind must contain 3 targets)
    const anchorBTC = mindarThree.addAnchor(0);
    const groupBTC = new (window as any).THREE.Group();
    anchorBTC.group.add(groupBTC);
    try {
      modelBTC = await loadAndFitModel('/objects/bitcoin.glb');
      if (modelBTC) groupBTC.add(modelBTC);
    } catch {}
    groupBTC.visible = false;
  anchorBTC.onTargetFound = () => { groupBTC.visible = true; setActiveCoin('btc'); console.log('[AR] BTC detected (anchor 0)'); };
    anchorBTC.onTargetLost  = () => { groupBTC.visible = false; setActiveCoin(c => c==='btc'?null:c); };

    try {
      const anchorETH = mindarThree.addAnchor(1);
      const groupETH = new (window as any).THREE.Group();
      anchorETH.group.add(groupETH);
      try {
        modelETH = await loadAndFitModel('/objects/ethereum.glb');
        if (modelETH) groupETH.add(modelETH);
      } catch {}
      groupETH.visible = false;
  anchorETH.onTargetFound = () => { groupETH.visible = true; setActiveCoin('eth'); console.log('[AR] ETH detected (anchor 1)'); };
      anchorETH.onTargetLost  = () => { groupETH.visible = false; setActiveCoin(c => c==='eth'?null:c); };
    } catch {/* if target.mind has only one target, ignore */}

    try {
      const anchorDOGE = mindarThree.addAnchor(2);
      const groupDOGE = new (window as any).THREE.Group();
      anchorDOGE.group.add(groupDOGE);
      try {
        modelDOGE = await loadAndFitModel('/objects/dogecoin.glb');
        if (modelDOGE) groupDOGE.add(modelDOGE);
      } catch {}
      groupDOGE.visible = false;
  anchorDOGE.onTargetFound = () => { groupDOGE.visible = true; setActiveCoin('doge'); console.log('[AR] DOGE detected (anchor 2)'); };
      anchorDOGE.onTargetLost  = () => { groupDOGE.visible = false; setActiveCoin(c => c==='doge'?null:c); };
    } catch {/* ignore when no 3rd target */}

        let startedOk = false;
        try {
          await withTimeout(mindarThree.start(), 8000, 'запуск камеры/AR');
          startedOk = true;
        } catch (err) {
          // Some environments (iOS/Telegram WebApp) require a user gesture to start the camera
          setNeedsGesture(true);
        }

        if (!startedOk) {
          if (!stopped) {
            setLoading(false);
          }
          return; // wait for user gesture to start
        }

        // Ensure MindAR video/canvas are visible and sized correctly
        try {
          const v: HTMLVideoElement | undefined = mindarThree.video;
          if (v) {
            v.setAttribute('playsinline', 'true');
            v.setAttribute('muted', 'true');
            v.setAttribute('autoplay', 'true');
            v.playsInline = true; v.muted = true;
            v.style.position = 'absolute';
            v.style.inset = '0';
            v.style.width = '100%';
            v.style.height = '100%';
            v.style.objectFit = 'cover';
            v.style.zIndex = '1';
            try { await v.play(); } catch {/* ignore */}
          }
          const canvas: HTMLCanvasElement | undefined = mindarThree.renderer?.domElement;
          if (canvas) {
            canvas.style.position = 'absolute';
            canvas.style.inset = '0';
            canvas.style.width = '100%';
            canvas.style.height = '100%';
            canvas.style.zIndex = '2';
            canvas.style.pointerEvents = 'none';
          }
        } catch {/* ignore */}

        // If for some reason video track didn't start (some mobile browsers), attempt a manual probe and append raw video as fallback behind MindAR canvas.
        const hasVideoTrack = !!mindarThree.video && mindarThree.video.srcObject && (mindarThree.video.srcObject as MediaStream).getVideoTracks().length > 0;
        if (!hasVideoTrack) {
          try {
            const rawStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
            fallbackVideo = document.createElement('video');
            fallbackVideo.setAttribute('playsinline','true');
            fallbackVideo.setAttribute('muted','true');
            fallbackVideo.setAttribute('autoplay','true');
            fallbackVideo.playsInline = true;
            fallbackVideo.muted = true;
            fallbackVideo.autoplay = true;
            fallbackVideo.style.position = 'absolute';
            fallbackVideo.style.inset = '0';
            fallbackVideo.style.width = '100%';
            fallbackVideo.style.height = '100%';
            fallbackVideo.style.objectFit = 'cover';
            fallbackVideo.style.zIndex = '0';
            fallbackVideo.srcObject = rawStream;
            containerRef.current?.appendChild(fallbackVideo);
            await fallbackVideo.play().catch(() => undefined);
          } catch {/* ignore */}
        } else {
          // ensure play
          try { await mindarThree.video.play(); } catch {/* ignore */}
        }

        renderer.setAnimationLoop(() => {
          if (modelBTC && modelBTC.parent?.visible) modelBTC.rotation.y += 0.01;
          if (modelETH && modelETH.parent?.visible) modelETH.rotation.y += 0.01;
          if (modelDOGE && modelDOGE.parent?.visible) modelDOGE.rotation.y += 0.01;
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
        let rootCauseHint = '';
        const msg = String(e?.message || '');
        if (/Extra \d+ byte\(s\) found|decodeSingleSync|importData/.test(msg)) {
          rootCauseHint = 'Файл target.mind не найден или отдается как HTML. Убедитесь, что public/targets/target.mind существует и доступен (не index.html).';
        } else if (/MindAR/.test(msg)) {
          rootCauseHint = 'MindAR не загрузился (CDN/сеть).';
        }
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
        if (fallbackVideo?.srcObject) {
          (fallbackVideo.srcObject as MediaStream).getTracks().forEach(t => t.stop());
        }
        fallbackVideo?.remove();
      } catch {
        // ignore
      }
    };
  }, [attempt]);

  const handleGestureStart = async () => {
    const ctx = mindarRef.current;
    if (!ctx) return;
    try {
      setError(null);
      setLoading(true);
      setLoadingStep('Запуск камеры...');
      await ctx.start();
      // Ensure video/canvas styling
      try {
        const v: HTMLVideoElement | undefined = ctx.video;
        if (v) {
          v.setAttribute('playsinline', 'true');
          v.setAttribute('muted', 'true');
          v.setAttribute('autoplay', 'true');
          v.playsInline = true; v.muted = true;
          v.style.position = 'absolute';
          v.style.inset = '0';
          v.style.width = '100%';
          v.style.height = '100%';
          v.style.objectFit = 'cover';
          v.style.zIndex = '1';
          try { await v.play(); } catch {/* ignore */}
        }
        const canvas: HTMLCanvasElement | undefined = ctx.renderer?.domElement;
        if (canvas) {
          canvas.style.position = 'absolute';
          canvas.style.inset = '0';
          canvas.style.width = '100%';
          canvas.style.height = '100%';
          canvas.style.zIndex = '2';
          canvas.style.pointerEvents = 'none';
        }
      } catch {/* ignore */}
      // Render loop (re-assign to be safe)
      const renderer = ctx.renderer;
      const scene = ctx.scene;
      const camera = ctx.camera;
      renderer.setAnimationLoop(() => {
        renderer.render(scene, camera);
      });
      setNeedsGesture(false);
    } catch (e: any) {
      setError(e?.message || 'Не удалось запустить камеру');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-background text-text-primary">
      <div ref={containerRef} className="relative w-full h-[calc(100vh-4rem)] overflow-hidden bg-black">
        {/* MindAR will inject its own canvas & video elements here. */}
      </div>

      {/* HUD */}
      <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between pointer-events-none">
        <div className="text-xs text-white/80 bg-black/40 px-3 py-1 rounded pointer-events-auto">
          Наведите камеру на целевое изображение
        </div>
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            className="px-3 py-1 text-[11px] bg-white/10 text-white border border-white/20 rounded"
            onClick={() => setShowHelp(true)}
          >Как пройти</button>
          <a href="/event" className="text-xs text-primary underline">
            Назад
          </a>
        </div>
      </div>
      {/* Bottom-centered details button (appears when any model/marker visible) */}
      {activeCoin && (
        <div className="pointer-events-none absolute bottom-4 left-0 right-0 flex justify-center">
          <button
            className="pointer-events-auto px-4 py-2 text-[12px] bg-primary text-background rounded-md border border-primary/60 shadow hover:opacity-90"
            onClick={() => navigate(`/ar-fact/${activeCoin}`)}
          >Подробнее о {activeCoin.toUpperCase()}</button>
        </div>
      )}

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
          </div>
        </div>
      )}
      {/* Tap-to-start overlay when user gesture is required */}
      {needsGesture && !loading && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 p-4">
          <button
            className="px-5 py-3 rounded-md bg-primary text-background text-[12px] border border-primary/60 shadow"
            onClick={handleGestureStart}
          >Нажмите, чтобы запустить AR</button>
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
      {/* Help modal */}
      {showHelp && (
        <div className="absolute inset-0 flex items-center justify-center p-6 z-50">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowHelp(false)} />
          <div className="relative bg-surface border border-border-color rounded-xl p-4 text-xs leading-relaxed max-w-md w-full">
            <div className="font-semibold text-primary mb-2">Как пройти AR‑ивент</div>
            <ol className="list-decimal list-inside space-y-1 text-text-secondary">
              <li>Разрешите доступ к камере в Telegram WebApp.</li>
              <li>Наведите камеру на изображение‑маркер (target).</li>
              <li>Дождитесь появления 3D‑монеты — она вращается.</li>
              <li>Нажмите «Подробнее», чтобы открыть страницу факта и получить награду.</li>
            </ol>
            <div className="mt-3 text-[10px] text-text-secondary">Подсказка: если монета не появляется — перезапустите (кнопка Повторить) или проверьте файл target.mind.</div>
            <div className="mt-3 text-right">
              <button onClick={() => setShowHelp(false)} className="px-3 py-1 text-[11px] bg-primary/20 text-primary border border-primary/40 rounded">Понятно</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ARImage;
