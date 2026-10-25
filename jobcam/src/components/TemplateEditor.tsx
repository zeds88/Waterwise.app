import { useMemo, useState } from 'react'
import { buildCustomTemplate, templateFields, templateToInput, TemplateError } from '../lib/scope'
import type { ScopeTemplate } from '../lib/types'
import { Field, Modal } from './ui'

const HELP = 'Blanks: {{qty|Number of heads|number}}  {{type|Type|select(spray;rotor)|spray}}  {{notes|Notes|longtext}}. Types: text, longtext, number, money, date, select(a;b;c). {{customer}}, {{address}}, {{company}}, {{phone}}, {{project}} and {{date}} fill in automatically.'

export default function TemplateEditor({ initial, trades, onSave, onCancel, onDelete }: {
  initial?: ScopeTemplate
  trades: readonly string[]
  onSave: (t: ScopeTemplate) => void
  onCancel: () => void
  onDelete?: () => void
}) {
  const [f, setF] = useState(() => initial ? templateToInput(initial) : { id: undefined as string | undefined, title: '', trade: '', summary: 'Work at {{address|Service address}} for {{customer|Customer}}.', scope: '', included: '', excluded: '', assumptions: '', warranty: '{{warranty|Workmanship warranty|select(30 days;90 days;1 year;2 years)|1 year}} on labor from completion.' })
  const set = (k: keyof typeof f, v: string) => setF((x) => ({ ...x, [k]: v }))
  const result = useMemo(() => { try { return { t: buildCustomTemplate(f), err: '' } } catch (e) { return { t: null, err: e instanceof TemplateError ? e.message : (e as Error).message } } }, [f])
  const blanks = result.t ? templateFields(result.t) : []
  return (
    <Modal title={initial?.custom ? 'Edit my template' : 'New template'} onClose={onCancel} wide>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); if (result.t) onSave(result.t) }}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Title"><input className="input" value={f.title} onChange={(e) => set('title', e.target.value)} /></Field>
          <Field label="Category">
            <input className="input" list="trades" value={f.trade} onChange={(e) => set('trade', e.target.value)} placeholder="My templates" />
            <datalist id="trades">{trades.map((t) => <option key={t} value={t} />)}</datalist>
          </Field>
        </div>
        <Field label="Service description (customer-facing summary)"><textarea className="input min-h-16" value={f.summary} onChange={(e) => set('summary', e.target.value)} /></Field>
        <Field label="Scope of work — one step per line"><textarea className="input min-h-32 font-mono text-xs" value={f.scope} onChange={(e) => set('scope', e.target.value)} placeholder={'Remove {{qty|Quantity|number}} old units\nInstall new units'} /></Field>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Included"><textarea className="input min-h-20 font-mono text-xs" value={f.included} onChange={(e) => set('included', e.target.value)} /></Field>
          <Field label="Not included"><textarea className="input min-h-20 font-mono text-xs" value={f.excluded} onChange={(e) => set('excluded', e.target.value)} /></Field>
          <Field label="Assumptions"><textarea className="input min-h-20 font-mono text-xs" value={f.assumptions} onChange={(e) => set('assumptions', e.target.value)} /></Field>
        </div>
        <Field label="Warranty"><textarea className="input min-h-16" value={f.warranty} onChange={(e) => set('warranty', e.target.value)} /></Field>
        <p className="text-xs text-slate-500">{HELP}</p>
        {result.err ? <p role="alert" className="text-sm text-red-600">{result.err}</p> : <p className="text-xs text-slate-500">{blanks.length} blank{blanks.length === 1 ? '' : 's'}: {blanks.map((b) => b.label).join(', ') || 'none'}</p>}
        <div className="flex gap-2 pt-1">
          {onDelete && <button type="button" className="btn btn-danger" onClick={onDelete}>Delete</button>}
          <span className="flex-1" />
          <button type="button" className="btn" onClick={onCancel}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={!result.t}>Save template</button>
        </div>
      </form>
    </Modal>
  )
}
