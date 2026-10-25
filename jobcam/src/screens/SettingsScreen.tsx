import { Download, Plus, Trash2, Upload } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Field } from '../components/ui'
import { exportAll, importAll } from '../lib/backup'
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from '../lib/db'
import type { Settings } from '../lib/types'

export default function SettingsScreen() {
  const [s, setS] = useState<Settings>(DEFAULT_SETTINGS)
  const [loaded, setLoaded] = useState(false)
  const [msg, setMsg] = useState('')
  const file = useRef<HTMLInputElement>(null)

  useEffect(() => { loadSettings().then((x) => { setS(x); setLoaded(true) }) }, [])
  useEffect(() => { if (loaded) saveSettings(s) }, [s, loaded])

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 4000) }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-extrabold">Settings</h1>

      <section className="card space-y-3">
        <h2 className="font-bold">Your business</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Company name"><input className="input" value={s.companyName} onChange={(e) => setS({ ...s, companyName: e.target.value })} /></Field>
          <Field label="Your name (comments)"><input className="input" value={s.author} onChange={(e) => setS({ ...s, author: e.target.value })} /></Field>
          <Field label="Default tax %"><input className="input" type="number" min={0} step="any" value={s.taxRate} onChange={(e) => setS({ ...s, taxRate: +e.target.value })} /></Field>
        </div>
      </section>

      <section className="card space-y-3">
        <h2 className="font-bold">Price book</h2>
        <p className="text-sm text-slate-500">“Walk the job” matches these keywords in your narration and prices them automatically. Separate keywords with commas.</p>
        {s.priceBook.map((p, i) => (
          <div key={i} className="grid grid-cols-2 gap-2 sm:grid-cols-[2fr_2fr_5rem_6rem_auto]">
            <input className="input col-span-2 sm:col-span-1" aria-label="Keywords" value={p.keywords.join(', ')} onChange={(e) => setS({ ...s, priceBook: s.priceBook.map((x, n) => (n === i ? { ...x, keywords: e.target.value.split(',').map((k) => k.trim()).filter(Boolean) } : x)) })} />
            <input className="input col-span-2 sm:col-span-1" aria-label="Description" value={p.description} onChange={(e) => setS({ ...s, priceBook: s.priceBook.map((x, n) => (n === i ? { ...x, description: e.target.value } : x)) })} />
            <input className="input" aria-label="Unit" value={p.unit} onChange={(e) => setS({ ...s, priceBook: s.priceBook.map((x, n) => (n === i ? { ...x, unit: e.target.value } : x)) })} />
            <input className="input" type="number" min={0} step="any" aria-label="Price" value={p.price} onChange={(e) => setS({ ...s, priceBook: s.priceBook.map((x, n) => (n === i ? { ...x, price: +e.target.value } : x)) })} />
            <button className="btn btn-ghost !p-2" aria-label="Remove" onClick={() => setS({ ...s, priceBook: s.priceBook.filter((_, n) => n !== i) })}><Trash2 size={16} /></button>
          </div>
        ))}
        <button className="btn" onClick={() => setS({ ...s, priceBook: [...s.priceBook, { keywords: [], description: 'New item', unit: 'ea', price: 0 }] })}><Plus size={16} /> Add item</button>
      </section>

      <section className="card space-y-3">
        <h2 className="font-bold">Optional AI polish</h2>
        <p className="text-sm text-slate-500">Bring your own OpenAI-compatible endpoint (OpenAI, a local Ollama/LM Studio server, etc.). Only the text recap is sent – never photos. Leave blank to stay 100% offline.</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Endpoint URL"><input className="input" placeholder="http://localhost:11434/v1/chat/completions" value={s.ai.endpoint} onChange={(e) => setS({ ...s, ai: { ...s.ai, endpoint: e.target.value } })} /></Field>
          <Field label="Model"><input className="input" value={s.ai.model} onChange={(e) => setS({ ...s, ai: { ...s.ai, model: e.target.value } })} /></Field>
          <Field label="API key"><input className="input" type="password" autoComplete="off" value={s.ai.apiKey} onChange={(e) => setS({ ...s, ai: { ...s.ai, apiKey: e.target.value } })} /></Field>
        </div>
      </section>

      <section className="card space-y-3">
        <h2 className="font-bold">Backup &amp; restore</h2>
        <p className="text-sm text-slate-500">Your data lives in this browser. Export a full backup (photos included) to move devices or keep a copy.</p>
        <div className="flex flex-wrap gap-2">
          <button className="btn" onClick={async () => {
            const url = URL.createObjectURL(new Blob([await exportAll()], { type: 'application/json' }))
            const a = document.createElement('a')
            a.href = url; a.download = `jobcam-backup-${new Date().toISOString().slice(0, 10)}.json`; a.click()
            setTimeout(() => URL.revokeObjectURL(url), 10_000)
            flash('Backup downloaded')
          }}><Download size={18} /> Export backup</button>
          <button className="btn" onClick={() => file.current?.click()}><Upload size={18} /> Import backup</button>
          <input ref={file} hidden type="file" accept="application/json,.json" onChange={async (e) => {
            const f = e.target.files?.[0]
            e.target.value = ''
            if (!f) return
            try { const c = await importAll(await f.text()); flash(`Imported ${c.projects} projects, ${c.photos} photos`) } catch (err) { flash((err as Error).message) }
          }} />
        </div>
        {msg && <p className="text-sm font-semibold text-green-600" role="status">{msg}</p>}
      </section>
    </div>
  )
}
