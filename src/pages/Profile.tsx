import { PencilIcon, XMarkIcon, CheckIcon, CheckCircleIcon } from '@heroicons/react/24/solid';
import { useAuth } from '../context/AuthContext';
import { useState } from 'react';

function Profile() {
  const { user, logout, updateProfile, error } = useAuth();
  const [editing, setEditing] = useState(false);
  const [username, setUsername] = useState(user?.username || '');
  const [group, setGroup] = useState(user?.group || '');
  const [localError, setLocalError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!user) return null;

  const startEdit = () => {
    setEditing(true);
    setUsername(user.username || '');
    setGroup(user.group || '');
    setLocalError(null);
    setSuccess(false);
  };
  const cancel = () => {
    setEditing(false);
    setLocalError(null);
  };
  const save = async () => {
    const u = username.trim();
    const g = group.trim();
    if (!u || !g) {
      setLocalError('Заполните имя и группу');
      return;
    }
    setSaving(true);
    setLocalError(null);
    setSuccess(false);
    try {
      await updateProfile({ username: u, group: g });
      setEditing(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2500);
    } catch (e: any) {
      setLocalError(e?.message || 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

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
              {!editing && (
                <button
                  onClick={startEdit}
                  className="absolute bottom-0 right-0 bg-primary p-2 rounded-full text-background hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                  aria-label="Редактировать профиль"
                >
                  <PencilIcon className="h-4 w-4" />
                </button>
              )}
            </div>
            {!editing ? (
              <>
                <h1 className="mt-4 text-xl font-bold text-text-primary">{user.username || 'Пользователь'}</h1>
                <p className="mt-1 text-sm text-text-secondary">Группа: {user.group}</p>
              </>
            ) : (
              <div className="mt-4 w-full space-y-3">
                <div>
                  <label className="block text-[10px] text-text-secondary mb-1">Имя пользователя</label>
                  <input
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    className="w-full bg-white/5 border border-border-color rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-text-secondary mb-1">Группа</label>
                  <input
                    value={group}
                    onChange={e => setGroup(e.target.value)}
                    className="w-full bg-white/5 border border-border-color rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                {localError && <div className="text-[10px] text-red-400">{localError}</div>}
                {error && <div className="text-[10px] text-red-400">{error}</div>}
                <div className="flex gap-2 justify-end pt-1">
                  <button
                    onClick={cancel}
                    disabled={saving}
                    className="px-3 py-1 text-xs bg-white/10 text-white border border-white/20 rounded disabled:opacity-50 flex items-center gap-1"
                  >
                    <XMarkIcon className="w-3 h-3" /> Отмена
                  </button>
                  <button
                    onClick={save}
                    disabled={saving}
                    className="px-3 py-1 text-xs bg-primary/20 text-primary border border-primary/40 rounded disabled:opacity-50 flex items-center gap-1"
                  >
                    <CheckIcon className="w-3 h-3" /> {saving ? 'Сохранение...' : 'Сохранить'}
                  </button>
                </div>
              </div>
            )}
            <p className="mt-1 text-[10px] text-text-secondary">Telegram ID: {user.telegramId}</p>
            {success && <div className="mt-2 text-[10px] text-green-400">Сохранено</div>}
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
              const items = [
                { key: 'isAr', label: 'AR‑игра', done: !!user.isAr, href: '/ar-image', hint: 'Найдите постер «Отсканируй меня» и наведите камеру.' },
                { key: 'isQuiz', label: 'IT‑Квиз', done: !!user.isQuiz, href: '/quiz', hint: 'Проверьте знания об IT и AI. Есть бонус за скорость.' },
                { key: 'isTranscribed', label: 'QR‑квест: Аудио → Текст', done: !!user.isTranscribed, href: '/qr', hint: 'Сканируйте QR в популярных местах.' },
                { key: 'isTexted', label: 'QR‑квест: Текст → Текст', done: !!user.isTexted, href: '/qr', hint: 'Сканируйте QR в популярных местах.' },
                { key: 'isImageGeneration', label: 'QR‑квест: Текст → Изображение', done: !!user.isImageGeneration, href: '/qr', hint: 'Сканируйте QR в популярных местах.' },
              ];
              const doneCount = items.filter(it => it.done).length;
              const total = items.length;
              return (
                <div className="bg-surface border border-border-color rounded-xl">
                  <div className="px-4 py-2 text-[11px] text-text-secondary border-b border-border-color">Пройдено {doneCount} из {total}</div>
                  <ul className="divide-y divide-border-color">
                    {items.map(it => (
                      <li key={it.key} className="px-4 py-3 flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm text-text-primary font-medium">{it.label}</div>
                          <div className="text-[11px] text-text-secondary mt-0.5">{it.hint}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          {it.done ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 text-[10px] rounded bg-green-500/15 text-green-300 border border-green-500/30">
                              <CheckCircleIcon className="h-3.5 w-3.5" /> Пройдено
                            </span>
                          ) : (
                            <a href={it.href} className="inline-flex items-center gap-1 px-2 py-1 text-[10px] rounded bg-primary text-background border border-primary/60 hover:opacity-90">
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
