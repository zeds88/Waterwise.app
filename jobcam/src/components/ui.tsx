import { X } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'
import { useObjectUrl } from '../lib/hooks'

export function Modal({ title, onClose, children, wide }: { title?: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className={`safe-b max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 shadow-xl dark:bg-slate-900 sm:rounded-3xl ${wide ? 'sm:max-w-3xl' : 'sm:max-w-md'}`}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">{title}</h2>
          <button className="btn btn-ghost !p-2" onClick={onClose} aria-label="Close"><X size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block"><span className="label">{label}</span>{children}</label>
}

export function Empty({ icon, title, hint, children }: { icon: ReactNode; title: string; hint?: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 p-10 text-center text-slate-500 dark:border-slate-700">
      {icon}
      <p className="font-semibold text-slate-700 dark:text-slate-200">{title}</p>
      {hint && <p className="max-w-xs text-sm">{hint}</p>}
      {children}
    </div>
  )
}

export function Img({ blob, alt = '', className = '' }: { blob?: Blob; alt?: string; className?: string }) {
  const url = useObjectUrl(blob)
  return url ? <img src={url} alt={alt} className={className} draggable={false} /> : <div className={`${className} animate-pulse bg-slate-300 dark:bg-slate-800`} />
}

export const PRESET_TAGS = ['Before', 'After', 'Progress', 'Issue', 'Damage', 'Materials', 'Safety', 'Final']

export function TagPicker({ value, onChange }: { value: string[]; onChange: (t: string[]) => void }) {
  const toggle = (t: string) => onChange(value.includes(t) ? value.filter((x) => x !== t) : [...value, t])
  const all = [...PRESET_TAGS, ...value.filter((t) => !PRESET_TAGS.includes(t))]
  return (
    <div className="flex flex-wrap gap-2">
      {all.map((t) => (
        <button key={t} type="button" className={`chip ${value.includes(t) ? 'chip-on' : ''}`} onClick={() => toggle(t)}>{t}</button>
      ))}
      <button
        type="button"
        className="chip"
        onClick={() => {
          const t = window.prompt('New tag')?.trim()
          if (t && !value.includes(t)) onChange([...value, t])
        }}
      >+ tag</button>
    </div>
  )
}
