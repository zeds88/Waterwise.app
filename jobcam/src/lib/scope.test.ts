import { beforeEach, describe, expect, it } from 'vitest'
import { BLANK, buildCustomTemplate, contextValues, defaultValues, formatValue, parseSpec, renderTemplate, scopeToText, TemplateError, templateFields } from './scope'
import { SCOPE_LIBRARY, TRADES } from './scopeLibrary'
import { contrastOnWhite, parseHex, readableBrand } from './brand'
import { DEFAULT_BRANDING, DEFAULT_SETTINGS, getByProject, listProjects, loadSettings, newProject, openDb, put, resetDb, saveProject, saveSettings, deleteProject, listScopes } from './db'
import type { ScopeTemplate } from './types'

const tpl = (over: Partial<ScopeTemplate> = {}): ScopeTemplate => ({ id: 't', trade: 'X', title: 'T', summary: '', scope: ['Do it'], included: [], excluded: [], assumptions: [], warranty: '', ...over })

describe('parseSpec', () => {
  it('parses key, label, type, default and select options (with / inside options)', () => {
    expect(parseSpec('qty|Number of heads|number')).toEqual({ key: 'qty', label: 'Number of heads', type: 'number' })
    expect(parseSpec('size|Size|select(3/4 in;1-1/4 in)|3/4 in')).toEqual({ key: 'size', label: 'Size', type: 'select', options: ['3/4 in', '1-1/4 in'], default: '3/4 in' })
    expect(parseSpec('customer')).toEqual({ key: 'customer', label: 'customer', type: 'text' })
    expect(parseSpec('x|Label|text|a|b').default).toBe('a|b')
  })
  it('rejects bad keys, types and empty selects with clear messages', () => {
    expect(() => parseSpec('1bad')).toThrow(TemplateError)
    expect(() => parseSpec('a|b|colour')).toThrow(/Unknown type/)
    expect(() => parseSpec('a|b|select()')).toThrow(/empty select/)
  })
})

describe('templateFields / renderTemplate', () => {
  it('first full definition wins even if a bare reuse appears earlier', () => {
    const f = templateFields(tpl({ summary: 'For {{who}}', scope: ['Meet {{who|Customer name|text|Pat}}'] }))
    expect(f).toEqual([{ key: 'who', label: 'Customer name', type: 'text', default: 'Pat' }])
  })
  it('fills values, formats money/date, and prints blanks as ______', () => {
    const t = tpl({ summary: '{{who|Who}} owes {{amt|Amount|money}} by {{due|Due|date}}.', scope: ['Fix {{qty|Qty|number}} item(s).'] })
    const r = renderTemplate(t, { who: 'Pat', amt: '1234.5', due: '2026-03-09' })
    expect(r.summary).toBe('Pat owes $1,234.50 by Mar 9, 2026.')
    expect(r.scope[0]).toBe(`Fix ${BLANK} item(s).`)
    expect(r.blanks).toEqual(['Qty'])
    expect(formatValue({ key: 'a', label: 'a', type: 'money' }, 'abc')).toBe('abc')
  })
  it('auto-fills customer, address and date from the project', () => {
    const t = tpl({ summary: '{{customer|Customer}} at {{address|Address}} on {{date|Date|date}}' })
    const v = defaultValues(t, contextValues({ customer: 'Johnson', address: '1 Oak St', date: new Date(2026, 9, 5) }))
    expect(renderTemplate(t, v).summary).toBe('Johnson at 1 Oak St on Oct 5, 2026')
  })
  it('exports clean plain text', () => {
    const txt = scopeToText(renderTemplate(tpl({ title: 'Job', summary: 'Sum', scope: ['A', 'B'], excluded: ['X'] }), {}))
    expect(txt).toContain('SCOPE OF WORK\n1. A\n2. B')
    expect(txt).toContain('NOT INCLUDED\n• X')
  })
})

describe('buildCustomTemplate', () => {
  it('turns textareas into a template and strips bullets', () => {
    const t = buildCustomTemplate({ title: ' My job ', trade: '', summary: 'S {{a|A}}', scope: '- one\n2) two\n\n• three', included: '', excluded: '', assumptions: '', warranty: '' })
    expect(t).toMatchObject({ title: 'My job', trade: 'My templates', custom: true, scope: ['one', 'two', 'three'] })
    expect(templateFields(t).map((f) => f.key)).toEqual(['a'])
  })
  it('reports mistakes while editing', () => {
    const base = { title: 'T', trade: '', summary: '', scope: 'x', included: '', excluded: '', assumptions: '', warranty: '' }
    expect(() => buildCustomTemplate({ ...base, title: '' })).toThrow(/title/)
    expect(() => buildCustomTemplate({ ...base, scope: '' })).toThrow(/scope/)
    expect(() => buildCustomTemplate({ ...base, scope: 'Oops {{ qty' })).toThrow(/unmatched/)
    expect(() => buildCustomTemplate({ ...base, scope: 'Oops {{qty|Q|colour}}' })).toThrow(/Unknown type/)
  })
})

describe('built-in library (data lint)', () => {
  it('is a real, varied library', () => {
    expect(SCOPE_LIBRARY.length).toBeGreaterThanOrEqual(25)
    expect(new Set(SCOPE_LIBRARY.map((t) => t.id)).size).toBe(SCOPE_LIBRARY.length)
    for (const trade of ['Irrigation', 'Drainage', 'Plumbing', 'Painting', 'Roofing', 'Landscaping', 'HVAC', 'Electrical']) expect(SCOPE_LIBRARY.some((t) => t.trade === trade)).toBe(true)
  })
  for (const t of SCOPE_LIBRARY) {
    it(`${t.id}: well-formed, fillable and clean`, () => {
      expect((TRADES as readonly string[]).includes(t.trade)).toBe(true)
      expect(t.title.length).toBeGreaterThan(5)
      expect(t.scope.length).toBeGreaterThanOrEqual(3)
      expect(t.summary.endsWith('.')).toBe(true)
      expect(t.warranty.length).toBeGreaterThan(10)
      const fields = templateFields(t) // throws on any malformed blank
      for (const f of fields) {
        if (f.type === 'select') {
          expect(f.options!.length).toBeGreaterThanOrEqual(2)
          if (f.default) expect(f.options).toContain(f.default)
        }
      }
      const r = renderTemplate(t, defaultValues(t, contextValues({ customer: 'Pat Lee', address: '12 Main St' })))
      const text = scopeToText(r)
      expect(text).not.toMatch(/\{\{|\}\}|undefined|NaN/)
      expect(text).not.toMatch(/ {2,}/)
      expect(text).not.toMatch(/\s[.,;]/)
      for (const line of [...r.scope, ...r.included, ...r.excluded, ...r.assumptions]) expect(line.length).toBeLessThan(420)
    })
  }
})

describe('brand colours', () => {
  it('keeps any chosen colour readable under white text', () => {
    for (const c of ['#ffff00', '#f5f5f5', '#ffffff', '#2563eb', '#00ff88']) expect(contrastOnWhite(readableBrand(c).rgb)).toBeGreaterThanOrEqual(4.5)
    expect(readableBrand('#2563eb').hex).toBe('#2563eb') // already fine: unchanged
    expect(readableBrand('nonsense').hex).toBe('#2563eb')
    expect(parseHex('#abc')).toEqual([170, 187, 204])
  })
})

describe('database v2 + settings', () => {
  beforeEach(async () => { await resetDb() })

  it('upgrades a v1 database in place without losing data', async () => {
    await new Promise<void>((res, rej) => {
      const r = indexedDB.open('jobcam', 1)
      r.onupgradeneeded = () => {
        const db = r.result
        for (const n of ['projects', 'photos', 'checklists', 'comments', 'estimates', 'meta']) {
          const s = db.createObjectStore(n, { keyPath: n === 'meta' ? 'key' : 'id' })
          if (['photos', 'checklists', 'comments', 'estimates'].includes(n)) s.createIndex('projectId', 'projectId')
        }
      }
      r.onsuccess = () => {
        const tx = r.result.transaction('projects', 'readwrite')
        tx.objectStore('projects').put({ id: 'old', name: 'Legacy job', status: 'active', createdAt: 1, updatedAt: 1, address: '', customer: '', phone: '', email: '', notes: '' })
        tx.oncomplete = () => { r.result.close(); res() }
      }
      r.onerror = () => rej(r.error)
    })
    const db = await openDb()
    expect(db.version).toBe(2)
    expect([...db.objectStoreNames]).toContain('scopes')
    expect((await listProjects()).map((p) => p.name)).toEqual(['Legacy job'])
    await put('scopes', { id: 's1', projectId: 'old', title: 'x', template: tpl(), values: {}, createdAt: 1 })
    expect(await getByProject('scopes', 'old')).toHaveLength(1)
  })

  it('deleting a project removes its scope documents', async () => {
    const p = await saveProject(newProject({ name: 'A' }))
    await put('scopes', { id: 's1', projectId: p.id, title: 'x', template: tpl(), values: {}, createdAt: 1 })
    await deleteProject(p.id)
    expect(await listScopes(p.id)).toHaveLength(0)
  })

  it('persists branding and custom templates, merging defaults for old saved settings', async () => {
    await put('meta', { key: 'settings', value: { companyName: 'Old Co', taxRate: 5 } }) // pre-branding settings
    const old = await loadSettings()
    expect(old.branding).toEqual(DEFAULT_BRANDING)
    expect(old.customTemplates).toEqual([])
    await saveSettings({ ...DEFAULT_SETTINGS, branding: { ...DEFAULT_BRANDING, color: '#b91c1c', license: 'TX-123' }, customTemplates: [tpl({ custom: true })] })
    const s = await loadSettings()
    expect(s.branding).toMatchObject({ color: '#b91c1c', license: 'TX-123' })
    expect(s.customTemplates).toHaveLength(1)
  })
})
