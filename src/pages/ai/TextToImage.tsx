import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

interface GenResponse { imageUrl: string; message: string }

const DEFAULT_W = 1024;
const DEFAULT_H = 1024;

const TextToImage: React.FC = () => {
  const [prompt, setPrompt] = useState('Minimal flat vector logo for a tech conference in blue and white');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const { user, awardCoins } = useAuth();
  const [awarding, setAwarding] = useState(false);
  const [awardError, setAwardError] = useState<string | null>(null);

  const generate = async () => {
    setError(null); setMessage(null); setImageUrl(null);
    if (!prompt.trim()) { setError('Введите prompt'); return; }
    setLoading(true);
    try {
  const res = await fetch('https://tou-event.ddns.net/api/v1/image/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(user?.telegramId ? { Authorization: user.telegramId } : {}) },
        body: JSON.stringify({ prompt: prompt.trim(), width: DEFAULT_W, height: DEFAULT_H })
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        throw new Error(`Ошибка (${res.status}): ${txt || 'unknown'}`);
      }
      const data = await res.json() as GenResponse;
      setImageUrl(data.imageUrl);
      setMessage(data.message || 'OK');
    } catch (e: any) {
      setError(e?.message || 'Не удалось сгенерировать изображение');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-text-primary p-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-lg font-bold text-primary mb-4">Text → Image</h1>
        <div className="bg-surface border border-border-color rounded p-3 space-y-3">
          <textarea
            className="w-full bg-black/20 border border-border-color rounded px-3 py-2 text-sm min-h-[90px]"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Опишите изображение..."
          />
          <div className="flex gap-2 items-center">
            <button onClick={generate} disabled={loading} className="px-3 py-1 bg-primary/20 text-primary border border-primary/40 rounded text-sm disabled:opacity-50">
              {loading ? 'Генерация...' : 'Сгенерировать'}
            </button>
          </div>
          {error && <div className="text-[11px] text-red-400">{error}</div>}
          {message && !error && <div className="text-[11px] text-text-secondary">{message}</div>}
        </div>

        {imageUrl && (
          <div className="mt-4 space-y-2">
            <img src={imageUrl} alt="generated" className="w-full max-w-[512px] rounded border border-border-color" />
            <a href={imageUrl} target="_blank" rel="noopener noreferrer" className="text-primary text-xs underline">Открыть оригинал</a>
            {!user?.isImageGeneration && (
              <div>
                <button
                  disabled={awarding}
                  onClick={async () => { setAwardError(null); setAwarding(true); try { await awardCoins('isImageGeneration',50); } catch(e:any){ setAwardError(e?.message||'Ошибка награды'); } finally { setAwarding(false);} }}
                  className="mt-2 px-3 py-1 bg-primary/20 text-primary border border-primary/40 rounded text-xs disabled:opacity-50"
                >{awarding ? 'Начисление...' : 'Ознакомиться (награда)'}
                </button>
                {awardError && <div className="text-[10px] text-red-400 mt-1">{awardError}</div>}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TextToImage;
