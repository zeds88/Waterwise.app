import { FolderOpen, Plus, Search } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import ProjectForm from '../components/ProjectForm'
import { Empty, Img, Modal } from '../components/ui'
import { getAll, listProjects, newProject, saveProject, get } from '../lib/db'
import { useLoad } from '../lib/hooks'
import type { Photo, Project, ProjectStatus } from '../lib/types'

export default function Projects() {
  const nav = useNavigate()
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<ProjectStatus | 'all'>('active')
  const [creating, setCreating] = useState(false)
  const [data] = useLoad(async () => {
    const projects = await listProjects()
    const photos = await getAll<Photo>('photos')
    const counts = new Map<string, number>()
    photos.forEach((p) => counts.set(p.projectId, (counts.get(p.projectId) ?? 0) + 1))
    // full-text-ish search across captions and tags too
    const hay = new Map<string, string>()
    photos.forEach((p) => hay.set(p.projectId, `${hay.get(p.projectId) ?? ''} ${p.caption} ${p.tags.join(' ')}`))
    const covers = new Map<string, Photo>()
    for (const p of projects) if (p.coverPhotoId) { const c = await get<Photo>('photos', p.coverPhotoId); if (c) covers.set(p.id, c) }
    return { projects, counts, hay, covers }
  }, [])

  const needle = q.trim().toLowerCase()
  const shown = (data?.projects ?? []).filter(
    (p) =>
      (status === 'all' || p.status === status) &&
      (!needle || `${p.name} ${p.address} ${p.customer} ${p.notes} ${data?.hay.get(p.id) ?? ''}`.toLowerCase().includes(needle)),
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold">Projects</h1>
        <button className="btn btn-primary" onClick={() => setCreating(true)}><Plus size={18} /> New</button>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-3.5 text-slate-400" />
          <input className="input !pl-9" placeholder="Search projects, addresses, photo notes, tags…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search" />
        </div>
        <div className="flex gap-2">
          {(['active', 'completed', 'archived', 'all'] as const).map((s) => (
            <button key={s} className={`chip capitalize ${status === s ? 'chip-on' : ''}`} onClick={() => setStatus(s)}>{s}</button>
          ))}
        </div>
      </div>

      {data && shown.length === 0 && (
        <Empty icon={<FolderOpen size={36} />} title={data.projects.length ? 'No matching projects' : 'No projects yet'} hint="Create a project, then capture photos, annotate them and generate a shareable report.">
          <button className="btn btn-primary mt-2" onClick={() => setCreating(true)}><Plus size={18} /> Create your first project</button>
        </Empty>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((p) => (
          <Link key={p.id} to={`/p/${p.id}`} className="card flex gap-3 !p-3 transition hover:shadow-md">
            <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-slate-200 dark:bg-slate-800">
              {data?.covers.get(p.id) && <Img blob={data.covers.get(p.id)!.thumb} className="h-full w-full object-cover" />}
            </div>
            <div className="min-w-0">
              <p className="truncate font-bold">{p.name}</p>
              <p className="truncate text-sm text-slate-500">{p.address || p.customer || '—'}</p>
              <p className="mt-1 text-xs text-slate-500">{data?.counts.get(p.id) ?? 0} photos · {new Date(p.updatedAt).toLocaleDateString()}</p>
            </div>
          </Link>
        ))}
      </div>

      {creating && (
        <Modal title="New project" onClose={() => setCreating(false)}>
          <ProjectForm
            initial={newProject()}
            onCancel={() => setCreating(false)}
            onSave={async (p: Project) => { await saveProject(p); nav(`/p/${p.id}`) }}
          />
        </Modal>
      )}
    </div>
  )
}
