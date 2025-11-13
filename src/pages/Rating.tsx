import { useEffect, useMemo, useState } from 'react';
import { httpJson, API_V1 } from '../lib/api';

type Student = {
  id: string;
  telegramId: string;
  username: string;
  group: string;
  coins: number;
  isTranscribed?: boolean;
  isTexted?: boolean;
  isImageGeneration?: boolean;
  isAr?: boolean;
  isQuiz?: boolean;
};

// Helper to determine if rating should be visible (after 14:00 Kazakhstan time: assume Asia/Almaty UTC+6 no DST most of year)
export function isRatingOpen(date = new Date()): boolean {
  try {
    // Use Intl to convert to Asia/Almaty hour
    const fmt = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', hour12: false, timeZone: 'Asia/Almaty' });
    const hour = parseInt(fmt.format(date), 10);
    return hour >= 14; // 14:00 or later local time
  } catch {
    // Fallback: approximate by adding 6 hours offset from UTC
    const utcHour = date.getUTCHours();
    const almatyHour = (utcHour + 6) % 24;
    return almatyHour >= 14;
  }
}

export default function Rating() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const { data } = await httpJson<Student[]>(`${API_V1}/auth/students`);
        if (!cancelled) setStudents(Array.isArray(data) ? data : []);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Ошибка загрузки');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    // refresh every 60s
    const id = setInterval(load, 60000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  const sorted = useMemo(() => {
    return [...students].sort((a, b) => b.coins - a.coins);
  }, [students]);

  const top3 = sorted.slice(0, 3);
  const rest = sorted.slice(3);


  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <h1 className="text-3xl font-extrabold tracking-tight mb-6 text-center bg-gradient-to-r from-teal-400 to-cyan-500 text-transparent bg-clip-text drop-shadow">Рейтинг участников</h1>

      {loading && (
        <div className="flex justify-center py-10"><div className="h-10 w-10 border-4 border-teal-400 border-t-transparent rounded-full animate-spin" /></div>
      )}
      {error && !loading && (
        <div className="bg-red-500/10 text-red-500 px-4 py-3 rounded-lg text-center mb-4">{error}</div>
      )}
      {!loading && !error && sorted.length === 0 && (
        <div className="text-center text-text-secondary">Нет данных</div>
      )}

      {/* Top 3 podium */}
      {!loading && !error && top3.length > 0 && (
        <div className="flex flex-col gap-4 mb-8">
          {top3.map((s, idx) => {
            const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉';
            const sizes = idx === 0 ? 'h-24' : 'h-20';
            const bg = idx === 0
              ? 'from-amber-300/70 to-yellow-500/70'
              : idx === 1
                ? 'from-zinc-300/70 to-zinc-500/70'
                : 'from-orange-300/70 to-amber-600/70';
            return (
              <div key={s.id} className="flex flex-col items-center">
                <div className={`w-full ${sizes} rounded-xl bg-gradient-to-br ${bg} backdrop-blur p-2 flex flex-col justify-center items-center shadow-lg border border-white/30`}>
                  <span className="text-2xl">{medal}</span>
                  <span className="text-sm font-semibold max-w-full">{s.username}</span>
                  <span className="text-sm font-semibold max-w-full">{s.group}</span>
                  <span className="text-xs text-teal-900 font-medium mt-1">{s.coins}🪙</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Rest of leaderboard */}
      {!loading && !error && rest.length > 0 && (
        <div className="space-y-2">
          {rest.map((s, idx) => (
            <div
              key={s.id}
              className="flex items-center gap-3 px-4 py-3 rounded-lg bg-surface/70 border border-border-color backdrop-blur hover:border-teal-400/70 transition-colors"
            >
              <span className="w-6 text-right text-sm font-semibold text-teal-400">{idx + 4}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">{s.username}</span>
                  <span className="text-xs text-text-secondary truncate">{s.group}</span>
                </div>
              </div>
              <span className="text-sm font-semibold text-teal-300">{s.coins}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
