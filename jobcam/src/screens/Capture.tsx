import { Camera as CamIcon, ImagePlus, SwitchCamera } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { TagPicker } from '../components/ui'
import { addPhoto } from '../lib/capture'
import { listProjects } from '../lib/db'
import { useLoad } from '../lib/hooks'

export default function Capture() {
  const [params] = useSearchParams()
  const [projects] = useLoad(() => listProjects().then((l) => l.filter((p) => p.status === 'active')), [])
  const [projectId, setProjectId] = useState(params.get('project') ?? '')
  const [tags, setTags] = useState<string[]>([])
  const [facing, setFacing] = useState<'environment' | 'user'>('environment')
  const [count, setCount] = useState(0)
  const [status, setStatus] = useState('')
  const [camError, setCamError] = useState('')
  const video = useRef<HTMLVideoElement>(null)
  const stream = useRef<MediaStream | null>(null)
  const file = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!projectId && projects?.length) setProjectId(projects[0].id)
  }, [projects, projectId])

  const startCam = useCallback(async () => {
    stream.current?.getTracks().forEach((t) => t.stop())
    setCamError('')
    if (!navigator.mediaDevices?.getUserMedia) { setCamError('Live camera is not available here – use "Pick photos" instead.'); return }
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing, width: { ideal: 3840 }, height: { ideal: 2160 } }, audio: false })
      if (video.current) video.current.srcObject = stream.current
    } catch {
      setCamError('Camera permission denied or unavailable – use "Pick photos" instead.')
    }
  }, [facing])

  useEffect(() => {
    startCam()
    return () => stream.current?.getTracks().forEach((t) => t.stop())
  }, [startCam])

  const saveBlob = async (b: Blob) => {
    if (!projectId) { setStatus('Create or pick a project first'); return }
    await addPhoto(projectId, b, { tags })
    setCount((c) => c + 1)
    setStatus('Saved ✓')
    setTimeout(() => setStatus(''), 1200)
  }

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

      <div className="relative overflow-hidden rounded-2xl bg-black">
        <video ref={video} autoPlay playsInline muted className="aspect-[3/4] w-full object-cover sm:aspect-video" />
        {camError && <p className="absolute inset-0 grid place-items-center p-6 text-center text-sm text-white">{camError}</p>}
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-around bg-gradient-to-t from-black/70 p-4">
          <button className="btn !rounded-full !p-3" onClick={() => file.current?.click()} aria-label="Pick photos"><ImagePlus size={22} /></button>
          <button className="grid place-items-center rounded-full border-4 border-white bg-white/20 active:scale-90" style={{ width: 72, height: 72 }} onClick={shoot} aria-label="Take photo">
            <CamIcon className="text-white" />
          </button>
          <button className="btn !rounded-full !p-3" onClick={() => setFacing((f) => (f === 'environment' ? 'user' : 'environment'))} aria-label="Switch camera"><SwitchCamera size={22} /></button>
        </div>
        {(count > 0 || status) && <span className="absolute left-3 top-3 rounded-full bg-black/60 px-3 py-1 text-xs font-bold text-white">{status || `${count} saved`}{status && count ? ` · ${count}` : ''}</span>}
      </div>

      <input ref={file} type="file" accept="image/*" multiple capture="environment" hidden onChange={async (e) => {
        for (const f of Array.from(e.target.files ?? [])) await saveBlob(f)
        e.target.value = ''
      }} />

      <div>
        <span className="label">Tag the next photos</span>
        <TagPicker value={tags} onChange={setTags} />
      </div>
      <p className="text-xs text-slate-500">Photos get a timestamp and GPS (if you allow it) and are stored only on this device.</p>
    </div>
  )
}
