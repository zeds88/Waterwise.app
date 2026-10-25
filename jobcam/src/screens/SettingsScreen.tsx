import { Download, Plus, Trash2, Upload } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Field } from '../components/ui'
import { exportAll, importAll } from '../lib/backup'
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from '../lib/db'
import { callModel } from '../lib/ai'
import { LOCAL_MODELS } from '../lib/transcribe'
import type { Settings } from '../lib/types'

const AI_PRESETS: { label: string; ai: Pick<Settings['ai'], 'provider' | 'endpoint'> }[] = [
  { label: 'Claude', ai: { provider: 'anthropic', endpoint: '' } },
  { label: 'OpenAI', ai: { provider: 'openai', endpoint: 'https://api.openai.com/v1/chat/completions' } },
  { label: 'Ollama (local)', ai: { provider: 'openai', endpoint: 'http://localhost:11434/v1/chat/completions' } },
  { label: 'LM Studio (local)', ai: { provider: 'openai', endpoint: 'http://localhost:1234/v1/chat/completions' } },
]

export default function SettingsScreen() {
  const [s, setS] = useState<Settings>(DEFAULT_SETTINGS)
  const [loaded, setLoaded] = useState(false)
  const [msg, setMsg] = useState('')
  const [testing, setTesting] = useState(false)
  const [storage, setStorage] = useState('')
  useEffect(() => {
    navigator.storage?.estimate?.().then((e) => {
      if (e.usage !== undefined && e.quota) setStorage(`${(e.usage / 1048576).toFixed(0)} MB used of about ${(e.quota / 1048576).toFixed(0)} MB available on this device`)
    }).catch(() => {})
  }, [])
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
        <h2 className="font-bold">AI analysis &amp; reasoning</h2>
        <p className="text-sm text-slate-500">
          Bring your own model. Photos (and sampled video frames) are sent to the provider <b>only when you press Analyze</b>, straight from your browser – never through us.
          Leave blank to stay fully offline. For a private setup use a local vision model (e.g. Ollama <code>llava</code> / <code>qwen2.5vl</code>).
        </p>
        <div className="flex flex-wrap gap-2">
          {AI_PRESETS.map((p) => (
            <button key={p.label} className={`chip ${s.ai.provider === p.ai.provider && s.ai.endpoint === p.ai.endpoint ? 'chip-on' : ''}`} onClick={() => setS({ ...s, ai: { ...s.ai, ...p.ai } })}>{p.label}</button>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Provider type">
            <select className="input" value={s.ai.provider} onChange={(e) => setS({ ...s, ai: { ...s.ai, provider: e.target.value as Settings['ai']['provider'] } })}>
              <option value="anthropic">Anthropic (Claude)</option><option value="openai">OpenAI-compatible</option>
            </select>
          </Field>
          <Field label="Model (must support images)"><input className="input" placeholder={s.ai.provider === 'anthropic' ? 'claude-sonnet-5-5' : 'gpt-4o, llava, …'} value={s.ai.model} onChange={(e) => setS({ ...s, ai: { ...s.ai, model: e.target.value } })} /></Field>
          <Field label={s.ai.provider === 'anthropic' ? 'Endpoint (blank = Anthropic API)' : 'Endpoint URL'}><input className="input" placeholder={s.ai.provider === 'anthropic' ? 'https://api.anthropic.com/v1/messages' : 'https://api.openai.com/v1/chat/completions'} value={s.ai.endpoint} onChange={(e) => setS({ ...s, ai: { ...s.ai, endpoint: e.target.value } })} /></Field>
          <Field label="API key (stored only on this device)"><input className="input" type="password" autoComplete="off" value={s.ai.apiKey} onChange={(e) => setS({ ...s, ai: { ...s.ai, apiKey: e.target.value } })} /></Field>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button className="btn" disabled={testing} onClick={async () => {
            setTesting(true)
            try { await callModel([{ type: 'text', text: 'Reply with the single word: ok' }], s.ai, fetch, 20); flash('Connection works ✓') } catch (e) { flash((e as Error).message) } finally { setTesting(false) }
          }}>{testing ? 'Testing…' : 'Test connection'}</button>
          <span className="text-xs text-slate-500">Browsers may block calls to providers without CORS support; Anthropic and local servers (set <code>OLLAMA_ORIGINS=*</code>) work.</span>
        </div>
      </section>

      <section className="card space-y-3">
        <h2 className="font-bold">Video narration (speech-to-text)</h2>
        <p className="text-sm text-slate-500">Turns what you say in a video into a searchable, time-stamped transcript the AI can reason over. The default runs <b>on this device</b> with Whisper – audio never leaves your phone.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Engine">
            <select className="input" value={s.transcription.engine} onChange={(e) => setS({ ...s, transcription: { ...s.transcription, engine: e.target.value as Settings['transcription']['engine'] } })}>
              <option value="local">On-device Whisper (private, free)</option>
              <option value="api">Transcription API (OpenAI-compatible)</option>
              <option value="off">Off</option>
            </select>
          </Field>
          {s.transcription.engine === 'local' && (
            <Field label="Speech model (downloaded once, then cached)">
              <select className="input" value={s.transcription.localModel} onChange={(e) => setS({ ...s, transcription: { ...s.transcription, localModel: e.target.value } })}>
                {LOCAL_MODELS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
              </select>
            </Field>
          )}
          {s.transcription.engine === 'api' && (<>
            <Field label="Endpoint"><input className="input" value={s.transcription.endpoint} onChange={(e) => setS({ ...s, transcription: { ...s.transcription, endpoint: e.target.value } })} /></Field>
            <Field label="Model"><input className="input" value={s.transcription.apiModel} onChange={(e) => setS({ ...s, transcription: { ...s.transcription, apiModel: e.target.value } })} /></Field>
            <Field label="API key (stored only on this device)"><input className="input" type="password" autoComplete="off" value={s.transcription.apiKey} onChange={(e) => setS({ ...s, transcription: { ...s.transcription, apiKey: e.target.value } })} /></Field>
          </>)}
        </div>
        <p className="text-xs text-slate-500">Using Spanish or mixed languages? Pick a <i>multilingual</i> model. English-only models are faster and more accurate for English.</p>
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
        {storage && <p className="text-xs text-slate-500">Storage: {storage}.</p>}
        {msg && <p className={`text-sm font-semibold ${/fail|error|set |choose|no text|not /i.test(msg) ? 'text-red-600' : 'text-green-600'}`} role="status">{msg}</p>}
      </section>
    </div>
  )
}
