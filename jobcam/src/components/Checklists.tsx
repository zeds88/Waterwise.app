import { Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { put, remove } from '../lib/db'
import { uid } from '../lib/id'
import type { Checklist } from '../lib/types'

const TEMPLATES: Record<string, string[]> = {
  'Pre-job walkthrough': ['Meet customer & confirm scope', 'Photograph existing conditions', 'Locate shutoffs / utilities', 'Note hazards & access', 'Confirm start date'],
  'Safety check': ['PPE on site', 'Hazards marked', 'Utilities located', 'Fire extinguisher accessible', 'Emergency contacts posted'],
  'Punch list': [],
  'Closeout': ['All work complete', 'Site cleaned', 'After photos taken', 'Customer walkthrough', 'Customer signed off'],
}

export default function Checklists({ projectId, lists: saved, reload }: { projectId: string; lists: Checklist[]; reload: () => void }) {
  const [draft, setDraft] = useState<Record<string, string>>({})
  // optimistic copy so checkboxes/typing respond instantly; IndexedDB write happens in the background
  const [lists, setLists] = useState(saved)
  useEffect(() => setLists(saved), [saved])
  const save = (c: Checklist) => { setLists((l) => (l.some((x) => x.id === c.id) ? l.map((x) => (x.id === c.id ? c : x)) : [...l, c])); void put('checklists', c) }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {Object.keys(TEMPLATES).map((t) => (
          <button key={t} className="chip" onClick={async () => { await put('checklists', { id: uid(), projectId, title: t, createdAt: Date.now(), items: TEMPLATES[t].map((text) => ({ id: uid(), text, done: false })) }); reload() }}>
            <Plus size={12} className="mr-1" /> {t}
          </button>
        ))}
      </div>
      {lists.length === 0 && <p className="text-sm text-slate-500">Start from a template above.</p>}
      {lists.map((c) => {
        const done = c.items.filter((i) => i.done).length
        return (
          <div key={c.id} className="card space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-bold">{c.title} <span className="text-sm font-normal text-slate-500">{done}/{c.items.length}</span></h3>
              <button className="btn btn-ghost !p-2" aria-label="Delete checklist" onClick={async () => { await remove('checklists', c.id); reload() }}><Trash2 size={16} /></button>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"><div className="h-full bg-green-500 transition-all" style={{ width: `${c.items.length ? (done / c.items.length) * 100 : 0}%` }} /></div>
            {c.items.map((i) => (
              <label key={i.id} className="flex items-center gap-3 py-1">
                <input type="checkbox" className="h-5 w-5 accent-green-600" checked={i.done} onChange={() => save({ ...c, items: c.items.map((x) => (x.id === i.id ? { ...x, done: !x.done } : x)) })} />
                <span className={i.done ? 'text-slate-400 line-through' : ''}>{i.text}</span>
              </label>
            ))}
            <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); const t = (draft[c.id] ?? '').trim(); if (!t) return; setDraft({ ...draft, [c.id]: '' }); save({ ...c, items: [...c.items, { id: uid(), text: t, done: false }] }) }}>
              <input className="input" placeholder="Add item…" value={draft[c.id] ?? ''} onChange={(e) => setDraft({ ...draft, [c.id]: e.target.value })} />
              <button className="btn" type="submit" aria-label="Add item"><Plus size={18} /></button>
            </form>
          </div>
        )
      })}
    </div>
  )
}
