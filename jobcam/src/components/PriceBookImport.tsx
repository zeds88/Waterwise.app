import { useMemo, useState } from 'react'
import { money } from '../lib/estimate'
import { mergePriceBooks, parsePriceBook, priceBookToCsv } from '../lib/pricebook'
import type { PriceBookEntry } from '../lib/types'
import { Modal } from './ui'

export function downloadCsv(book: PriceBookEntry[]) {
  const url = URL.createObjectURL(new Blob([priceBookToCsv(book)], { type: 'text/csv' }))
  const a = document.createElement('a')
  a.href = url
  a.download = 'jobcam-price-book.csv'
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

export default function PriceBookImport({ current, onApply, onCancel }: { current: PriceBookEntry[]; onApply: (book: PriceBookEntry[]) => void; onCancel: () => void }) {
  const [text, setText] = useState('')
  const [mode, setMode] = useState<'replace' | 'add'>('replace')
  const parsed = useMemo(() => {
    if (!text.trim()) return { items: null as PriceBookEntry[] | null, error: '' }
    try { return { items: parsePriceBook(text), error: '' } } catch (e) { return { items: null, error: (e as Error).message } }
  }, [text])
  return (
    <Modal title="Import price book" onClose={onCancel} wide>
      <div className="space-y-3">
        <p className="text-sm text-slate-500">
          Paste your price list or choose a file. Columns: <code>keywords,description,unit,price</code> — several keywords separated by <code>|</code>. Keywords are the words
          you say on a walkthrough (“rotor head”, “backflow”); the most specific match wins.
        </p>
        <label className="btn cursor-pointer w-fit">Choose a .csv or .json file
          <input type="file" accept=".csv,.json,text/csv,application/json,text/plain" className="sr-only" aria-label="Price book file" onChange={async (e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) setText(await f.text()) }} />
        </label>
        <textarea className="input min-h-40 font-mono text-xs" aria-label="Price list" placeholder={'keywords,description,unit,price\nspray head|pop-up,Replace spray head,head,24'} value={text} onChange={(e) => setText(e.target.value)} />
        {parsed.error && <p role="alert" className="text-sm text-red-600">{parsed.error}</p>}
        {parsed.items && (
          <div>
            <p className="text-sm font-semibold">{parsed.items.length} item{parsed.items.length === 1 ? '' : 's'} ready</p>
            <ul className="max-h-40 space-y-0.5 overflow-y-auto text-sm" aria-label="Import preview">
              {parsed.items.map((i, n) => <li key={n} className="flex justify-between gap-3"><span className="truncate">{i.description}</span><span>{money(i.price)}/{i.unit}</span></li>)}
            </ul>
          </div>
        )}
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2"><input type="radio" name="mode" checked={mode === 'replace'} onChange={() => setMode('replace')} /> Replace my current price book ({current.length} items)</label>
          <label className="flex items-center gap-2"><input type="radio" name="mode" checked={mode === 'add'} onChange={() => setMode('add')} /> Add to it (same names are updated)</label>
        </div>
        <div className="flex justify-end gap-2">
          <button className="btn" onClick={onCancel}>Cancel</button>
          <button className="btn btn-primary" disabled={!parsed.items} onClick={() => onApply(mode === 'replace' ? parsed.items! : mergePriceBooks(current, parsed.items!))}>Import</button>
        </div>
      </div>
    </Modal>
  )
}
