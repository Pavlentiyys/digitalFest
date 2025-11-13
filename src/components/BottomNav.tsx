import { NavLink } from 'react-router-dom';
import { HomeIcon, QuestionMarkCircleIcon, UserCircleIcon, TrophyIcon } from '@heroicons/react/24/outline';

function buildNavigation() {
  const base = [
    { name: 'Мероприятие', href: '/', icon: HomeIcon },
    { name: 'FAQ', href: '/faq', icon: QuestionMarkCircleIcon },
    { name: 'Рейтинг', href: '/rating', icon: TrophyIcon },
    { name: 'Профиль', href: '/profile', icon: UserCircleIcon },
  ];
  return base;
}

function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-surface/95 backdrop-blur border-t border-border-color z-50 shadow-[0_-2px_8px_rgba(64,224,208,0.25)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-around h-14">
          {buildNavigation().map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center w-full text-[10px] tracking-tight font-medium transition-colors ${
                  isActive
                    ? 'text-primary drop-shadow-[0_0_4px_rgba(64,224,208,0.7)]'
                    : 'text-text-secondary hover:text-primary'
                }`
              }
            >
              <item.icon
                className="h-5 w-5 mb-1 transition-transform duration-200 group-hover:scale-110"
              />
              <span>{item.name}</span>
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  );
}

export default BottomNav;
