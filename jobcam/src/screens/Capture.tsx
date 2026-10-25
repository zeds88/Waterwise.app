import { Camera as CamIcon, ImagePlus, Square, SwitchCamera, Video } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { TagPicker } from '../components/ui'
import { addMedia } from '../lib/capture'
import { warmPosition } from '../lib/image'
import { fmtDuration } from '../lib/video'
import { listProjects } from '../lib/db'
import { useLoad } from '../lib/hooks'

export default function Capture() {
  const [params] = useSearchParams()
  const [projects] = useLoad(() => listProjects().then((l) => l.filter((p) => p.status === 'active')), [])
  const [projectId, setProjectId] = useState(params.get('project') ?? '')
  const [tags, setTags] = useState<string[]>([])
  const [facing, setFacing] = useState<'environment' | 'user'>('environment')
  const [mode, setMode] = useState<'photo' | 'video'>('photo')
  const [recording, setRecording] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const recorder = useRef<MediaRecorder | null>(null)
  const [count, setCount] = useState(0)
  const [status, setStatus] = useState('')
  const [camError, setCamError] = useState('')
  const video = useRef<HTMLVideoElement>(null)
  const stream = useRef<MediaStream | null>(null)
  const file = useRef<HTMLInputElement>(null)

  useEffect(() => { warmPosition() }, [])

  useEffect(() => {
    if (!projectId && projects?.length) setProjectId(projects[0].id)
  }, [projects, projectId])

  const startCam = useCallback(async () => {
    stream.current?.getTracks().forEach((t) => t.stop())
    setCamError('')
    if (!navigator.mediaDevices?.getUserMedia) { setCamError('Live camera is not available here – use "Pick photos" instead.'); return }
    const video_ = { facingMode: facing, width: { ideal: mode === 'video' ? 1920 : 3840 }, height: { ideal: mode === 'video' ? 1080 : 2160 } }
    try {
      try {
        stream.current = await navigator.mediaDevices.getUserMedia({ video: video_, audio: mode === 'video' })
      } catch (e) {
        if (mode !== 'video') throw e
        // microphone denied/unavailable: still record, just silently
        stream.current = await navigator.mediaDevices.getUserMedia({ video: video_, audio: false })
      }
      if (video.current) video.current.srcObject = stream.current
    } catch {
      setCamError('Camera permission denied or unavailable – use "Pick photos" instead.')
    }
  }, [facing, mode])

  useEffect(() => {
    startCam()
    return () => stream.current?.getTracks().forEach((t) => t.stop())
  }, [startCam])

  const saveBlob = async (b: Blob) => {
    if (!projectId) { setStatus('Create or pick a project first'); return }
    try { await addMedia(projectId, b, { tags }) } catch (e) { setStatus((e as Error).message); return }
    setCount((c) => c + 1)
    setStatus('Saved ✓')
    setTimeout(() => setStatus(''), 1200)
  }

  const toggleRecord = () => {
    if (recorder.current) { recorder.current.stop(); return }
    if (!stream.current) return
    const mime = ['video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'].find((m) => MediaRecorder.isTypeSupported(m))
    const chunks: Blob[] = []
    const rec = new MediaRecorder(stream.current, mime ? { mimeType: mime } : undefined)
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data)
    rec.onstop = async () => {
      recorder.current = null
      setRecording(false)
      await saveBlob(new Blob(chunks, { type: rec.mimeType || 'video/webm' }))
    }
    recorder.current = rec
    rec.start(1000)
    setElapsed(0)
    setRecording(true)
  }

  useEffect(() => {
    if (!recording) return
    const t = setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => clearInterval(t)
  }, [recording])
  useEffect(() => () => { if (recorder.current?.state === 'recording') recorder.current.stop() }, [])

  const shoot = async () => {
    const v = video.current
    if (!v || !v.videoWidth) return
    const c = document.createElement('canvas')
    c.width = v.videoWidth
    c.height = v.videoHeight
    c.getContext('2d')!.drawImage(v, 0, 0)
    const blob = await new Promise<Blob | null>((r) => c.toBlob(r, 'image/jpeg', 0.92))
    if (blob) await saveBlob(blob)
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">Capture</h1>
      {projects && projects.length === 0 ? (
        <div className="card">No active projects. <Link className="font-semibold text-blue-600" to="/">Create one first →</Link></div>
      ) : (
        <select className="input" value={projectId} onChange={(e) => setProjectId(e.target.value)} aria-label="Project">
          {projects?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      )}

      <div className="flex gap-2">
        {(['photo', 'video'] as const).map((m) => (
          <button key={m} className={`chip !px-4 !py-2 capitalize ${mode === m ? 'chip-on' : ''}`} disabled={recording} onClick={() => setMode(m)}>{m}</button>
        ))}
      </div>

      <div className="relative overflow-hidden rounded-2xl bg-black">
        <video ref={video} autoPlay playsInline muted className="aspect-[3/4] w-full object-cover sm:aspect-video" />
        {camError && <p className="absolute inset-0 grid place-items-center p-6 text-center text-sm text-white">{camError}</p>}
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-around bg-gradient-to-t from-black/70 p-4">
          <label className="btn cursor-pointer !rounded-full !p-3" aria-label="Pick files"><ImagePlus size={22} />
            <input ref={file} type="file" accept="image/*,video/*,.heic,.heif,.mov,.mp4,.m4v,.webm" multiple className="sr-only" aria-label="Pick photos or videos" onChange={async (e) => {
              const files = Array.from(e.target.files ?? [])
              e.target.value = ''
              for (const f of files) await saveBlob(f)
            }} />
          </label>
          {mode === 'photo' ? (
            <button className="grid place-items-center rounded-full border-4 border-white bg-white/20 active:scale-90" style={{ width: 72, height: 72 }} onClick={shoot} aria-label="Take photo">
              <CamIcon className="text-white" />
            </button>
          ) : (
            <button className="grid place-items-center rounded-full border-4 border-white bg-red-600/80 active:scale-90" style={{ width: 72, height: 72 }} onClick={toggleRecord} aria-label={recording ? 'Stop recording' : 'Start recording'}>
              {recording ? <Square className="text-white" fill="white" /> : <Video className="text-white" />}
            </button>
          )}
          <button className="btn !rounded-full !p-3" onClick={() => setFacing((f) => (f === 'environment' ? 'user' : 'environment'))} aria-label="Switch camera"><SwitchCamera size={22} /></button>
        </div>
        {recording && <span className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-red-600 px-3 py-1 text-xs font-bold text-white"><span className="h-2 w-2 animate-pulse rounded-full bg-white" /> REC {fmtDuration(elapsed)}</span>}
        {(count > 0 || status) && <span className="absolute left-3 top-3 rounded-full bg-black/60 px-3 py-1 text-xs font-bold text-white">{status || `${count} saved`}{status && count ? ` · ${count}` : ''}</span>}
      </div>

      <div>
        <span className="label">Tag the next photos</span>
        <TagPicker value={tags} onChange={setTags} />
      </div>
      <p className="text-xs text-slate-500">Photos and videos are timestamped, GPS-stamped (if you allow it) and stored on this device. They are only sent to an AI provider if you press Analyze.</p>
    </div>
  )
}
