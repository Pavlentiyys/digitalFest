import { useState } from 'react';
import {
  ArrowRightCircleIcon,
  ArrowLeftCircleIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/solid';

type Answer = { id: string; text: string };
type Question = { id: string; text: string; answers: Answer[] };

// Временные вопросы (пример). UUID'ы для совместимости с бэкендом
const questions: Question[] = [
  {
    id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    text: 'Что означает аббревиатура IT?',
    answers: [
      { id: 'a47ac10b-58cc-4372-a567-0e02b2c3d478', text: 'Information Technology' },
      { id: 'a47ac10b-58cc-4372-a567-0e02b2c3d479', text: 'Innovative Tools' },
      { id: 'a47ac10b-58cc-4372-a567-0e02b2c3d470', text: 'Internet Transfer' },
    ],
  },
  {
    id: 'b47ac10b-58cc-4372-a567-0e02b2c3d471',
    text: 'Какой инструмент относится к нейросетям?',
    answers: [
      { id: 'c47ac10b-58cc-4372-a567-0e02b2c3d472', text: 'Gemini' },
      { id: 'c47ac10b-58cc-4372-a567-0e02b2c3d473', text: 'Webpack' },
      { id: 'c47ac10b-58cc-4372-a567-0e02b2c3d474', text: 'Docker' },
    ],
  },
  {
    id: 'd47ac10b-58cc-4372-a567-0e02b2c3d475',
    text: 'Что такое QR-код?',
    answers: [
      { id: 'e47ac10b-58cc-4372-a567-0e02b2c3d476', text: 'Двумерный штрихкод' },
      { id: 'e47ac10b-58cc-4372-a567-0e02b2c3d477', text: 'Формат аудио' },
      { id: 'e47ac10b-58cc-4372-a567-0e02b2c3d478', text: 'Тип базы данных' },
    ],
  },
];

const API_ENDPOINT = 'https://tou-event.ddns.net/api/api/v1/quiz/check/test';

function getAuthToken(): string | null {
  // Попытки получить токен из разных источников
  if (typeof window === 'undefined') return null;
  const lsKeys = ['authToken', 'token', 'tg_token'];
  for (const k of lsKeys) {
    const v = window.localStorage.getItem(k);
    if (v) return v;
  }
  // Если используете Telegram WebApp, можно прокинуть токен через initData или query
  const params = new URLSearchParams(window.location.search);
  const p = params.get('token');
  if (p) return p;
  return null;
}

function Quiz() {
  const [started, setStarted] = useState(false); // экран "Начать тест"
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [resultMsg, setResultMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const q = questions[index];
  const isLast = index === questions.length - 1;
  const canNext = Boolean(selected[q?.id]);

  const goNext = () => {
    if (!canNext) return;
    if (!isLast) setIndex((i) => i + 1);
  };
  const goPrev = () => setIndex((i) => Math.max(0, i - 1));

  const submitQuiz = async () => {
    const token = getAuthToken();
    if (!token) {
      setErrorMsg('Нет токена авторизации. Поместите его в localStorage под ключом "authToken" или добавьте ?token=... в URL.');
      return;
    }
    setSubmitting(true);
    setErrorMsg(null);
    setResultMsg(null);
    try {
      const body = {
        answers: questions
          .filter((qq) => selected[qq.id])
          .map((qq) => ({ questionId: qq.id, answerId: selected[qq.id] })),
      };

      const res = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || 'Ошибка отправки результатов');
      setResultMsg('Квиз отправлен! Результаты учтены.');
    } catch (e: any) {
      setErrorMsg(e.message || 'Не удалось отправить результаты');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 bg-background min-h-screen">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-text-primary mb-2">Квиз: IT & AI</h1>
        {!started && !resultMsg && (
          <div className="bg-surface border border-border-color rounded-xl p-6 shadow-lg mb-6">
            <p className="text-xs text-text-secondary leading-relaxed mb-4">
              Вы пройдёте небольшой тест по базовым понятиям цифровизации, нейросетям и технологиям.
              Время не ограничено. Баллы начисляются после отправки последнего ответа.
            </p>
            <ul className="text-[11px] text-text-secondary space-y-1 mb-5 list-disc list-inside">
              <li>Ответьте на каждый вопрос, прежде чем перейти дальше.</li>
              <li>Можно вернуться к предыдущим вопросам до отправки.</li>
              <li>Для подсчёта результата требуется авторизационный токен.</li>
            </ul>
            <button
              onClick={() => setStarted(true)}
              className="px-5 py-3 rounded-md bg-primary text-background font-semibold text-[12px] border border-border-color hover:opacity-90"
            >
              Начать тест
            </button>
          </div>
        )}
        {started && !resultMsg && (
          <p className="text-xs text-text-secondary mb-6">Отвечайте на вопросы. Время не ограничено.</p>
        )}

        {/* После завершения */}
        {resultMsg && (
          <div className="bg-surface border border-border-color rounded-xl p-6 shadow-lg mb-6">
            <p className="text-sm text-primary font-semibold mb-2">{resultMsg}</p>
            <p className="text-[11px] text-text-secondary mb-4">Можете закрыть страницу или вернуться назад.</p>
            <button
              onClick={() => {
                setStarted(false);
                setIndex(0);
                setSelected({});
                setResultMsg(null);
              }}
              className="px-4 py-2 rounded-md border border-border-color text-[11px] bg-background/40 text-text-primary hover:border-primary"
            >
              Пройти ещё раз
            </button>
          </div>
        )}

        {/* Вопросы */}
        {started && !resultMsg && (
        <div className="bg-surface border border-border-color rounded-xl p-5 shadow-lg">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-md font-bold text-primary">Вопрос {index + 1} из {questions.length}</h2>
            <span className="text-[11px] text-text-secondary">ID: {q.id.slice(0, 8)}</span>
          </div>
          <p className="mt-2 text-text-primary text-sm leading-relaxed">{q.text}</p>

          <div className="mt-4 space-y-2">
            {q.answers.map((a) => {
              const checked = selected[q.id] === a.id;
              return (
                <button
                  key={a.id}
                  onClick={() => setSelected((prev) => ({ ...prev, [q.id]: a.id }))}
                  className={`w-full text-left px-4 py-3 rounded-md border transition-colors text-[12px] ${
                    checked
                      ? 'bg-primary text-background border-border-color'
                      : 'bg-background/40 backdrop-blur text-text-primary border-border-color hover:border-primary'
                  }`}
                >
                  {a.text}
                </button>
              );
            })}
          </div>

          <div className="mt-5 flex items-center justify-between">
            <button
              onClick={goPrev}
              disabled={index === 0}
              className="flex items-center gap-1 px-3 py-2 text-[11px] rounded-md border border-border-color text-text-secondary disabled:opacity-40"
            >
              <ArrowLeftCircleIcon className="h-4 w-4" /> Назад
            </button>

            {!isLast ? (
              <button
                onClick={goNext}
                disabled={!canNext}
                className="flex items-center gap-1 px-4 py-2 text-[11px] rounded-md border border-border-color bg-primary text-background disabled:opacity-40"
              >
                Далее <ArrowRightCircleIcon className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={submitQuiz}
                disabled={!canNext || submitting}
                className="flex items-center gap-1 px-4 py-2 text-[11px] rounded-md border border-border-color bg-primary text-background disabled:opacity-40"
              >
                Завершить квиз <CheckCircleIcon className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
        )}

        {/* Сообщения ошибок */}
        {errorMsg && !resultMsg && (
          <div className="mt-4 p-3 rounded-md border border-border-color bg-background text-[12px] text-red-300">
            {errorMsg}
          </div>
        )}
      </div>
    </div>
  );
}

export default Quiz;
