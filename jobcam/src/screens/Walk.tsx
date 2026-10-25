import { Check, Mic, MicOff, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Field } from '../components/ui'
import { listProjects, loadSettings, newProject, put, saveProject, get } from '../lib/db'
import { money } from '../lib/estimate'
import { useDictation, useLoad } from '../lib/hooks'
import { uid } from '../lib/id'
import { parseWalk } from '../lib/narration'
import type { Project, WalkResult } from '../lib/types'

const SAMPLE =
  'Walking the job at the Johnson residence, 4821 Oak Ridge Drive. Front yard has three broken sprinkler heads. Zone 4 valve is leaking. We need to replace the controller. Backflow needs service. Back fence looks fine.'

export default function Walk() {
  const nav = useNavigate()
  const [text, setText] = useState('')
  const [result, setResult] = useState<WalkResult | null>(null)
  const [target, setTarget] = useState('new')
  const [projects] = useLoad(listProjects, [])
  const dict = useDictation((t) => setText((x) => (x ? `${x} ${t}` : t)))

  const analyze = async () => setResult(parseWalk(text, (await loadSettings()).priceBook))

  const save = async () => {
    if (!result) return
    let project: Project | undefined
    if (target === 'new') {
      project = newProject({
        name: result.customer ? `${result.customer} – walkthrough` : result.address || 'New walkthrough',
        address: result.address ?? '', customer: result.customer ?? '', notes: result.notes.join('. '),
      })
    } else {
      project = await get<Project>('projects', target)
      if (project && result.notes.length) project = { ...project, notes: [project.notes, ...result.notes].filter(Boolean).join('\n') }
    }
    if (!project) return
    await saveProject(project)
    const now = Date.now()
    const todo = [...result.tasks, ...result.issues.map((i) => `Resolve: ${i}`)]
    if (todo.length) await put('checklists', { id: uid(), projectId: project.id, title: 'Walkthrough punch list', createdAt: now, items: todo.map((t) => ({ id: uid(), text: t, done: false })) })
    if (result.lineItems.length) {
      const s = await loadSettings()
      await put('estimates', { id: uid(), projectId: project.id, title: 'Estimate from walkthrough', proposal: false, createdAt: now, taxRate: s.taxRate, items: result.lineItems.map((l) => ({ ...l, id: uid() })) })
    }
    nav(`/p/${project.id}`)
  }

  const total = result?.lineItems.reduce((s, l) => s + l.qty * l.unitPrice, 0) ?? 0

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold">Walk the job</h1>
        <p className="text-sm text-slate-500">Talk through the site. JobCam sorts what you say into issues, a punch list and a priced estimate – on-device, no cloud.</p>
      </div>

      <div className="card space-y-3">
        <textarea className="input min-h-40" value={text} onChange={(e) => setText(e.target.value)} placeholder="“Walking the job at the Smith residence, 12 Main Street. Two broken sprinkler heads out front…”" aria-label="Narration" />
        {dict.interim && <p className="text-sm italic text-slate-500">…{dict.interim}</p>}
        {dict.error && <p className="text-sm text-red-600">Mic error: {dict.error}</p>}
        <div className="flex flex-wrap gap-2">
          {dict.supported ? (
            <button className={`btn ${dict.listening ? 'btn-danger' : ''}`} onClick={dict.listening ? dict.stop : dict.start}>
              {dict.listening ? <><MicOff size={18} /> Stop</> : <><Mic size={18} /> Dictate</>}
            </button>
          ) : (
            <span className="self-center text-xs text-slate-500">Voice input isn’t supported in this browser – type or use your keyboard’s dictation.</span>
          )}
          <button className="btn" onClick={() => setText(SAMPLE)}>Try an example</button>
          <span className="flex-1" />
          <button className="btn btn-primary" disabled={!text.trim()} onClick={analyze}><Sparkles size={18} /> Organize</button>
        </div>
      </div>

      {result && (
        <div className="card space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Customer"><input className="input" value={result.customer ?? ''} onChange={(e) => setResult({ ...result, customer: e.target.value })} /></Field>
            <Field label="Address"><input className="input" value={result.address ?? ''} onChange={(e) => setResult({ ...result, address: e.target.value })} /></Field>
          </div>
          <Section title={`Issues found (${result.issues.length})`} items={result.issues} />
          <Section title={`Punch list (${result.tasks.length})`} items={result.tasks} />
          <Section title={`Notes (${result.notes.length})`} items={result.notes} />
          {result.lineItems.length > 0 && (
            <div>
              <h3 className="label">Estimate ({money(total)})</h3>
              <ul className="space-y-1 text-sm">
                {result.lineItems.map((l) => <li key={l.description} className="flex justify-between"><span>{l.qty} × {l.description}</span><span>{money(l.qty * l.unitPrice)}</span></li>)}
              </ul>
            </div>
          )}
          <div className="flex flex-col gap-2 border-t border-slate-200 pt-3 dark:border-slate-800 sm:flex-row">
            <select className="input" value={target} onChange={(e) => setTarget(e.target.value)} aria-label="Save to">
              <option value="new">Create a new project</option>
              {projects?.map((p) => <option key={p.id} value={p.id}>Add to: {p.name}</option>)}
            </select>
            <button className="btn btn-primary shrink-0" onClick={save}><Check size={18} /> Save</button>
          </div>
        </div>
      )}
    </div>
  )
}

function Section({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null
  return (
    <div>
      <h3 className="label">{title}</h3>
      <ul className="list-inside list-disc space-y-0.5 text-sm">{items.map((i, n) => <li key={n}>{i}</li>)}</ul>
    </div>
  )
}
