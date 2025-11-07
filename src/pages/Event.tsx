import { Link } from 'react-router-dom';

const events = [
//   { id: 1, name: 'AR-игра', description: 'Поиск виртуальных объектов и фактов о криптовалютах.' },
  { id: 4, name: 'AR-игра', description: 'Наведите на картинку — появится 3D модель.' },
  { id: 2, name: 'QR-квесты', description: 'Сканируй QR-коды и узнавай о нейросетях.' },
  { id: 3, name: 'IT-Квизы', description: 'Проверь свои знания в области IT и AI.' },
];

function Event() {
  return (
    <div className="p-6 bg-background min-h-screen">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-text-primary mb-2">День цифровизации</h1>
        <p className="text-xs text-text-secondary mb-8">
          Интерактивное мероприятие для погружения в мир IT и искусственного интеллекта.
        </p>

        <div className="space-y-6">
          <h2 className="text-lg font-semibold text-text-primary border-b border-border-color pb-2">
            Активности
          </h2>
          <ul className="space-y-4">
            {events.map((event) => {
              let href: string;
              if (event.id === 4) href = '/ar-image';
              else if (event.name.startsWith('AR')) href = '/ar';
              else if (event.id === 2 || event.name.toLowerCase().includes('qr')) href = '/qr';
              else if (event.name.includes('Квиз') || event.id === 3) href = '/quiz';
              else href = `/event/${event.id}`;
              return (
                <li key={event.id} className="bg-surface border border-border-color p-6 rounded-xl shadow-lg hover:shadow-[0_0_12px_rgba(61,218,215,0.35)] transition-shadow">
                  <h3 className="text-md font-bold text-primary">{event.name}</h3>
                  <p className="text-text-secondary text-xs mt-2">{event.description}</p>
                  <Link to={href} className="text-primary hover:underline mt-4 inline-block text-xs">
                    {href === '/quiz' ? 'Начать' : 'Подробнее'}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default Event;
