import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { BoltIcon, CameraIcon, CheckCircleIcon, XMarkIcon } from '@heroicons/react/24/solid';

type Target = {
  id: string;
  x: number; // 0..100 vw-relative within container
  y: number; // 0..100
  infoIndex: number;
  collected?: boolean;
};

const FACTS: { title: string; text: string; points: number }[] = [
  {
    title: 'Биткоин (BTC)',
    text: 'Первая криптовалюта, запущена в 2009 году. Рыночная капитализация — крупнейшая среди криптоактивов.',
    points: 50,
  },
  {
    title: 'Эфириум (ETH)',
    text: 'Платформа для смарт‑контрактов и dApp. Позволяет создавать токены и DeFi‑протоколы.',
    points: 50,
  },
  {
    title: 'Стейблкоины',
    text: 'Токены, привязанные к фиатным валютам (например, USDT, USDC) для снижения волатильности.',
    points: 50,
  },
  {
    title: 'NFT',
    text: 'Уникальные токены для учета цифровых прав на арт‑объекты, игровые предметы и т. д.',
    points: 50,
  },
  {
    title: 'Блокчейн',
    text: 'Распределённый реестр, обеспечивающий прозрачность и неизменность записей.',
    points: 50,
  },
];

// Вспомогательно: генерация псевдо‑UUID (устраивает для локальной логики)
const uid = () => Math.random().toString(36).slice(2, 10);

function ARGame() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [started, setStarted] = useState(false);
  const [targets, setTargets] = useState<Target[]>([]);
  const [score, setScore] = useState(0);
  const [modal, setModal] = useState<{ title: string; text: string; points: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { user, awardCoins } = useAuth();
  const [awarding, setAwarding] = useState(false);
  const [awardError, setAwardError] = useState<string | null>(null);
  const earned = targets.filter(t => t.collected).length > 0; // simple condition: collected at least one
  const [showHelp, setShowHelp] = useState(false);

  const MAX_TARGETS = 4;

  // Камера
  useEffect(() => {
    if (!started) return;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => undefined);
        }
      } catch (e: any) {
        setError('Нет доступа к камере. Разрешите доступ и обновите страницу.');
      }
    })();
    return () => {
      // cleanup
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [started]);

  // Инициализация целей
  useEffect(() => {
    if (!started) return;
    const spawn = () => {
      setTargets((prev) => {
        const active = prev.filter((t) => !t.collected);
        const need = Math.max(0, MAX_TARGETS - active.length);
        const appended: Target[] = [];
        for (let i = 0; i < need; i++) {
          appended.push({ id: uid(), ...randomPos(containerRef.current), infoIndex: Math.floor(Math.random() * FACTS.length) });
        }
        return [...active, ...appended];
      });
    };
    spawn();
    const id = setInterval(spawn, 3000);
    return () => clearInterval(id);
  }, [started]);

  const randomPos = (_container: HTMLDivElement | null) => {
    // В процентах от контейнера, с отступами, чтобы кликабельная область не выходила за края
    const pad = 8; // %
    const x = pad + Math.random() * (100 - 2 * pad);
    const y = pad + Math.random() * (100 - 2 * pad);
    return { x, y };
  };

  const handleHit = (t: Target) => {
    if (t.collected) return;
    const info = FACTS[t.infoIndex];
    setModal(info);
    setScore((s) => s + info.points);
    setTargets((prev) => prev.map((p) => (p.id === t.id ? { ...p, collected: true } : p)));
  };

  const hud = useMemo(
    () => (
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between text-[11px]">
        <div className="px-3 py-2 rounded-md bg-background/60 border border-border-color text-text-primary backdrop-blur">
          <span className="opacity-80">Очки:</span>{' '}
          <span className="text-primary font-bold">{score}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="px-3 py-2 rounded-md bg-background/60 border border-border-color text-text-secondary backdrop-blur">
            Целей: <span className="text-primary">{targets.filter((t) => !t.collected).length}</span>
          </div>
          <button
            onClick={() => setShowHelp(true)}
            className="px-3 py-2 rounded-md bg-background/60 border border-border-color text-text-primary hover:border-primary"
          >Как играть</button>
        </div>
      </div>
    ),
    [score, targets]
  );

  return (
    <div className="bg-background min-h-screen">
      <div className="max-w-4xl mx-auto p-4">
        <h1 className="text-2xl font-bold text-text-primary mb-2">AR‑игра</h1>
        {!started && (
          <div className="bg-surface border border-border-color rounded-xl p-6 shadow-lg">
            <p className="text-xs text-text-secondary leading-relaxed mb-4">
              Включите камеру и найдите виртуальные объекты вокруг. Нажимайте на них, чтобы получать
              факты о технологиях и зарабатывать баллы.
            </p>
            <ul className="text-[11px] text-text-secondary space-y-1 list-disc list-inside mb-4">
              <li>Используйте основную камеру (лучше заднюю).</li>
              <li>Игра не ограничена по времени.</li>
              <li>Баллы суммируются и могут быть отправлены на сервер позже.</li>
            </ul>
            <button
              onClick={() => setStarted(true)}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-md bg-primary text-background font-semibold text-[12px] border border-border-color hover:opacity-90"
            >
              <CameraIcon className="h-5 w-5" /> Начать AR‑игру
            </button>
            {error && (
              <div className="mt-4 p-3 rounded-md border border-border-color bg-background text-[12px] text-red-300">
                {error}
              </div>
            )}
          </div>
        )}

        {started && (
          <div ref={containerRef} className="relative mt-2 w-full rounded-xl overflow-hidden border border-border-color" style={{ height: 'calc(100vh - 200px)' }}>
            <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" playsInline muted />
            {hud}
            {/* targets */}
            {targets.filter((t) => !t.collected).map((t) => (
              <button
                key={t.id}
                className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full p-2 bg-primary text-background shadow-[0_0_12px_rgba(64,224,208,0.6)] border border-border-color"
                style={{ left: `${t.x}%`, top: `${t.y}%` }}
                onClick={() => handleHit(t)}
                aria-label="Виртуальный объект"
              >
                <BoltIcon className="h-5 w-5" />
              </button>
            ))}
          </div>
        )}

        {modal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50" onClick={() => setModal(null)} />
            <div className="relative bg-surface border border-border-color rounded-xl p-5 w-full max-w-md shadow-lg">
              <button
                onClick={() => setModal(null)}
                className="absolute top-2 right-2 text-text-secondary hover:text-primary"
                aria-label="Закрыть"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
              <h2 className="text-md font-bold text-primary mb-1">{modal.title}</h2>
              <p className="text-xs text-text-secondary leading-relaxed mb-3">{modal.text}</p>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircleIcon className="h-4 w-4 text-primary" />
                <span className="text-text-primary">+{modal.points} баллов</span>
              </div>
            </div>
          </div>
        )}
        {/* Help modal */}
        {showHelp && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50" onClick={() => setShowHelp(false)} />
            <div className="relative bg-surface border border-border-color rounded-xl p-5 w-full max-w-md shadow-lg text-xs">
              <div className="text-md font-bold text-primary mb-2">Как играть</div>
              <ol className="list-decimal list-inside space-y-1 text-text-secondary">
                <li>Разрешите доступ к камере в Telegram WebApp.</li>
                <li>Нажмите «Начать AR‑игру», чтобы открыть видоискатель.</li>
                <li>Ищите светящиеся значки и нажимайте на них, чтобы получить факты.</li>
                <li>Баллы суммируются по мере сбора. После первого найденного объекта станет доступна награда.</li>
              </ol>
              <div className="text-right mt-3">
                <button onClick={() => setShowHelp(false)} className="px-3 py-1 text-[11px] bg-primary/20 text-primary border border-primary/40 rounded">Понятно</button>
              </div>
            </div>
          </div>
        )}
        {/* Award button (inline) */}
        {started && !user?.isAr && earned && (
          <div className="mt-4">
            <button
              disabled={awarding}
              onClick={async () => {
                setAwardError(null); setAwarding(true);
                try { await awardCoins('isAr', 50); } catch (e:any){ setAwardError(e?.message||'Ошибка награды'); } finally { setAwarding(false); }
              }}
              className="px-4 py-2 bg-primary/20 text-primary border border-primary/40 rounded text-sm disabled:opacity-50"
            >{awarding ? 'Начисление...' : 'Ознакомиться (награда)'}
            </button>
            {awardError && <div className="text-[11px] text-red-400 mt-1">{awardError}</div>}
          </div>
        )}
      </div>
    </div>
  );
}

export default ARGame;
