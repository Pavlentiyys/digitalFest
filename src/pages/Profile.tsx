import { CheckCircleIcon } from '@heroicons/react/24/solid';
import { useAuth } from '../context/AuthContext';

function Profile() {
  const { user, logout } = useAuth();
  if (!user) return null;

  return (
    <div className="p-6 bg-background min-h-screen">
      <div className="max-w-md mx-auto bg-surface rounded-2xl shadow-lg overflow-hidden border border-border-color">
        <div className="p-8">
          <div className="flex flex-col items-center">
            <div className="relative">
              <img
                className="w-24 h-24 rounded-full object-cover border-4 border-primary"
                src={user.avatarUrl || "https://via.placeholder.com/150"}
                alt="User Avatar"
                referrerPolicy="no-referrer"
              />
              {/* Editing removed */}
            </div>
            <h1 className="mt-4 text-xl font-bold text-text-primary">{user.username || 'Пользователь'}</h1>
            <p className="mt-1 text-sm text-text-secondary">Группа: {user.group}</p>
            <p className="mt-1 text-[10px] text-text-secondary">Telegram ID: {user.telegramId}</p>
          </div>

          <div className="mt-8 text-center">
            <div className="p-6 bg-surface border border-dashed border-border-color rounded-xl">
              <p className="text-xs font-medium text-primary">Ваши монеты</p>
              <p className="mt-1 text-3xl font-bold text-text-primary">{user.coins}</p>
              <div className="text-[10px] text-text-secondary mt-2">Баллы копятся за активности ниже.</div>
              <button onClick={logout} className="mt-3 text-xs px-3 py-1 bg-white/10 text-white border border-white/20 rounded">Выйти</button>
            </div>
          </div>

          {/* Progress section */}
          <div className="mt-6">
            <h2 className="text-sm font-semibold text-text-primary mb-2">Прогресс по активностям</h2>
            {(() => {
              // AR прогресс: считаем по localStorage (привязка к пользователю)
              const arCount = (() => { try { return parseInt(localStorage.getItem(`progress:${user.telegramId}:arCount`)||'0',10)||0; } catch { return 0; } })();
              const arDone = arCount >= 3;
              // QR прогресс: пока нет серверных флагов поштучно, считаем 3 как полностью выполненные
              // TODO: заменить на реальные qrFlags с бэка, когда появятся
              // const qrDoneCount = 0; // временно отключено, чтобы не ставило «выполнено» раньше времени
              const items = [
                { key: 'ar', label: `AR‑игры (${Math.min(3, arCount)}/3)`, done: arDone },
                { key: 'qr', label: 'QR‑квесты (0/3)', done: false },
                { key: 'isQuiz', label: 'IT‑Квиз', done: !!user.isQuiz },
              ];
              const doneCount = items.filter(it => it.done).length;
              const total = items.length;
              return (
                <div className="bg-surface border border-border-color rounded-xl">
                  <div className="px-4 py-2 text-[11px] text-text-secondary border-b border-border-color">Пройдено {doneCount} из {total}</div>
                  <ul className="divide-y divide-border-color">
                    {items.map(it => (
                      <li key={it.key} className="px-4 py-3 flex items-center justify-between gap-3">
                        <div className="text-sm text-text-primary font-medium">{it.label}</div>
                        <div className="flex items-center gap-2">
                          {it.done ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 text-[10px] rounded bg-green-500/15 text-green-300 border border-green-500/30">
                              <CheckCircleIcon className="h-3.5 w-3.5" /> Пройдено
                            </span>
                          ) : (
                            <a href="/" className="inline-flex items-center gap-1 px-2 py-1 text-[10px] rounded bg-primary text-background border border-primary/60 hover:opacity-90">
                              Перейти
                            </a>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Profile;
