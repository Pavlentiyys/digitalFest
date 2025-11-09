import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const COIN_FACTS: Record<string, { title: string; fact: string; reward?: number }> = {
  btc: {
    title: 'Биткоин (BTC)',
    fact: 'Первая децентрализованная криптовалюта (2009). Ограниченное предложение в 21 млн монет создаёт эффект цифровой «дефицитности». Основан на Proof‑of‑Work, где майнеры подтверждают транзакции, расходуя энергию.',
    reward: 50,
  },
  eth: {
    title: 'Эфириум (ETH)',
    fact: 'Платформа смарт‑контрактов. Переход на Proof‑of‑Stake снизил энергопотребление более чем на 99%. Позволяет создавать DeFi, NFT и DAO.',
    reward: 50,
  },
  doge: {
    title: 'Dogecoin (DOGE)',
    fact: 'Мем‑криптовалюта на базе форка Litecoin, изначально созданная как шутка. Имеет быстрые и дешёвые транзакции, активно используется в сообществе для чаевых и донатов.',
    reward: 50,
  },
};

const ARFact: React.FC = () => {
  const { coinId = 'btc' } = useParams();
  const navigate = useNavigate();
  const { user, awardCoins } = useAuth();
  const data = COIN_FACTS[coinId.toLowerCase()] || COIN_FACTS['btc'];
  const alreadyAwarded = !!user?.isAr;
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);

  const handleAward = async () => {
    if (alreadyAwarded || !data.reward) return;
    setError(null); setLoading(true);
    try {
      await awardCoins('isAr', data.reward);
      setDone(true);
    } catch (e: any) {
      setError(e?.message || 'Не удалось начислить награду');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-text-primary px-4 py-6">
      <div className="max-w-xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-primary">{data.title}</h1>
          <button
            onClick={() => navigate(-1)}
            className="text-xs text-primary underline"
          >Назад</button>
        </div>
        <div className="bg-surface border border-border-color rounded-xl p-4 text-xs leading-relaxed shadow">
          {data.fact}
        </div>
        <div className="mt-4 flex items-center gap-3">
          {!alreadyAwarded && !done && (
            <button
              disabled={loading}
              onClick={handleAward}
              className="px-4 py-2 rounded-md bg-primary/20 text-primary border border-primary/40 text-xs disabled:opacity-50"
            >{loading ? 'Начисление...' : `Получить награду (${data.reward})`}</button>
          )}
          {(alreadyAwarded || done) && (
            <div className="text-[11px] text-text-secondary">Награда получена.</div>
          )}
        </div>
        {error && <div className="mt-2 text-[11px] text-red-400">{error}</div>}
      </div>
    </div>
  );
};

export default ARFact;
