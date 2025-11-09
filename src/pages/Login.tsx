import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Login() {
  const [group, setGroup] = useState('');
  const navigate = useNavigate();
  const { loginWithTelegram, loading, error, user } = useAuth();
  const [tgAvailable, setTgAvailable] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  // removed detailed error body debug

  useEffect(() => {
    setTgAvailable(!!(window.Telegram?.WebApp));
    // no debug UI in production
  }, []);

  useEffect(() => {
    if (user) navigate('/');
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
  // no raw response capture
    if (!group.trim()) {
      setSubmitError('Введите номер группы');
      return;
    }
    try {
      await loginWithTelegram(group.trim());
      navigate('/event');
    } catch (e: any) {
      setSubmitError(e?.message || 'Ошибка авторизации');
  // no raw bodies or debug info in UI
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
      <div className="w-full max-w-sm p-8 space-y-6 bg-surface rounded-xl shadow-lg border border-border-color">
        <h1 className="text-xl font-bold text-center text-text-primary">Вход через Telegram</h1>
        <p className="text-center text-text-secondary text-xs">
          {tgAvailable ? 'Откройте мини‑приложение в Telegram и добавьте номер группы.' : 'Telegram WebApp не обнаружен — откройте через Telegram. Можно протестировать локально параметром tgWebAppData.'}
        </p>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="group" className="text-xs font-medium text-text-secondary sr-only">
              Номер группы
            </label>
            <input
              id="group"
              name="group"
              type="text"
              required
              value={group}
              onChange={(e) => setGroup(e.target.value)}
              className="w-full px-4 py-2 text-text-primary bg-background/40 backdrop-blur border border-border-color rounded-md focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-text-secondary"
              placeholder="Например, ИКБО-01-23"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-2 text-background font-semibold bg-primary rounded-md hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
          >
            {loading ? 'Авторизация...' : 'Войти'}
          </button>
        </form>
        {(error || submitError) && (
          <div className="space-y-2">
            <div className="text-center text-[10px] text-red-400">
              {error || submitError}
            </div>
            {/* no debug blocks */}
          </div>
        )}
        <div className="text-center text-[10px] text-text-secondary">
          Данные Telegram подписываются и проверяются на сервере. Мы сохраняем группу и выдаём ваши возможности.
        </div>
      </div>
    </div>
  );
}

export default Login;
