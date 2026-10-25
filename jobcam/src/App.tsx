import { Camera, FolderOpen, Mic, Settings as Cog } from 'lucide-react'
import { useEffect, useState } from 'react'
import { applyBrand } from './lib/brand'
import { loadSettings } from './lib/db'
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
  const [{ logo, name }, setBrand] = useState({ logo: '', name: 'JobCam' })
  useEffect(() => {
    // re-theme on load and whenever Settings change (saveSettings dispatches this event)
    const sync = () => loadSettings().then((s) => {
      applyBrand(s.branding.color)
      setBrand({ logo: /^data:image\//.test(s.branding.logo) ? s.branding.logo : '', name: s.companyName && s.companyName !== 'My Company' ? s.companyName : 'JobCam' })
    })
    void sync()
    window.addEventListener('jobcam:settings', sync)
    return () => window.removeEventListener('jobcam:settings', sync)
  }, [])
  return (
    <HashRouter>
      <div className="min-h-dvh md:pl-56">
        <aside className="fixed inset-y-0 left-0 hidden w-56 flex-col gap-1 border-r border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 md:flex">
          <div className="mb-4 flex items-center gap-2 px-2 text-lg font-extrabold">
            {logo ? <img src={logo} alt="" className="h-9 max-w-[56px] object-contain" /> : <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand text-white"><Camera size={18} /></span>}
            <span className="min-w-0 truncate">{name}</span>
          </div>
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold ${isActive ? 'bg-brand text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
              <Icon size={18} /> {label}
            </NavLink>
          ))}
          <p className="mt-auto px-2 text-xs text-slate-500">Free &amp; open source.<br />Stored on this device. AI only runs when you ask.</p>
        </aside>
        <main className="mx-auto max-w-5xl p-4 pb-28 md:pb-8">
          <div className="mb-3 flex items-center gap-2 font-extrabold md:hidden">
            {logo ? <img src={logo} alt="" className="h-8 max-w-[48px] object-contain" /> : <span className="grid h-7 w-7 place-items-center rounded-lg bg-brand text-white"><Camera size={16} /></span>}
            <span className="truncate">{name}</span>
          </div>
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
            <NavLink key={to} to={to} end={end} className={({ isActive }) => `flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold ${isActive ? 'text-brand' : 'text-slate-500'}`}>
              <Icon size={22} /> {label}
            </NavLink>
          ))}
        </nav>
      </div>
    </HashRouter>
  )
}
