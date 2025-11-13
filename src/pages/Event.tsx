// import { Link } from 'react-router-dom';

// interface EventItem {
//   id: number;
//   name: string;
//   shortDescription: string;
//   fullDescription: string;
// }

// const events: EventItem[] = [
//   {
//     id: 4,
//     name: 'AR-игра',
//     shortDescription: 'Сканируй постеры — появятся 3D‑модели криптовалют.',
//     fullDescription: 'Ищи по кампусу постеры «Отсканируй меня» и наводи камеру. Появятся 3D‑модели криптовалют (BTC, ETH, DOGE) и факты — собери все, чтобы получить награду.'
//   },
//   {
//     id: 2,
//     name: 'QR-квесты',
//     shortDescription: 'Находи и сканируй QR‑коды по ключевым точкам кампуса.',
//     fullDescription: 'Находи QR‑коды в ключевых точках: стенды, навигационные зоны, ресепшен, места отдыха. Сканируй чтобы открыть материалы об ИИ и цифровизации и закрыть прогресс.'
//   },
//   {
//     id: 3,
//     name: 'IT-Квизы',
//     shortDescription: 'Отвечай на вопросы по IT и AI с таймером.',
//     fullDescription: 'Проверь эрудицию в IT и AI: отвечай быстро и точно — получай базовые баллы + бонус за эффективность. Можно пересдать до получения награды.'
//   }
// ];

// import { useState } from 'react';

function Event() {
  // const [openIds, setOpenIds] = useState<Set<number>>(new Set());
  // const toggle = (id: number) => {
  //   setOpenIds(prev => {
  //     const n = new Set(prev);
  //     if (n.has(id)) n.delete(id); else n.add(id);
  //     return n;
  //   });
  // };
  return (
    <div className="p-6 bg-background min-h-screen">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-text-primary mb-2">День цифровизации</h1>
        <p className="text-xs text-text-secondary mb-3 leading-relaxed">
          Студенческое мероприятие ПГУ, созданное специально к Дню цифровизации: практичные форматы, реальные технологии и интерактивные задания.
        </p>
        <p className="text-xs text-text-secondary mb-3 leading-relaxed">
          Прокачай любознательность: исследуй AR, собирай QR‑контент, проверяй себя квизом. Каждый шаг — монеты и опыт. Успей до конца события!
        </p>
        <p className="text-[11px] text-primary font-medium mb-8">
          Дата проведения: 10 ноября · Время: 08:30–14:00
        </p>

        <div className="space-y-6">
          <h2 className="text-lg font-semibold text-text-primary border-b border-border-color pb-2">
            Активности
          </h2>
          {/* <ul className="space-y-4"> */}
            {/* {events.map((event) => {
              let href: string;
              if (event.id === 4) href = '/ar-image';
              else if (event.name.startsWith('AR')) href = '/ar';
              else if (event.id === 2 || event.name.toLowerCase().includes('qr')) href = '/qr';
              else if (event.name.includes('Квиз') || event.id === 3) href = '/quiz';
              else href = `/event/${event.id}`;
              return (
                <li key={event.id} className="bg-surface border border-border-color p-6 rounded-xl shadow-lg hover:shadow-[0_0_12px_rgba(61,218,215,0.35)] transition-shadow">
                  <div className="flex items-start justify-between gap-4">
                    <h3 className="text-md font-bold text-primary">{event.name}</h3>
                  </div>
                  <div className="mt-2 flex items-start justify-between gap-3">
                    <p className="text-text-secondary text-[11px] leading-relaxed flex-1">{event.shortDescription}</p>
                    <button
                      onClick={() => toggle(event.id)}
                      className="shrink-0 text-[10px] px-2 py-1 rounded bg-primary/15 text-primary border border-primary/30 hover:bg-primary/25"
                    >{openIds.has(event.id) ? 'Скрыть' : 'Подробнее'}</button>
                  </div>
                  {openIds.has(event.id) && (
                    <p className="text-text-secondary text-xs mt-3 leading-relaxed">{event.fullDescription}</p>
                  )}
                  <Link
                    to={href}
                    className="mt-4 inline-block text-xs px-4 py-2 rounded-md bg-primary text-background font-semibold border border-border-color shadow hover:opacity-90 transition"
                  >
                    Начать
                  </Link>
                </li>
              );
            })} */}
          {/* </ul> */}
          <div className="text-2xl font-bold text-white">Результаты составили, с победителями скоро свяжимся, а затем откроем рейтинг. Огромное спасибо всем за участие!!!!!</div>
        </div>
      </div>
    </div>
  );
}

export default Event;
