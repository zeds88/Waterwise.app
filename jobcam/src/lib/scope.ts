import type { FieldType, ScopeField, ScopeTemplate } from './types'

/**
 * Fill-in-the-blank engine. Template text contains blanks like
 *   {{qty|Number of heads|number}}   {{type|Head type|select(spray;rotor;drip)|spray}}   {{customer}}
 * i.e. {{key|Label|type|default}}. The first mention of a key defines it; later {{key}} reuse it.
 * Select options are separated by ";" so values like "3/4 in" work. Unfilled blanks print as ______.
 */

export const BLANK = '______'
const PLACEHOLDER = /\{\{([^{}]*)\}\}/g
const KEY = /^[a-zA-Z_][a-zA-Z0-9_]*$/
const TYPES: FieldType[] = ['text', 'longtext', 'number', 'money', 'date', 'select']

export class TemplateError extends Error {}

export function parseSpec(inner: string): ScopeField {
  const [rawKey, label, rawType, ...rest] = inner.split('|').map((s) => s.trim())
  if (!KEY.test(rawKey ?? '')) throw new TemplateError(`Invalid blank name "${rawKey}". Use letters, numbers and underscores.`)
  let type: FieldType = 'text'
  let options: string[] | undefined
  if (rawType) {
    const sel = /^select\((.*)\)$/i.exec(rawType)
    if (sel) {
      type = 'select'
      options = sel[1].split(';').map((o) => o.trim()).filter(Boolean)
      if (!options.length) throw new TemplateError(`"${rawKey}" has an empty select list.`)
    } else if ((TYPES as string[]).includes(rawType.toLowerCase())) type = rawType.toLowerCase() as FieldType
    else throw new TemplateError(`Unknown type "${rawType}" for "${rawKey}". Use text, longtext, number, money, date or select(a;b;c).`)
  }
  const def = rest.join('|').trim()
  return { key: rawKey, label: label || rawKey.replace(/_/g, ' '), type, ...(options ? { options } : {}), ...(def ? { default: def } : {}) }
}

const textsOf = (t: ScopeTemplate): string[] => [t.summary, ...t.scope, ...t.included, ...t.excluded, ...t.assumptions, t.warranty]

/** Every distinct blank in a template, in reading order. The first definition of a key wins. */
export function templateFields(t: ScopeTemplate): ScopeField[] {
  const seen = new Map<string, ScopeField>()
  const defined = new Set<string>() // keys that have a full {{key|Label|…}} definition
  for (const text of textsOf(t)) {
    for (const m of text.matchAll(PLACEHOLDER)) {
      const f = parseSpec(m[1])
      const full = m[1].includes('|')
      if (!seen.has(f.key) || (full && !defined.has(f.key))) seen.set(f.key, f)
      if (full) defined.add(f.key)
    }
  }
  return [...seen.values()]
}

/** Auto-filled from the project and branding; the user can still edit them. */
export function contextValues(ctx: { customer?: string; address?: string; company?: string; phone?: string; project?: string; date?: Date }): Record<string, string> {
  const d = ctx.date ?? new Date()
  const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  return Object.fromEntries(
    Object.entries({ customer: ctx.customer, address: ctx.address, company: ctx.company, phone: ctx.phone, project: ctx.project, date: iso }).filter(([, v]) => v),
  ) as Record<string, string>
}

export function defaultValues(t: ScopeTemplate, ctx: Record<string, string> = {}): Record<string, string> {
  const out: Record<string, string> = {}
  for (const f of templateFields(t)) {
    const v = ctx[f.key] ?? f.default ?? ''
    out[f.key] = v
  }
  return out
}

export function formatValue(f: ScopeField, raw: string): string {
  const v = raw.trim()
  if (!v) return ''
  if (f.type === 'money') {
    const n = Number(v.replace(/[$,]/g, ''))
    return Number.isFinite(n) ? n.toLocaleString('en-US', { style: 'currency', currency: 'USD' }) : v
  }
  if (f.type === 'date') {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v)
    return m ? new Date(+m[1], +m[2] - 1, +m[3]).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : v
  }
  return v
}

export interface Segment { text: string; blank?: boolean; key?: string }

/** Split text into literal and blank segments (blank = unfilled), for highlighting in the preview. */
export function segments(text: string, fields: Map<string, ScopeField>, values: Record<string, string>): Segment[] {
  const out: Segment[] = []
  let last = 0
  for (const m of text.matchAll(PLACEHOLDER)) {
    if (m.index! > last) out.push({ text: text.slice(last, m.index) })
    const key = m[1].split('|')[0].trim()
    const f = fields.get(key) ?? parseSpec(m[1])
    const v = formatValue(f, values[key] ?? '')
    out.push(v ? { text: v, key } : { text: BLANK, blank: true, key })
    last = m.index! + m[0].length
  }
  if (last < text.length) out.push({ text: text.slice(last) })
  return out
}

export const fillText = (text: string, fields: Map<string, ScopeField>, values: Record<string, string>) =>
  segments(text, fields, values).map((s) => s.text).join('')

export interface RenderedScope {
  title: string
  trade: string
  summary: string
  scope: string[]
  included: string[]
  excluded: string[]
  assumptions: string[]
  warranty: string
  blanks: string[] // labels of unfilled blanks
}

export function renderTemplate(t: ScopeTemplate, values: Record<string, string>): RenderedScope {
  const fields = templateFields(t)
  const map = new Map(fields.map((f) => [f.key, f]))
  const fill = (s: string) => fillText(s, map, values)
  return {
    title: t.title, trade: t.trade, summary: fill(t.summary), scope: t.scope.map(fill), included: t.included.map(fill),
    excluded: t.excluded.map(fill), assumptions: t.assumptions.map(fill), warranty: fill(t.warranty),
    blanks: fields.filter((f) => !formatValue(f, values[f.key] ?? '')).map((f) => f.label),
  }
}

/** Plain text for copy/paste into email or an invoice. */
export function scopeToText(r: RenderedScope): string {
  const list = (h: string, a: string[], num = false) => (a.length ? `\n${h}\n${a.map((x, i) => `${num ? `${i + 1}.` : '•'} ${x}`).join('\n')}\n` : '')
  return [`${r.title}`, r.summary, list('SCOPE OF WORK', r.scope, true), list('INCLUDED', r.included), list('NOT INCLUDED', r.excluded), list('ASSUMPTIONS', r.assumptions), r.warranty ? `\nWARRANTY\n${r.warranty}` : ''].join('\n').replace(/\n{3,}/g, '\n\n').trim()
}

/** Build a custom template from the editor's plain textareas (one line per bullet). Throws TemplateError on bad blanks. */
export function buildCustomTemplate(input: { id?: string; title: string; trade: string; summary: string; scope: string; included: string; excluded: string; assumptions: string; warranty: string }): ScopeTemplate {
  const lines = (s: string) => s.split('\n').map((l) => l.trim().replace(/^([-•*]|\d+[.)])\s+/, '')).filter(Boolean)
  const t: ScopeTemplate = {
    id: input.id ?? `custom-${Date.now().toString(36)}`, custom: true, trade: input.trade.trim() || 'My templates', title: input.title.trim(),
    summary: input.summary.trim(), scope: lines(input.scope), included: lines(input.included), excluded: lines(input.excluded), assumptions: lines(input.assumptions), warranty: input.warranty.trim(),
  }
  if (!t.title) throw new TemplateError('Give the template a title.')
  if (!t.scope.length) throw new TemplateError('Add at least one scope-of-work line.')
  // fully parse now so mistakes surface while editing, not when filling in a job
  const open = [...textsOf(t).join('\n').matchAll(/\{\{|\}\}/g)].length % 2
  if (open) throw new TemplateError('A {{ or }} is unmatched.')
  templateFields(t)
  return t
}

/** Inverse of buildCustomTemplate, for the editor. */
export const templateToInput = (t: ScopeTemplate) => ({ id: t.custom ? t.id : undefined, title: t.title, trade: t.trade, summary: t.summary, scope: t.scope.join('\n'), included: t.included.join('\n'), excluded: t.excluded.join('\n'), assumptions: t.assumptions.join('\n'), warranty: t.warranty })
