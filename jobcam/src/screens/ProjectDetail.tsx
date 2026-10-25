import { ArrowLeft, Columns2, FileText, ImagePlus, Camera, Pencil, Sparkles, Trash2, MessageSquare, ListChecks, Receipt, Images } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Checklists from '../components/Checklists'
import Compare from '../components/Compare'
import EstimateTab from '../components/EstimateTab'
import PhotoViewer from '../components/PhotoViewer'
import ProjectForm from '../components/ProjectForm'
import { Empty, Img, Modal } from '../components/ui'
import { blobToDataUrl } from '../lib/blob'
import { addPhoto } from '../lib/capture'
import { deleteProject, get, listChecklists, listComments, listEstimates, listPhotos, loadSettings, put, remove, saveProject, savePhoto } from '../lib/db'
import { useLoad } from '../lib/hooks'
import { uid } from '../lib/id'
import { flattenPhoto } from '../lib/image'
import { aiRecap, localRecap } from '../lib/recap'
import { buildReportHtml } from '../lib/report'
import type { Photo, Project } from '../lib/types'

type Tab = 'photos' | 'checklists' | 'estimate' | 'activity'

export default function ProjectDetail() {
  const { id = '' } = useParams()
  const nav = useNavigate()
  const [tab, setTab] = useState<Tab>('photos')
  const [filter, setFilter] = useState('')
  const [viewing, setViewing] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [selecting, setSelecting] = useState(false)
  const [picked, setPicked] = useState<string[]>([])
  const [comparing, setComparing] = useState<[Photo, Photo] | null>(null)
  const [busy, setBusy] = useState('')
  const [recap, setRecap] = useState('')
  const file = useRef<HTMLInputElement>(null)

  const [data, reload] = useLoad(async () => {
    const [project, photos, checklists, comments, estimates, settings] = await Promise.all([
      get<Project>('projects', id), listPhotos(id), listChecklists(id), listComments(id), listEstimates(id), loadSettings(),
    ])
    return { project, photos, checklists, comments, estimates, settings }
  }, [id])

  const [edits, setEdits] = useState<Record<string, Photo>>({})
  useEffect(() => setEdits({}), [data])
  const allTags = useMemo(() => [...new Set((data?.photos ?? []).flatMap((p) => p.tags))], [data?.photos])
  if (!data) return <p className="text-slate-500">Loading…</p>
  const { project, checklists, comments, estimates, settings } = data
  const photos = data.photos.map((p) => edits[p.id] ?? p)
  if (!project) return <Empty icon={<FileText size={32} />} title="Project not found"><Link to="/" className="btn mt-2">Back to projects</Link></Empty>

  const shown = filter ? photos.filter((p) => p.tags.includes(filter)) : photos
  const viewIdx = shown.findIndex((p) => p.id === viewing)

  const updatePhoto = (p: Photo) => { setEdits((e) => ({ ...e, [p.id]: p })); void savePhoto(p) }

  const makeReport = async (action: 'open' | 'download') => {
    setBusy('Building report…')
    try {
      // re-read from the database: tabs save optimistically, so React state may be a beat behind
      const [fp, checklists, comments, estimates] = await Promise.all([listPhotos(id), listChecklists(id), listComments(id), listEstimates(id)])
      const rp = await Promise.all(
        fp.slice().reverse().map(async (p) => ({
          src: await blobToDataUrl(await flattenPhoto(p, 1400)),
          caption: p.caption, tags: p.tags, takenAt: p.takenAt, lat: p.lat, lng: p.lng,
        })),
      )
      const html = buildReportHtml({ settings, project, photos: rp, checklists, comments, estimates, recap: recap || localRecap(project, fp, checklists, comments) })
      const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }))
      if (action === 'open') window.open(url, '_blank')
      else {
        const a = document.createElement('a')
        a.href = url
        a.download = `${project.name.replace(/[^\w]+/g, '-')}-report.html`
        a.click()
      }
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } finally { setBusy('') }
  }

  const doRecap = async (useAi: boolean) => {
    const digest = localRecap(project, photos, checklists, comments)
    if (!useAi) { setRecap(digest); return }
    setBusy('Asking your AI endpoint…')
    try { setRecap(await aiRecap(digest, settings.ai)) } catch (e) { window.alert((e as Error).message) } finally { setBusy('') }
  }

  const TABS: { key: Tab; label: string; icon: typeof Images; n?: number }[] = [
    { key: 'photos', label: 'Photos', icon: Images, n: photos.length },
    { key: 'checklists', label: 'Checklists', icon: ListChecks, n: checklists.length },
    { key: 'estimate', label: 'Estimate', icon: Receipt, n: estimates.length },
    { key: 'activity', label: 'Activity', icon: MessageSquare, n: comments.length },
  ]

  return (
    <div className="space-y-4">
      <Link to="/" className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600"><ArrowLeft size={16} /> Projects</Link>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-extrabold">{project.name}</h1>
          <p className="text-sm text-slate-500">{[project.address, project.customer, project.phone].filter(Boolean).join(' · ') || 'No details yet'}</p>
          <span className="chip mt-1 capitalize">{project.status}</span>
        </div>
        <div className="flex shrink-0 gap-2">
          <button className="btn" onClick={() => setEditing(true)} aria-label="Edit project"><Pencil size={18} /></button>
          <button className="btn btn-primary" onClick={() => makeReport('open')} disabled={!!busy}><FileText size={18} /> Report</button>
        </div>
      </div>
      {busy && <p className="text-sm text-slate-500">{busy}</p>}

      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
        {TABS.map(({ key, label, icon: Icon, n }) => (
          <button key={key} className={`chip !px-4 !py-2 ${tab === key ? 'chip-on' : ''}`} onClick={() => { setTab(key); reload() }}><Icon size={14} className="mr-1.5" /> {label}{n ? ` (${n})` : ''}</button>
        ))}
      </div>

      {tab === 'photos' && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Link to={`/capture?project=${id}`} className="btn btn-primary"><Camera size={18} /> Capture</Link>
            <button className="btn" onClick={() => file.current?.click()}><ImagePlus size={18} /> Add photos</button>
            <button className={`btn ${selecting ? 'btn-primary' : ''}`} onClick={() => { setSelecting((s) => !s); setPicked([]) }}><Columns2 size={18} /> Select</button>
            <input ref={file} hidden type="file" accept="image/*" multiple onChange={async (e) => {
              setBusy('Importing photos…')
              for (const f of Array.from(e.target.files ?? [])) await addPhoto(id, f, { withGps: false, tags: [] })
              e.target.value = ''
              setBusy('')
              reload()
            }} />
          </div>
          {allTags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <button className={`chip ${!filter ? 'chip-on' : ''}`} onClick={() => setFilter('')}>All</button>
              {allTags.map((t) => <button key={t} className={`chip ${filter === t ? 'chip-on' : ''}`} onClick={() => setFilter(filter === t ? '' : t)}>{t}</button>)}
            </div>
          )}
          {selecting && (
            <div className="card flex flex-wrap items-center gap-2 !p-3 text-sm">
              <span>{picked.length} selected</span><span className="flex-1" />
              <button className="btn" disabled={picked.length !== 2} onClick={() => {
                const [a, b] = picked.map((pid) => photos.find((p) => p.id === pid)!).sort((x, y) => x.takenAt - y.takenAt)
                setComparing([a, b])
              }}>Before / after</button>
              <button className="btn btn-danger" disabled={!picked.length} onClick={async () => {
                if (!window.confirm(`Delete ${picked.length} photo(s)?`)) return
                for (const pid of picked) await remove('photos', pid)
                setPicked([]); setSelecting(false); reload()
              }}><Trash2 size={16} /></button>
            </div>
          )}
          {shown.length === 0 ? (
            <Empty icon={<Images size={36} />} title="No photos yet" hint="Capture with the camera or add existing photos." />
          ) : (
            <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 lg:grid-cols-6">
              {shown.map((p) => (
                <button key={p.id} className="relative aspect-square overflow-hidden rounded-lg bg-slate-200 dark:bg-slate-800" onClick={() => (selecting ? setPicked((x) => (x.includes(p.id) ? x.filter((i) => i !== p.id) : [...x, p.id])) : setViewing(p.id))} aria-label={p.caption || 'Open photo'}>
                  <Img blob={p.thumb} className="h-full w-full object-cover" />
                  {p.tags[0] && <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 text-[10px] font-bold text-white">{p.tags[0]}</span>}
                  {p.annotations.length > 0 && <Pencil size={12} className="absolute right-1 top-1 text-white drop-shadow" />}
                  {picked.includes(p.id) && <span className="absolute inset-0 grid place-items-center bg-blue-600/60 text-2xl font-bold text-white">{picked.indexOf(p.id) + 1}</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'checklists' && <Checklists projectId={id} lists={checklists} reload={reload} />}
      {tab === 'estimate' && <EstimateTab projectId={id} estimates={estimates} priceBook={settings.priceBook} taxRate={settings.taxRate} reload={reload} />}

      {tab === 'activity' && (
        <div className="space-y-3">
          <div className="card space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-bold">Progress recap</h3><span className="flex-1" />
              <button className="btn" onClick={() => doRecap(false)}><Sparkles size={16} /> Summarize</button>
              {settings.ai.endpoint && <button className="btn" onClick={() => doRecap(true)}><Sparkles size={16} /> Polish with AI</button>}
            </div>
            {recap ? <p className="whitespace-pre-wrap text-sm">{recap}</p> : <p className="text-sm text-slate-500">Generate a plain-language summary for your customer. It’s included in the report.</p>}
          </div>
          {comments.map((c) => (
            <div key={c.id} className="card !p-3">
              <p className="text-xs text-slate-500"><b>{c.author}</b> · {new Date(c.createdAt).toLocaleString()}</p>
              <p className="whitespace-pre-wrap text-sm">{c.text}</p>
            </div>
          ))}
          <form className="flex gap-2" onSubmit={async (e) => {
            e.preventDefault()
            const form = e.currentTarget
            const text = new FormData(form).get('text')?.toString().trim()
            if (!text) return
            await put('comments', { id: uid(), projectId: id, author: settings.author, text, createdAt: Date.now() })
            form.reset(); reload()
          }}>
            <input name="text" className="input" placeholder="Add a comment…" aria-label="Comment" />
            <button className="btn btn-primary" type="submit">Post</button>
          </form>
          <div className="flex flex-wrap gap-2 pt-4">
            <button className="btn" onClick={() => makeReport('download')}>Download report (.html)</button>
            <button className="btn btn-danger" onClick={async () => { if (window.confirm('Delete this project and all its photos?')) { await deleteProject(id); nav('/') } }}><Trash2 size={16} /> Delete project</button>
          </div>
        </div>
      )}

      {viewIdx >= 0 && (
        <PhotoViewer
          photo={shown[viewIdx]} index={viewIdx} total={shown.length} isCover={project.coverPhotoId === shown[viewIdx].id}
          onClose={() => setViewing(null)}
          onNav={(d) => setViewing(shown[viewIdx + d]?.id ?? null)}
          onUpdate={updatePhoto}
          onDelete={async (p) => { await remove('photos', p.id); setViewing(null); reload() }}
          onCover={async (p) => { await saveProject({ ...project, coverPhotoId: p.id }); reload() }}
        />
      )}
      {comparing && <Modal title="Before / after" onClose={() => setComparing(null)} wide><Compare before={comparing[0].blob} after={comparing[1].blob} /></Modal>}
      {editing && <Modal title="Edit project" onClose={() => setEditing(false)}><ProjectForm initial={project} onCancel={() => setEditing(false)} onSave={async (p) => { await saveProject(p); setEditing(false); reload() }} /></Modal>}
    </div>
  )
}
