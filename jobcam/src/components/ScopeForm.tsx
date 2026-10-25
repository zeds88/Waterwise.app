import { Fragment, useMemo, useState } from 'react'
import { BLANK, contextValues, defaultValues, renderTemplate, templateFields } from '../lib/scope'
import type { ScopeField, ScopeTemplate } from '../lib/types'
import { Field, Modal } from './ui'

/** Highlights unfilled blanks so they are obvious in the preview. */
export function Hl({ text }: { text: string }) {
  const parts = text.split(BLANK)
  return <>{parts.map((p, i) => <Fragment key={i}>{p}{i < parts.length - 1 && <mark className="rounded bg-amber-200 px-1 text-amber-900">{BLANK}</mark>}</Fragment>)}</>
}

export function ScopePreview({ template, values }: { template: ScopeTemplate; values: Record<string, string> }) {
  const r = renderTemplate(template, values)
  const List = ({ title, items, ordered }: { title: string; items: string[]; ordered?: boolean }) => {
    if (!items.length) return null
    const Tag = ordered ? 'ol' : 'ul'
    return <div><h4 className="label !mb-0.5 mt-3">{title}</h4><Tag className={`${ordered ? 'list-decimal' : 'list-disc'} list-inside space-y-0.5 text-sm`}>{items.map((x, i) => <li key={i}><Hl text={x} /></li>)}</Tag></div>
  }
  return (
    <div className="text-sm" aria-label="Preview">
      <h3 className="text-base font-bold">{r.title}</h3>
      <p className="mt-1"><Hl text={r.summary} /></p>
      <List title="Scope of work" items={r.scope} ordered />
      <List title="Included" items={r.included} />
      <List title="Not included" items={r.excluded} />
      <List title="Assumptions" items={r.assumptions} />
      {r.warranty && <div><h4 className="label !mb-0.5 mt-3">Warranty</h4><p><Hl text={r.warranty} /></p></div>}
    </div>
  )
}

function Input({ f, value, onChange }: { f: ScopeField; value: string; onChange: (v: string) => void }) {
  const common = { 'aria-label': f.label, className: 'input' }
  switch (f.type) {
    case 'select':
      return (
        <select {...common} value={value} onChange={(e) => onChange(e.target.value)}>
          <option value="">— choose —</option>
          {f.options!.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      )
    case 'longtext': return <textarea {...common} className="input min-h-20" value={value} onChange={(e) => onChange(e.target.value)} />
    case 'number': return <input {...common} type="number" inputMode="decimal" min={0} step="any" value={value} onChange={(e) => onChange(e.target.value)} />
    case 'money': return <input {...common} type="number" inputMode="decimal" min={0} step="0.01" placeholder="0.00" value={value} onChange={(e) => onChange(e.target.value)} />
    case 'date': return <input {...common} type="date" value={value} onChange={(e) => onChange(e.target.value)} />
    default: return <input {...common} type="text" value={value} onChange={(e) => onChange(e.target.value)} />
  }
}

export default function ScopeForm({ template, initial, ctx, onSave, onCancel }: {
  template: ScopeTemplate
  initial?: Record<string, string>
  ctx: Parameters<typeof contextValues>[0]
  onSave: (values: Record<string, string>) => void
  onCancel: () => void
}) {
  const fields = useMemo(() => templateFields(template), [template])
  const [values, setValues] = useState<Record<string, string>>(() => ({ ...defaultValues(template, contextValues(ctx)), ...initial }))
  const blanks = renderTemplate(template, values).blanks.length
  return (
    <Modal title={template.title} onClose={onCancel} wide>
      <div className="grid gap-5 md:grid-cols-2">
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); onSave(values) }}>
          <p className="text-sm text-slate-500">Fill in the blanks. Anything left empty prints as a blank line to complete by hand.</p>
          {fields.map((f) => (
            <Field key={f.key} label={f.label}><Input f={f} value={values[f.key] ?? ''} onChange={(v) => setValues((x) => ({ ...x, [f.key]: v }))} /></Field>
          ))}
          <div className="flex items-center gap-2 pt-2">
            <span className="text-xs text-slate-500">{blanks ? `${blanks} blank${blanks === 1 ? '' : 's'} left` : 'All filled in'}</span>
            <span className="flex-1" />
            <button type="button" className="btn" onClick={onCancel}>Cancel</button>
            <button type="submit" className="btn btn-primary">Save to project</button>
          </div>
        </form>
        <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800 md:max-h-[65vh] md:overflow-y-auto">
          <ScopePreview template={template} values={values} />
        </div>
      </div>
    </Modal>
  )
}
