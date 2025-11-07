import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function Login() {
  const [group, setGroup] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (group.trim()) {
      console.log('User group:', group);
      navigate('/profile');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
      <div className="w-full max-w-sm p-8 space-y-6 bg-surface rounded-xl shadow-lg border border-border-color">
        <h1 className="text-xl font-bold text-center text-text-primary">
          Регистрация
        </h1>
        <p className="text-center text-text-secondary text-xs">
          Введите номер вашей учебной группы для продолжения.
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
            className="w-full px-4 py-2 text-background font-semibold bg-primary rounded-md hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            Начать
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;
