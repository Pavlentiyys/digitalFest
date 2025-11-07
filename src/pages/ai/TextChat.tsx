import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';

type Msg = { role: 'user' | 'assistant' | 'system'; content: string };

// Endpoint interaction types
interface GenerateTextResponse { text: string; message: string }

const SYSTEM_INSTRUCTION = `Ты – "English Mentor", виртуальный преподаватель английского.
Задачи:
1. Сначала спроси пользователя на каком языке он предпочитает общаться (предложи English / Русский).
2. Если выберет русский — объясняй теорию на русском, но примеры и итоговые ответы давай на английском.
3. Всегда дружелюбно исправляй ошибки в тексте пользователя: грамматика, лексика, порядок слов.
4. Давай краткую корректировку и затем правильный вариант.
5. Если запрос не про изучение языка, мягко верни фокус: "Давай продолжим практику английского".
6. Старайся удерживать прогресс: увеличивай сложность предложений постепенно.
Отвечай компактно. Начни с приветствия и вопроса о предпочтительном языке.`;

const TextChat: React.FC = () => {
  const [messages, setMessages] = useState<Msg[]>([
    { role: 'system', content: SYSTEM_INSTRUCTION },
    { role: 'assistant', content: 'Привет! Как тебе удобнее общаться: English или Русский?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user, awardCoins } = useAuth();
  const [awarding, setAwarding] = useState(false);
  const [awardError, setAwardError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages.length]);

  const buildPrompt = (userText: string): string => {
    // Concatenate recent dialogue excluding old history if too long.
    const recent = messages.slice(-15).map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n');
    return `${SYSTEM_INSTRUCTION}\n---\nHistory:\n${recent}\nUSER: ${userText}\nASSISTANT:`;
  };

  const send = async () => {
    const text = input.trim();
    if (!text) return;
    setInput('');
    setError(null);
    setMessages(m => [...m, { role: 'user', content: text }]);
    setLoading(true);
    try {
      const promptPayload = { prompt: buildPrompt(text) };
  const res = await fetch('https://tou-event.ddns.net/api/v1/qr-code/generate-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(user?.telegramId ? { Authorization: user.telegramId } : {}) },
        body: JSON.stringify(promptPayload)
      });
      if (!res.ok) {
        const t = await res.text().catch(() => '');
        throw new Error(`Ошибка ответа (${res.status}): ${t || 'unknown'}`);
      }
      const data: GenerateTextResponse = await res.json();
      setMessages(m => [...m, { role: 'assistant', content: data.text || 'Нет текста' }]);
    } catch (e: any) {
      setError(e?.message || 'Ошибка запроса');
      setMessages(m => [...m, { role: 'assistant', content: 'Извините, произошла ошибка. Попробуйте ещё раз.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-text-primary p-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-lg font-bold text-primary mb-2">English Mentor (Text → Text)</h1>
        <div className="text-[11px] text-text-secondary mb-4 leading-relaxed bg-surface border border-border-color rounded p-3">
          Этот чат помогает прокачивать английский. Сначала выбери язык общения. Пиши свои фразы — он:
          <ul className="list-disc ml-4 mt-2 space-y-1">
            <li>Исправит грамматику и лексику</li>
            <li>Покажет правильный вариант</li>
            <li>Постепенно повысит сложность</li>
            <li>Вернёт фокус на изучение, если уйдёшь в сторону</li>
          </ul>
        </div>
        <div className="bg-surface border border-border-color rounded p-3 h-[55vh] overflow-y-auto space-y-2">
          {messages.map((m, idx) => (
            <div key={idx} className={m.role === 'user' ? 'text-right' : 'text-left'}>
              <div className={`inline-block px-3 py-2 rounded text-xs ${m.role === 'user' ? 'bg-primary/20 text-primary' : m.role === 'assistant' ? 'bg-white/5 text-white' : 'bg-black/30 text-white/70'}`}>{m.content}</div>
            </div>
          ))}
          <div ref={bottomRef} />
          {/* Award after first assistant reply beyond greeting */}
          {!user?.isTexted && messages.filter(m => m.role==='assistant').length > 1 && (
            <div className="mt-2">
              <button
                disabled={awarding}
                onClick={async () => {
                  setAwardError(null); setAwarding(true);
                  try { await awardCoins('isTexted', 50); } catch (e:any){ setAwardError(e?.message||'Ошибка награды'); } finally { setAwarding(false); }
                }}
                className="px-3 py-1 bg-primary/20 text-primary border border-primary/40 rounded text-xs disabled:opacity-50"
              >{awarding ? 'Начисление...' : 'Ознакомиться (награда)'}
              </button>
              {awardError && <div className="text-[10px] text-red-400 mt-1">{awardError}</div>}
            </div>
          )}
        </div>
        <div className="mt-3 flex gap-2">
          <input
            className="flex-1 bg-surface border border-border-color rounded px-3 py-2 text-sm"
            placeholder="Введите фразу на английском или выберите язык..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          />
          <button onClick={send} disabled={loading} className="px-4 py-2 bg-primary/20 text-primary border border-primary/40 rounded text-sm disabled:opacity-50">
            {loading ? '...' : 'Отправить'}
          </button>
        </div>
        {error && <div className="mt-2 text-[10px] text-red-400">{error}</div>}
        <div className="mt-2 text-[10px] text-text-secondary">Ответы генерируются сервером. История урезается до последних ~15 сообщений.</div>
      </div>
    </div>
  );
};

export default TextChat;
