import { Camera, FolderOpen, Mic, Settings as Cog } from 'lucide-react'
import { HashRouter, NavLink, Route, Routes } from 'react-router-dom'
import Capture from './screens/Capture'
import ProjectDetail from './screens/ProjectDetail'
import Projects from './screens/Projects'
import SettingsScreen from './screens/SettingsScreen'
import Walk from './screens/Walk'

const NAV = [
  { to: '/', label: 'Projects', icon: FolderOpen, end: true },
  { to: '/capture', label: 'Capture', icon: Camera },
  { to: '/walk', label: 'Walk', icon: Mic },
  { to: '/settings', label: 'Settings', icon: Cog },
]

export default function App() {
  return (
    <HashRouter>
      <div className="min-h-dvh md:pl-56">
        <aside className="fixed inset-y-0 left-0 hidden w-56 flex-col gap-1 border-r border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 md:flex">
          <div className="mb-4 flex items-center gap-2 px-2 text-xl font-extrabold">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-blue-600 text-white"><Camera size={18} /></span> JobCam
          </div>
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold ${isActive ? 'bg-blue-600 text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
              <Icon size={18} /> {label}
            </NavLink>
          ))}
          <p className="mt-auto px-2 text-xs text-slate-500">Free &amp; open source.<br />Stored on this device. AI only runs when you ask.</p>
        </aside>
        <main className="mx-auto max-w-5xl p-4 pb-28 md:pb-8">
          <Routes>
            <Route path="/" element={<Projects />} />
            <Route path="/p/:id" element={<ProjectDetail />} />
            <Route path="/capture" element={<Capture />} />
            <Route path="/walk" element={<Walk />} />
            <Route path="/settings" element={<SettingsScreen />} />
            <Route path="*" element={<Projects />} />
          </Routes>
        </main>
        <nav className="safe-b fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 md:hidden">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => `flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold ${isActive ? 'text-blue-600' : 'text-slate-500'}`}>
              <Icon size={22} /> {label}
            </NavLink>
          ))}
        </nav>
      </div>
    </HashRouter>
  )
}
