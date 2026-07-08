import { NavLink } from 'react-router-dom';
import { Home, CalendarDays, BarChart3, Wrench, User } from 'lucide-react';

const tabs = [
  { to: '/app/home', label: 'Home', icon: Home },
  { to: '/app/schedule', label: 'Schedule', icon: CalendarDays },
  { to: '/app/impact', label: 'Impact', icon: BarChart3 },
  { to: '/app/installers', label: 'Installers', icon: Wrench },
  { to: '/app/profile', label: 'Profile', icon: User },
];

export default function TabBar() {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 flex justify-center pointer-events-none">
      <div className="w-full max-w-md bg-white/95 backdrop-blur border-t border-slate-200 flex justify-around px-2 pt-2 pb-4 pointer-events-auto">
        {tabs.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 px-3 py-1 rounded-xl text-[11px] font-medium transition-colors ${
                isActive ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'
              }`
            }
          >
            <Icon size={22} strokeWidth={2.2} />
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
