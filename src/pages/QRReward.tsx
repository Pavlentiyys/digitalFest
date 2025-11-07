import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { FeatureName } from '../context/AuthContext';
import { useAuth } from '../context/AuthContext';

const FEATURES: FeatureName[] = ['isTranscribed', 'isTexted', 'isImageGeneration', 'isAr', 'isQuiz'];

const featureLabels: Record<FeatureName, string> = {
  isTranscribed: 'Аудио → Текст',
  isTexted: 'Текст → Текст',
  isImageGeneration: 'Текст → Изображение',
  isAr: 'AR-активность',
  isQuiz: 'Квиз',
};

export default function QRReward() {
  const { feature: featureParam } = useParams();
  const navigate = useNavigate();
  const { user, awardCoins } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const feature = useMemo(() => {
    const f = (featureParam || '') as FeatureName;
    return FEATURES.includes(f) ? f : null;
  }, [featureParam]);

  useEffect(() => {
    if (!feature) return;
    // If the reward has already been claimed (feature true), block entry
    if (user && (user as any)[feature] === true) {
      navigate('/event', { replace: true });
    }
  }, [feature, user, navigate]);

  if (!user) return null; // guarded by App
  if (!feature) {
    return (
      <div className="min-h-screen bg-background text-text-primary p-6">
        <div className="max-w-md mx-auto bg-surface border border-border-color rounded-xl p-6">
          <div className="text-sm text-red-400">Неверный QR-параметр.</div>
          <button onClick={() => navigate('/event')} className="mt-3 text-xs px-3 py-1 bg-white/10 text-white border border-white/20 rounded">На главную</button>
        </div>
      </div>
    );
  }

  const already = (user as any)[feature] === true;

  const handleAcknowledge = async () => {
    setBusy(true);
    setError(null);
    try {
      await awardCoins(feature, 50);
      navigate('/');
    } catch (e: any) {
      setError(e?.message || 'Ошибка начисления');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-text-primary p-6">
      <div className="max-w-md mx-auto bg-surface border border-border-color rounded-2xl p-6 space-y-4">
        <div>
          <div className="text-xs text-text-secondary">QR-награда</div>
          <h1 className="text-lg font-bold text-primary">{featureLabels[feature]}</h1>
        </div>
        <div className="text-sm text-white/90 leading-relaxed">
          Короткое описание или инструкции по заданию. После ознакомления нажмите кнопку ниже, чтобы получить монеты и открыть доступ.
        </div>
        {error && <div className="text-[11px] text-red-400">{error}</div>}
        {already ? (
          <div className="text-[11px] text-text-secondary">Награда уже получена ранее.</div>
        ) : (
          <button
            onClick={handleAcknowledge}
            disabled={busy}
            className="w-full px-4 py-2 bg-primary/20 text-primary border border-primary/40 rounded text-sm disabled:opacity-50"
          >
            {busy ? 'Начисление...' : 'Ознакомиться'}
          </button>
        )}
        <button onClick={() => navigate('/event')} className="w-full text-xs px-3 py-1 bg-white/10 text-white border border-white/20 rounded">На главную</button>
      </div>
    </div>
  );
}
