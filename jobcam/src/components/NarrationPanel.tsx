import { FileText, Loader2, Mic } from 'lucide-react'
import { useState } from 'react'
import { money } from '../lib/estimate'
import { parseWalk } from '../lib/narration'
import { fmtDuration } from '../lib/video'
import { transcribeVideo } from '../lib/transcribe'
import type { LineItem, Photo, Settings } from '../lib/types'

/** Speech-to-text of a video's soundtrack, with tap-to-seek timestamps and one-tap conversion into work items. */
export default function NarrationPanel({ photo, settings, onUpdate, onSeek, onAddIssues, onAddEstimate }: {
  photo: Photo
  settings: Settings
  onUpdate: (p: Photo) => void
  onSeek: (seconds: number) => void
  onAddIssues: (items: string[]) => void
  onAddEstimate: (items: Omit<LineItem, 'id'>[]) => void
}) {
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const t = photo.transcript
  const engine = settings.transcription.engine

  const run = async () => {
    setBusy(true); setError(''); setStatus('')
    try { onUpdate({ ...photo, transcript: await transcribeVideo(photo.blob, settings.transcription, setStatus) }) }
    catch (e) { setError((e as Error).message) } finally { setBusy(false); setStatus('') }
  }

  const walk = t ? parseWalk(t.text, settings.priceBook) : null
  const todo = walk ? [...walk.tasks, ...walk.issues.map((i) => `Resolve: ${i}`)] : []

  return (
    <div className="space-y-3 rounded-xl border border-sky-300 bg-sky-50 p-3 dark:border-sky-900 dark:bg-sky-950/40">
      <div className="flex items-center gap-2">
        <h3 className="flex items-center gap-1.5 font-bold text-sky-800 dark:text-sky-300"><Mic size={16} /> Narration</h3>
        <span className="flex-1" />
        <button className="btn !py-1.5" disabled={busy || engine === 'off'} onClick={run}>
          {busy ? <><Loader2 size={16} className="animate-spin" /> {status || 'Working…'}</> : t ? 'Re-transcribe' : 'Transcribe audio'}
        </button>
      </div>
      {engine === 'off' && <p className="text-sm text-slate-600 dark:text-slate-300">Turn on transcription in <b>Settings</b>.</p>}
      {!t && !error && engine === 'local' && <p className="text-xs text-slate-500">Runs on this device with Whisper. The first time downloads a ~40 MB speech model, then it works offline. Audio never leaves your phone.</p>}
      {!t && !error && engine === 'api' && <p className="text-xs text-slate-500">The video’s audio (not the video) is uploaded to your transcription endpoint.</p>}
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}

      {t && walk && (
        <div className="space-y-3 text-sm">
          <ul className="max-h-48 space-y-1 overflow-y-auto" aria-label="Transcript">
            {(t.chunks.length ? t.chunks : [{ start: 0, end: 0, text: t.text }]).map((c, i) => (
              <li key={i}>
                <button className="mr-2 rounded bg-sky-200 px-1.5 text-xs font-bold text-sky-900 dark:bg-sky-900 dark:text-sky-100" onClick={() => onSeek(c.start)} aria-label={`Jump to ${fmtDuration(c.start)}`}>{fmtDuration(c.start)}</button>
                {c.text}
              </li>
            ))}
          </ul>
          <p className="text-xs text-slate-500">{t.engine === 'local' ? 'On-device' : 'API'} · {t.model} · speech-to-text can make mistakes – check numbers and names.</p>
          <div className="flex flex-wrap gap-2">
            {todo.length > 0 && <button className="btn !py-1.5" onClick={() => onAddIssues(todo)}><FileText size={16} /> Add {todo.length} to punch list</button>}
            {walk.lineItems.length > 0 && <button className="btn !py-1.5" onClick={() => onAddEstimate(walk.lineItems)}><FileText size={16} /> Estimate from narration ({money(walk.lineItems.reduce((s, l) => s + l.qty * l.unitPrice, 0))})</button>}
          </div>
        </div>
      )}
    </div>
  )
}
