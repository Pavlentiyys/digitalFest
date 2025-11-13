import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  ArrowRightCircleIcon,
  ArrowLeftCircleIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/solid';

type Answer = { id: string; text: string };
type Question = { id: string; text: string; answers: Answer[] };

// Временные вопросы (пример). UUID'ы для совместимости с бэкендом


import { API_V1, tgHeaders } from '../../lib/api';
// Endpoint for checking test results (adjusted to hyphen path per backend spec)
const API_ENDPOINT = `${API_V1}/quiz/check-test`;
const API_QUESTIONS = `${API_V1}/quiz/questions`;

// Legacy token logic removed; backend now relies on telegram-id header.

function Quiz() {
  const [started, setStarted] = useState(false); // экран "Начать тест"
  const [questions, setQuestions] = useState<Question[]>([]);
  const [qLoading, setQLoading] = useState(false);
  const [qError, setQError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [resultMsg, setResultMsg] = useState<string | null>(null);
  const [resultCorrect, setResultCorrect] = useState<number | null>(null);
  const [resultTotal, setResultTotal] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const { user } = useAuth();
  const [showHelp, setShowHelp] = useState(false);
  const [awarding, setAwarding] = useState(false);
  const [awardError, setAwardError] = useState<string | null>(null);
  const [awarded, setAwarded] = useState(false);
  // Timing & scoring
  const LIMIT_MINUTES = 20;
  const LIMIT_MS = LIMIT_MINUTES * 60 * 1000;
  const [startTime, setStartTime] = useState<number | null>(null);
  const [nowTs, setNowTs] = useState<number>(Date.now());
  const [autoSubmitted, setAutoSubmitted] = useState(false);
  const elapsedMs = startTime ? nowTs - startTime : 0;
  const remainingMs = Math.max(0, LIMIT_MS - elapsedMs);
  const timePercentUsed = startTime ? (elapsedMs / LIMIT_MS) * 100 : 0; // 0..100
  const timeEfficiencyPercent = Math.max(0, 100 - timePercentUsed);
  const [finalScore, setFinalScore] = useState<number | null>(null);
  const [rawPoints, setRawPoints] = useState<number | null>(null);
  const [bonusPoints, setBonusPoints] = useState<number | null>(null);

  const q = questions[index];
  const isLast = index === questions.length - 1;
  const canNext = q ? Boolean(selected[q.id]) : false;

  const loadQuestions = async () => {
    if (!user?.telegramId) {
      setQError('Нет идентификатора Telegram. Авторизуйтесь заново.');
      return;
    }
    setQLoading(true);
    setQError(null);
    try {
      const res = await fetch(API_QUESTIONS, {
        method: 'GET',
        headers: { ...tgHeaders(user.telegramId.toString()) },
      });
      const data = await res.json().catch(() => ([]));
      if (!res.ok) throw new Error(data?.message || 'Не удалось загрузить вопросы');
      if (!Array.isArray(data)) throw new Error('Неверный формат вопросов');
      setQuestions(data as Question[]);
      setIndex(0);
      setSelected({});
    } catch (e: any) {
      setQError(e?.message || 'Не удалось загрузить вопросы');
    } finally {
      setQLoading(false);
    }
  };

  // Загружаем вопросы при старте квиза, если их ещё нет
  useEffect(() => {
    if (started && questions.length === 0 && !qLoading && !qError) {
      loadQuestions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started]);

  // Start timer when quiz begins (and not already started)
  useEffect(() => {
    if (started && !resultMsg && startTime == null) {
      setStartTime(Date.now());
    }
  }, [started, resultMsg, startTime]);

  // Tick interval
  useEffect(() => {
    if (!startTime || resultMsg) return;
    const id = setInterval(() => setNowTs(Date.now()), 1000);
    return () => clearInterval(id);
  }, [startTime, resultMsg]);

  // Auto-submit on timeout
  useEffect(() => {
    if (!startTime || resultMsg || autoSubmitted) return;
    if (elapsedMs >= LIMIT_MS) {
      setAutoSubmitted(true);
      submitQuiz();
    }
  }, [elapsedMs, startTime, resultMsg, autoSubmitted]);

  const formatTime = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
  };

  const goNext = () => {
    if (!canNext) return;
    if (!isLast) setIndex((i) => i + 1);
  };
  const goPrev = () => setIndex((i) => Math.max(0, i - 1));

  const submitQuiz = async () => {
    if (!user?.telegramId) {
      setErrorMsg('Нет идентификатора Telegram. Авторизуйтесь заново.');
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
          ...tgHeaders(user.telegramId.toString()),
        },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || 'Ошибка отправки результатов');
      // Expecting data.results like "3/5"
      const raw = String((data as any)?.results || '').trim();
      const m = raw.match(/^(\d+)\s*\/\s*(\d+)$/);
      if (m) {
        const correct = parseInt(m[1], 10);
        const total = parseInt(m[2], 10);
        setResultCorrect(correct);
        setResultTotal(total);
        setResultMsg('Проверка завершена');
        // Scoring: raw points = correct * 5, bonus = raw * (timeEfficiencyPercent/100), final = raw + bonus, rounded
        const rp = correct * 5;
        const bonus = Math.round(rp * (timeEfficiencyPercent / 100));
        const final = rp + bonus;
        setRawPoints(rp);
        setBonusPoints(bonus);
        setFinalScore(final);
      } else {
        setResultMsg('Квиз отправлен!');
      }
    } catch (e: any) {
      setErrorMsg(e?.message || 'Не удалось отправить результаты');
    } finally {
      setSubmitting(false);
    }
  };

  const claimReward = async () => {
    if (!user?.telegramId || finalScore == null || awarded) return;
    try {
      setAwardError(null);
      setAwarding(true);
      const res = await fetch(`${API_V1}/auth/${encodeURIComponent(user.telegramId)}/coins`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...tgHeaders(user.telegramId.toString(), { includeAuthorization: true }) },
        body: JSON.stringify({ coins: finalScore, feature: 'isQuiz' }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message || 'Не удалось начислить награду');
      }
      setAwarded(true);
    } catch (e: any) {
      setAwardError(e?.message || 'Ошибка начисления награды');
    } finally {
      setAwarding(false);
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
              На прохождение отводится {LIMIT_MINUTES} минут. Баллы начисляются после отправки последнего ответа.
            </p>
            <ul className="text-[11px] text-text-secondary space-y-1 mb-5 list-disc list-inside">
              <li>Ответьте на каждый вопрос, прежде чем перейти дальше.</li>
              <li>Можно вернуться к предыдущим вопросам до отправки.</li>
              <li>Для подсчёта результата нужна активная Telegram авторизация.</li>
            </ul>
            <div className="flex gap-3">
              <button
                onClick={() => setStarted(true)}
                className="px-5 py-3 rounded-md bg-primary text-background font-semibold text-[12px] border border-border-color hover:opacity-90"
              >
                Начать тест
              </button>
              <button
                onClick={() => setShowHelp(true)}
                className="px-5 py-3 rounded-md bg-background text-text-primary font-semibold text-[12px] border border-border-color hover:border-primary"
              >Как пройти</button>
            </div>
          </div>
        )}
        {started && !resultMsg && (
          <p className="text-xs text-text-secondary mb-6">Отвечайте на вопросы. Таймер вверху карточки.</p>
        )}

        {/* После завершения */}
        {resultMsg && (
          <div className="bg-surface border border-border-color rounded-xl p-6 shadow-lg mb-6">
            <p className="text-sm text-primary font-semibold mb-2">{resultMsg}</p>
            {resultCorrect != null && resultTotal != null && (
              <div className="text-xs text-text-primary mb-3 space-y-1">
                <div>Правильных ответов: <span className="text-primary font-semibold">{resultCorrect}</span> из {resultTotal}</div>
                {finalScore != null && rawPoints != null && bonusPoints != null && (
                  <>
                    <div>Баллы за правильные ответы: <span className="font-semibold">{rawPoints}</span></div>
                    <div>Баллы за время: <span className="font-semibold">{bonusPoints}</span></div>
                    <div>Итого баллов: <span className="text-primary font-semibold">{finalScore}</span></div>
                  </>
                )}
              </div>
            )}
            <p className="text-[11px] text-text-secondary mb-4">Можете закрыть страницу или вернуться назад.</p>
            {/* Auto-award status */}
            <div className="mb-1 text-[11px] text-text-secondary">
              {awarding && 'Начисление награды...'}
              {!awarding && awarded && finalScore != null && (
                <span>Награда начислена: <span className="text-primary font-semibold">{finalScore}</span></span>
              )}
              {awardError && (
                <span className="text-red-400">{awardError}</span>
              )}
            </div>
            {!awarded && finalScore != null && (
              <button
                onClick={claimReward}
                disabled={awarding}
                className="mt-2 px-4 py-2 text-[11px] rounded-md border border-border-color bg-primary text-background disabled:opacity-40"
              >Забрать баллы ({finalScore})</button>
            )}
          </div>
        )}

        {/* Вопросы */}
        {started && !resultMsg && (
        <div className="bg-surface border border-border-color rounded-xl p-5 shadow-lg">
          {qLoading && (
            <div className="text-xs text-text-secondary">Загружаем вопросы...</div>
          )}
          {qError && (
            <div className="text-xs text-red-300 mb-3">{qError} <button onClick={loadQuestions} className="underline">Повторить</button></div>
          )}
          {!qLoading && !qError && !q && (
            <div className="text-xs text-text-secondary">Вопросы недоступны. Попробуйте позже.</div>
          )}
          {q && (
          <>
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="text-[11px] text-text-secondary">
              Осталось времени: <span className={remainingMs < 60_000 ? 'text-red-400 font-semibold' : 'text-primary font-semibold'}>{formatTime(remainingMs)}</span>
            </div>
            <div className="text-[11px] text-text-secondary">{(timePercentUsed).toFixed(1)}% времени</div>
          </div>
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
          </>
          )}
        </div>
        )}

        {/* Сообщения ошибок */}
        {errorMsg && !resultMsg && (
          <div className="mt-4 p-3 rounded-md border border-border-color bg-background text-[12px] text-red-300">
            {errorMsg}
          </div>
        )}
        {showHelp && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50" onClick={() => setShowHelp(false)} />
            <div className="relative bg-surface border border-border-color rounded-xl p-5 w-full max-w-md shadow-lg text-xs">
              <div className="text-md font-bold text-primary mb-2">Как пройти квиз</div>
              <ol className="list-decimal list-inside space-y-1 text-text-secondary">
                <li>Нажмите «Начать тест».</li>
                <li>Выберите ответ в каждом вопросе и нажмите «Далее».</li>
                <li>На последнем вопросе нажмите «Завершить квиз».</li>
                <li>После успешной отправки на экране появится кнопка для получения награды.</li>
              </ol>
              <div className="text-right mt-3">
                <button onClick={() => setShowHelp(false)} className="px-3 py-1 text-[11px] bg-primary/20 text-primary border border-primary/40 rounded">Понятно</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Quiz;
