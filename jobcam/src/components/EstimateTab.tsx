import { Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { put, remove } from '../lib/db'
import { money, totals } from '../lib/estimate'
import { uid } from '../lib/id'
import type { Estimate, PriceBookEntry } from '../lib/types'

export default function EstimateTab({ projectId, estimates: saved, priceBook, taxRate, reload }: { projectId: string; estimates: Estimate[]; priceBook: PriceBookEntry[]; taxRate: number; reload: () => void }) {
  const [estimates, setEstimates] = useState(saved)
  useEffect(() => setEstimates(saved), [saved])
  const save = (e: Estimate) => { setEstimates((l) => (l.some((x) => x.id === e.id) ? l.map((x) => (x.id === e.id ? e : x)) : [...l, e])); void put('estimates', e) }
  const create = async () => { await put('estimates', { id: uid(), projectId, title: 'Estimate', items: [], taxRate, createdAt: Date.now() }); reload() }

  return (
    <div className="space-y-4">
      <button className="btn btn-primary" onClick={create}><Plus size={18} /> New estimate</button>
      {estimates.map((e) => {
        const t = totals(e)
        return (
          <div key={e.id} className="card space-y-3">
            <div className="flex items-center gap-2">
              <input className="input font-bold" value={e.title} onChange={(ev) => save({ ...e, title: ev.target.value })} aria-label="Estimate title" />
              <button className="btn btn-ghost !p-2" aria-label="Delete estimate" onClick={async () => { await remove('estimates', e.id); reload() }}><Trash2 size={16} /></button>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="h-4 w-4 accent-brand" checked={e.proposal !== false} onChange={(ev) => save({ ...e, proposal: ev.target.checked })} aria-label={`Include "${e.title}" in proposal`} />
              <span>Include in customer proposal &amp; report{e.proposal === false && <b className="ml-2 rounded bg-amber-200 px-1.5 text-xs text-amber-900">DRAFT</b>}</span>
            </label>
            {e.items.map((i) => (
              <div key={i.id} className="grid grid-cols-[1fr_4.5rem_5.5rem_auto] items-center gap-2">
                <input className="input" value={i.description} onChange={(ev) => save({ ...e, items: e.items.map((x) => (x.id === i.id ? { ...x, description: ev.target.value } : x)) })} aria-label="Description" />
                <input className="input" type="number" min={0} step="any" value={i.qty} onChange={(ev) => save({ ...e, items: e.items.map((x) => (x.id === i.id ? { ...x, qty: +ev.target.value } : x)) })} aria-label="Quantity" />
                <input className="input" type="number" min={0} step="any" value={i.unitPrice} onChange={(ev) => save({ ...e, items: e.items.map((x) => (x.id === i.id ? { ...x, unitPrice: +ev.target.value } : x)) })} aria-label="Unit price" />
                <button className="btn btn-ghost !p-2" aria-label="Remove line" onClick={() => save({ ...e, items: e.items.filter((x) => x.id !== i.id) })}><Trash2 size={16} /></button>
              </div>
            ))}
            <div className="flex flex-wrap gap-2">
              <select className="input !w-auto" value="" aria-label="Add from price book" onChange={(ev) => {
                const entry = priceBook[+ev.target.value]
                if (entry) save({ ...e, items: [...e.items, { id: uid(), description: entry.description, qty: 1, unit: entry.unit, unitPrice: entry.price }] })
              }}>
                <option value="">+ Add from price book…</option>
                {priceBook.map((p, n) => <option key={n} value={n}>{p.description} ({money(p.price)}/{p.unit})</option>)}
              </select>
              <button className="btn" onClick={() => save({ ...e, items: [...e.items, { id: uid(), description: 'Custom item', qty: 1, unit: 'ea', unitPrice: 0 }] })}>+ Custom line</button>
            </div>
            <div className="ml-auto w-full max-w-xs space-y-1 text-sm">
              <div className="flex justify-between"><span>Subtotal</span><span>{money(t.subtotal)}</span></div>
              <div className="flex items-center justify-between gap-2"><span>Tax %</span><input className="input !w-20 !py-1" type="number" min={0} step="any" value={e.taxRate} onChange={(ev) => save({ ...e, taxRate: +ev.target.value })} aria-label="Tax rate" /><span>{money(t.tax)}</span></div>
              <div className="flex justify-between text-base font-extrabold"><span>Total</span><span>{money(t.total)}</span></div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
