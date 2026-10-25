import { ListPlus, Loader2, Sparkles, Tags, Type } from 'lucide-react'
import { useState } from 'react'
import { analyzeMedia } from '../lib/ai'
import { toModelDataUrl } from '../lib/image'
import { sampleFrames } from '../lib/video'
import type { AiSettings, Photo, Project, Severity } from '../lib/types'

const SEV: Record<Severity, string> = {
  high: 'bg-red-600 text-white', medium: 'bg-amber-500 text-black', low: 'bg-slate-400 text-black',
}

/** Run + show the AI's analysis of one photo or video, with one-tap "apply" actions. */
export async function runAnalysis(photo: Photo, project: Pick<Project, 'name' | 'address'> | undefined, ai: AiSettings): Promise<Photo> {
  const frames = photo.kind === 'video'
    ? await sampleFrames(photo.blob)
    : [{ dataUrl: await toModelDataUrl(photo.blob), label: undefined }]
  const analysis = await analyzeMedia(frames, { projectName: project?.name, address: project?.address, caption: photo.caption, tags: photo.tags, isVideo: photo.kind === 'video' }, ai)
  return { ...photo, ai: analysis }
}

export default function AiPanel({ photo, project, ai, onUpdate, onAddIssues }: {
  photo: Photo
  project?: Project
  ai: AiSettings
  onUpdate: (p: Photo) => void
  onAddIssues: (items: string[]) => void
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const a = photo.ai
  const configured = Boolean(ai.model && (ai.endpoint || ai.provider === 'anthropic'))

  const run = async () => {
    setBusy(true); setError('')
    try { onUpdate(await runAnalysis(photo, project, ai)) } catch (e) { setError((e as Error).message) } finally { setBusy(false) }
  }

  return (
    <div className="space-y-3 rounded-xl border border-purple-300 bg-purple-50 p-3 dark:border-purple-900 dark:bg-purple-950/40">
      <div className="flex items-center gap-2">
        <h3 className="flex items-center gap-1.5 font-bold text-purple-800 dark:text-purple-300"><Sparkles size={16} /> AI analysis</h3>
        <span className="flex-1" />
        <button className="btn !py-1.5" disabled={busy || !configured} onClick={run}>
          {busy ? <><Loader2 size={16} className="animate-spin" /> Analyzing…</> : a ? 'Re-analyze' : 'Analyze'}
        </button>
      </div>
      {!configured && <p className="text-sm text-slate-600 dark:text-slate-300">Add your AI provider in <b>Settings</b> to analyze {photo.kind === 'video' ? 'videos (sampled frames)' : 'photos'}. This photo is only sent when you click Analyze.</p>}
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}

      {a && (
        <div className="space-y-3 text-sm">
          <p>{a.summary} <span className="text-xs text-slate-500">({a.confidence} confidence · {a.model})</span></p>

          {a.issues.length > 0 && (
            <ul className="space-y-2">
              {a.issues.map((i, n) => (
                <li key={n} className="rounded-lg bg-white p-2 dark:bg-slate-900">
                  <p><span className={`mr-2 rounded px-1.5 py-0.5 text-xs font-bold uppercase ${SEV[i.severity]}`}>{i.severity}</span><b>{i.title}</b></p>
                  {i.evidence && <p className="text-slate-600 dark:text-slate-400">Seen: {i.evidence}</p>}
                  {i.recommendation && <p>Fix: {i.recommendation}</p>}
                </li>
              ))}
            </ul>
          )}
          {a.observations.length > 0 && <ul className="list-inside list-disc text-slate-700 dark:text-slate-300">{a.observations.map((o, n) => <li key={n}>{o}</li>)}</ul>}
          {a.materials.length > 0 && <p><b>Materials:</b> {a.materials.join(', ')}</p>}
          {a.safety.length > 0 && <p className="text-red-700 dark:text-red-400"><b>Safety:</b> {a.safety.join('; ')}</p>}
          {a.reasoning && <details><summary className="cursor-pointer font-semibold">How the AI reasoned</summary><p className="mt-1 text-slate-700 dark:text-slate-300">{a.reasoning}</p></details>}

          <div className="flex flex-wrap gap-2">
            {a.caption && a.caption !== photo.caption && <button className="btn !py-1.5" onClick={() => onUpdate({ ...photo, caption: a.caption })}><Type size={16} /> Use caption</button>}
            {a.tags.some((t) => !photo.tags.includes(t)) && <button className="btn !py-1.5" onClick={() => onUpdate({ ...photo, tags: [...new Set([...photo.tags, ...a.tags])] })}><Tags size={16} /> Add tags</button>}
            {a.issues.length > 0 && <button className="btn !py-1.5" onClick={() => onAddIssues(a.issues.map((i) => `${i.title}${i.recommendation ? ` – ${i.recommendation}` : ''}`))}><ListPlus size={16} /> Add to punch list</button>}
          </div>
        </div>
      )}
    </div>
  )
}
