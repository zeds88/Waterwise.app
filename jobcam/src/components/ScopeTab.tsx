import { ClipboardList, Copy, FileText, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { listEstimates, put, remove, saveSettings } from '../lib/db'
import { uid } from '../lib/id'
import { openPending, showHtml } from '../lib/open'
import { buildProposalHtml } from '../lib/report'
import { renderTemplate, scopeToText } from '../lib/scope'
import { SCOPE_LIBRARY, TRADES } from '../lib/scopeLibrary'
import type { Project, ScopeDoc, ScopeTemplate, Settings } from '../lib/types'
import ScopeForm, { ScopePreview } from './ScopeForm'
import TemplateEditor from './TemplateEditor'
import { Empty, Modal } from './ui'

export default function ScopeTab({ project, docs, settings, reload }: { project: Project; docs: ScopeDoc[]; settings: Settings; reload: () => void }) {
  const [picking, setPicking] = useState(false)
  const [q, setQ] = useState('')
  const [trade, setTrade] = useState('All')
  const [filling, setFilling] = useState<{ template: ScopeTemplate; doc?: ScopeDoc } | null>(null)
  const [editing, setEditing] = useState<ScopeTemplate | 'new' | null>(null)
  const [open, setOpen] = useState<string | null>(null)

  const ctx = { customer: project.customer, address: project.address, company: settings.companyName, phone: settings.branding.phone || project.phone, project: project.name }
  const all = useMemo(() => [...settings.customTemplates, ...SCOPE_LIBRARY], [settings.customTemplates])
  const trades = useMemo(() => ['All', ...(settings.customTemplates.length ? ['My templates'] : []), ...TRADES.filter((t) => all.some((x) => x.trade === t))], [all, settings.customTemplates.length])
  const needle = q.trim().toLowerCase()
  const shown = all.filter((t) => (trade === 'All' || (trade === 'My templates' ? t.custom : t.trade === trade)) && (!needle || `${t.title} ${t.trade} ${t.summary}`.toLowerCase().includes(needle)))

  const saveDoc = async (template: ScopeTemplate, values: Record<string, string>, existing?: ScopeDoc) => {
    await put('scopes', { id: existing?.id ?? uid(), projectId: project.id, title: template.title, template, values, createdAt: existing?.createdAt ?? Date.now() } satisfies ScopeDoc)
    setFilling(null); setPicking(false); reload()
  }
  const saveTemplate = async (t: ScopeTemplate) => {
    const list = settings.customTemplates.some((x) => x.id === t.id) ? settings.customTemplates.map((x) => (x.id === t.id ? t : x)) : [...settings.customTemplates, t]
    await saveSettings({ ...settings, customTemplates: list })
    setEditing(null); reload()
  }
  const proposal = async (which: ScopeDoc[]) => {
    const w = openPending() // must happen synchronously, before any await (popup blockers)
    const estimates = await listEstimates(project.id)
    showHtml(w, buildProposalHtml({ settings, project, estimates, scopes: which.map((d) => renderTemplate(d.template, d.values)) }), `${project.name.replace(/[^\w]+/g, '-')}-proposal.html`)
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <button className="btn btn-primary" onClick={() => setPicking(true)}><Plus size={18} /> New from template</button>
        {docs.length > 0 && <button className="btn" onClick={() => proposal(docs)}><FileText size={18} /> Proposal (print / PDF)</button>}
      </div>
      {docs.length === 0 && <Empty icon={<ClipboardList size={36} />} title="No scope of work yet" hint="Pick a service, fill in the blanks, and get a clean, branded scope of work to share with your customer." />}
      {docs.map((d) => {
        const r = renderTemplate(d.template, d.values)
        return (
          <div key={d.id} className="card space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <button className="min-w-0 flex-1 text-left" onClick={() => setOpen(open === d.id ? null : d.id)} aria-expanded={open === d.id}>
                <p className="truncate font-bold">{d.title}</p>
                <p className="text-xs text-slate-500">{d.template.trade} · {r.blanks.length ? `${r.blanks.length} blank${r.blanks.length === 1 ? '' : 's'} left` : 'complete'}</p>
              </button>
              <button className="btn !p-2" aria-label="Edit blanks" onClick={() => setFilling({ template: d.template, doc: d })}><Pencil size={16} /></button>
              <button className="btn !p-2" aria-label="Copy as text" onClick={async () => { await navigator.clipboard?.writeText(scopeToText(r)).catch(() => {}) }}><Copy size={16} /></button>
              <button className="btn !p-2" aria-label="Proposal for this scope" onClick={() => proposal([d])}><FileText size={16} /></button>
              <button className="btn btn-ghost !p-2" aria-label="Delete scope" onClick={async () => { if (window.confirm('Delete this scope of work?')) { await remove('scopes', d.id); reload() } }}><Trash2 size={16} /></button>
            </div>
            {open === d.id && <ScopePreview template={d.template} values={d.values} />}
          </div>
        )
      })}

      {picking && !filling && !editing && (
        <Modal title="Choose a service" onClose={() => setPicking(false)} wide>
          <div className="space-y-3">
            <div className="relative"><Search size={16} className="absolute left-3 top-3.5 text-slate-400" /><input className="input !pl-9" placeholder="Search services…" aria-label="Search templates" value={q} onChange={(e) => setQ(e.target.value)} /></div>
            <div className="no-scrollbar flex gap-2 overflow-x-auto">{trades.map((x) => <button key={x} className={`chip shrink-0 ${trade === x ? 'chip-on' : ''}`} onClick={() => setTrade(x)}>{x}</button>)}</div>
            <ul className="grid gap-2 sm:grid-cols-2">
              {shown.map((t) => (
                <li key={t.id} className="card !p-3">
                  <button className="block w-full text-left" onClick={() => setFilling({ template: t })}>
                    <p className="font-bold">{t.title}</p>
                    <p className="text-xs uppercase tracking-wide text-slate-500">{t.trade}</p>
                  </button>
                  <div className="mt-2 flex gap-2">
                    <button className="chip" onClick={() => setFilling({ template: t })}>Use</button>
                    <button className="chip" onClick={() => setEditing(t.custom ? t : { ...t, id: `custom-${Date.now().toString(36)}`, custom: true, trade: 'My templates', title: `${t.title} (my version)` })}>{t.custom ? 'Edit' : 'Customize'}</button>
                  </div>
                </li>
              ))}
            </ul>
            {shown.length === 0 && <p className="text-sm text-slate-500">No match. Write your own below.</p>}
            <button className="btn" onClick={() => setEditing('new')}><Plus size={16} /> Write my own template</button>
          </div>
        </Modal>
      )}
      {filling && <ScopeForm template={filling.template} initial={filling.doc?.values} ctx={ctx} onCancel={() => setFilling(null)} onSave={(v) => saveDoc(filling.template, v, filling.doc)} />}
      {editing && (
        <TemplateEditor
          initial={editing === 'new' ? undefined : editing} trades={TRADES} onCancel={() => setEditing(null)} onSave={saveTemplate}
          onDelete={editing !== 'new' && editing.custom && settings.customTemplates.some((x) => x.id === editing.id) ? async () => { await saveSettings({ ...settings, customTemplates: settings.customTemplates.filter((x) => x.id !== editing.id) }); setEditing(null); reload() } : undefined}
        />
      )}
    </div>
  )
}
