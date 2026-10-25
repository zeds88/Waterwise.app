import type { PriceBookEntry } from './types'

/**
 * Price-book import/export. CSV columns: keywords,description,unit,price
 * (several keywords separated by "|"). JSON arrays of {keywords,description,unit,price} also work.
 */

export class PriceBookError extends Error {}

/** Minimal RFC-4180 CSV parser (quotes, escaped quotes, commas/newlines inside quotes). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = [], cell = '', q = false
  const t = text.replace(/^﻿/, '')
  for (let i = 0; i < t.length; i++) {
    const c = t[i]
    if (q) {
      if (c === '"') { if (t[i + 1] === '"') { cell += '"'; i++ } else q = false } else cell += c
    } else if (c === '"' && cell === '') q = true // a quote only opens a quoted cell at its start, so 1" or 3/4" inside a cell stay literal
    else if (c === ',') { row.push(cell); cell = '' }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && t[i + 1] === '\n') i++
      row.push(cell); cell = ''
      if (row.some((x) => x.trim())) rows.push(row)
      row = []
    } else cell += c
  }
  row.push(cell)
  if (row.some((x) => x.trim())) rows.push(row)
  return rows
}

const toPrice = (v: unknown): number => {
  const n = typeof v === 'number' ? v : Number(String(v ?? '').replace(/[$,\s]/g, ''))
  return n
}

function clean(raw: { keywords?: unknown; description?: unknown; unit?: unknown; price?: unknown }, where: string): PriceBookEntry {
  const description = String(raw.description ?? '').trim()
  if (!description) throw new PriceBookError(`${where}: missing description.`)
  const price = toPrice(raw.price)
  if (!Number.isFinite(price) || price < 0) throw new PriceBookError(`${where}: "${description}" needs a price like 85 or $85.00.`)
  const kwSrc = Array.isArray(raw.keywords) ? raw.keywords.map(String) : String(raw.keywords ?? '').split('|')
  const keywords = kwSrc.map((k) => k.trim()).filter(Boolean)
  return { keywords: keywords.length ? keywords : [description.toLowerCase()], description, unit: String(raw.unit ?? '').trim() || 'ea', price: Math.round(price * 100) / 100 }
}

export function parsePriceBook(text: string): PriceBookEntry[] {
  const src = text.trim()
  if (!src) throw new PriceBookError('Nothing to import.')
  if (src.startsWith('[')) {
    let arr: unknown
    try { arr = JSON.parse(src) } catch { throw new PriceBookError('That looks like JSON but could not be read.') }
    if (!Array.isArray(arr)) throw new PriceBookError('Expected a JSON array of items.')
    return arr.map((r, i) => clean(r as Record<string, unknown>, `Item ${i + 1}`))
  }
  const rows = parseCsv(src)
  const head = rows[0].map((h) => h.trim().toLowerCase())
  const idx = (n: string) => head.indexOf(n)
  const hasHeader = idx('description') >= 0 && idx('price') >= 0
  if (!hasHeader) throw new PriceBookError('First line must be the header: keywords,description,unit,price')
  const out = rows.slice(1).map((r, i) => clean({ keywords: r[idx('keywords')], description: r[idx('description')], unit: r[idx('unit')], price: r[idx('price')] }, `Row ${i + 2}`))
  if (!out.length) throw new PriceBookError('No items found below the header line.')
  return out
}

const q = (v: string) => (/[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)
export const priceBookToCsv = (book: PriceBookEntry[]) =>
  ['keywords,description,unit,price', ...book.map((b) => [q(b.keywords.join('|')), q(b.description), q(b.unit), b.price.toFixed(2)].join(','))].join('\n') + '\n'

/** Add to an existing book; entries with the same description are updated instead of duplicated. */
export function mergePriceBooks(existing: PriceBookEntry[], incoming: PriceBookEntry[]): PriceBookEntry[] {
  const byName = new Map(incoming.map((e) => [e.description.toLowerCase(), e]))
  const kept = existing.map((e) => byName.get(e.description.toLowerCase()) ?? e)
  const have = new Set(existing.map((e) => e.description.toLowerCase()))
  return [...kept, ...incoming.filter((e) => !have.has(e.description.toLowerCase()))]
}
