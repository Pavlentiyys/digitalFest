import { PencilIcon } from '@heroicons/react/24/solid';

// Моковые данные пользователя
const user = {
  name: 'Иван Иванов',
  avatarUrl: 'https://via.placeholder.com/150', // URL аватара из Telegram
  group: 'ИКБО-01-23',
  score: 1250,
};

function Profile() {
  return (
    <div className="p-6 bg-background min-h-screen">
      <div className="max-w-md mx-auto bg-surface rounded-2xl shadow-lg overflow-hidden border border-border-color">
        <div className="p-8">
          <div className="flex flex-col items-center">
            <div className="relative">
              <img
                className="w-24 h-24 rounded-full object-cover border-4 border-primary"
                src={user.avatarUrl}
                alt="User Avatar"
              />
              <button
                className="absolute bottom-0 right-0 bg-primary p-2 rounded-full text-background hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                aria-label="Редактировать профиль"
              >
                <PencilIcon className="h-4 w-4" />
              </button>
            </div>
            <h1 className="mt-4 text-xl font-bold text-text-primary">{user.name}</h1>
            <p className="mt-1 text-sm text-text-secondary">{user.group}</p>
          </div>

          <div className="mt-8 text-center">
            <div className="p-6 bg-surface border border-dashed border-border-color rounded-xl">
              <p className="text-xs font-medium text-primary">Ваши баллы</p>
              <p className="mt-1 text-3xl font-bold text-text-primary">{user.score}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Profile;
