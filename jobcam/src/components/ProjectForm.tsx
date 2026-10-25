import { useState } from 'react'
import { Field } from './ui'
import type { Project, ProjectStatus } from '../lib/types'

export default function ProjectForm({ initial, onSave, onCancel }: { initial: Project; onSave: (p: Project) => void; onCancel: () => void }) {
  const [p, setP] = useState(initial)
  const set = <K extends keyof Project>(k: K, v: Project[K]) => setP((x) => ({ ...x, [k]: v }))
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault()
        if (!p.name.trim() && !p.address.trim()) return
        onSave({ ...p, name: p.name.trim() || p.address.trim() })
      }}
    >
      <Field label="Project name"><input className="input" autoFocus value={p.name} onChange={(e) => set('name', e.target.value)} placeholder="Johnson – sprinkler repair" /></Field>
      <Field label="Address"><input className="input" value={p.address} onChange={(e) => set('address', e.target.value)} placeholder="4821 Oak Ridge Dr" /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Customer"><input className="input" value={p.customer} onChange={(e) => set('customer', e.target.value)} /></Field>
        <Field label="Phone"><input className="input" type="tel" value={p.phone} onChange={(e) => set('phone', e.target.value)} /></Field>
      </div>
      <Field label="Email"><input className="input" type="email" value={p.email} onChange={(e) => set('email', e.target.value)} /></Field>
      <Field label="Status">
        <select className="input" value={p.status} onChange={(e) => set('status', e.target.value as ProjectStatus)}>
          <option value="active">Active</option><option value="completed">Completed</option><option value="archived">Archived</option>
        </select>
      </Field>
      <Field label="Notes"><textarea className="input min-h-20" value={p.notes} onChange={(e) => set('notes', e.target.value)} /></Field>
      <div className="flex justify-end gap-2 pt-1">
        <button type="button" className="btn" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn btn-primary">Save</button>
      </div>
    </form>
  )
}
