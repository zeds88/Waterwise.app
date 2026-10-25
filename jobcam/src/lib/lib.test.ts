import { beforeEach, describe, expect, it } from 'vitest'
import { arrowHead } from './annotate'
import { totals, round2 } from './estimate'
import { buildReportHtml, esc } from './report'
import { aiRecap, localRecap } from './recap'
import { blobToDataUrl, dataUrlToBlob } from './blob'
import { deleteProject, listPhotos, listProjects, loadSettings, newProject, resetDb, saveProject, savePhoto, saveSettings, DEFAULT_SETTINGS, put, listChecklists } from './db'
import { exportAll, importAll } from './backup'
import type { Photo } from './types'

const photo = (projectId: string, over: Partial<Photo> = {}): Photo => ({
  id: crypto.randomUUID(), projectId, blob: new Blob(['abc'], { type: 'image/jpeg' }), thumb: new Blob(['a'], { type: 'image/jpeg' }),
  width: 10, height: 10, takenAt: 1_700_000_000_000, tags: ['before'], caption: 'Cracked <valve> box', annotations: [], ...over,
})

describe('estimate', () => {
  it('computes subtotal, tax and total with cent rounding', () => {
    const t = totals({ taxRate: 8.25, items: [{ id: '1', description: 'x', qty: 3, unit: 'ea', unitPrice: 35.33 }] })
    expect(t).toEqual({ subtotal: 105.99, tax: 8.74, total: 114.73 })
    expect(round2(0.1 + 0.2)).toBe(0.3)
  })
})

describe('annotate', () => {
  it('arrow barbs sit behind the tip, symmetric about the shaft', () => {
    const [l, r] = arrowHead([0, 0], [10, 0], 2)
    expect(l[0]).toBeLessThan(10)
    expect(l[0]).toBeCloseTo(r[0])
    expect(l[1]).toBeCloseTo(-r[1])
  })
})

describe('report', () => {
  it('escapes user content everywhere', () => {
    expect(esc(`<script>"x"&'`)).toBe('&lt;script&gt;&quot;x&quot;&amp;&#39;')
    const p = newProject({ name: '<b>Oak</b>', notes: 'a<script>' })
    const html = buildReportHtml({
      settings: { companyName: 'Acme & Sons' }, project: p, recap: 'ok <i>',
      photos: [{ src: 'data:image/jpeg;base64,AAAA', caption: '<img onerror=x>', tags: ['t"ag'], takenAt: 0 }],
      checklists: [], comments: [], estimates: [],
    })
    expect(html).not.toContain('<script>')
    expect(html).not.toContain('<img onerror')
    expect(html).toContain('Acme &amp; Sons')
    expect(html).toContain('&lt;b&gt;Oak&lt;/b&gt;')
  })
})

describe('recap', () => {
  it('summarises photos, tags and checklist progress', () => {
    const p = newProject({ name: 'Oak St', address: '1 Oak St' })
    const txt = localRecap(p, [photo(p.id), photo(p.id)], [{ id: 'c', projectId: p.id, title: 't', createdAt: 0, items: [{ id: 'i', text: 'Fix valve', done: false }, { id: 'j', text: 'Test', done: true }] }], [])
    expect(txt).toContain('2 photos captured')
    expect(txt).toContain('before (2)')
    expect(txt).toContain('1 of 2 items done')
    expect(txt).toContain('Fix valve')
  })
  it('calls an OpenAI-compatible endpoint with only the text digest', async () => {
    let body: any
    const fake = (async (_u: string, init: RequestInit) => {
      body = JSON.parse(init.body as string)
      return new Response(JSON.stringify({ choices: [{ message: { content: ' Done. ' } }] }), { status: 200 })
    }) as unknown as typeof fetch
    expect(await aiRecap('digest', { provider: 'openai', endpoint: 'http://x', apiKey: 'k', model: 'm' }, fake)).toBe('Done.')
    expect(JSON.stringify(body.messages[1].content)).toContain('digest')
    await expect(aiRecap('d', { provider: 'openai', endpoint: '', apiKey: '', model: '' }, fake)).rejects.toThrow()
  })
})

describe('blob', () => {
  it('round-trips binary data', async () => {
    const b = new Blob([new Uint8Array([0, 255, 128, 7])], { type: 'image/png' })
    const back = dataUrlToBlob(await blobToDataUrl(b))
    expect(back.type).toBe('image/png')
    expect([...new Uint8Array(await back.arrayBuffer())]).toEqual([0, 255, 128, 7])
  })
})

describe('db + backup', () => {
  beforeEach(async () => { await resetDb() })

  it('stores projects and cascades deletes', async () => {
    const p = await saveProject(newProject({ name: 'A' }))
    await savePhoto(photo(p.id))
    await put('checklists', { id: 'c1', projectId: p.id, title: 'x', items: [], createdAt: 1 })
    expect(await listPhotos(p.id)).toHaveLength(1)
    await deleteProject(p.id)
    expect(await listProjects()).toHaveLength(0)
    expect(await listPhotos(p.id)).toHaveLength(0)
    expect(await listChecklists(p.id)).toHaveLength(0)
  })

  it('persists settings with defaults merged', async () => {
    expect((await loadSettings()).companyName).toBe(DEFAULT_SETTINGS.companyName)
    await saveSettings({ ...DEFAULT_SETTINGS, companyName: 'Waterline' })
    expect((await loadSettings()).companyName).toBe('Waterline')
  })

  it('exports and re-imports everything including photo bytes', async () => {
    const p = await saveProject(newProject({ name: 'Backup me' }))
    await savePhoto(photo(p.id))
    const json = await exportAll()
    await resetDb()
    const counts = await importAll(json)
    expect(counts.projects).toBe(1)
    const [ph] = await listPhotos(p.id)
    expect(await ph.blob.text()).toBe('abc')
    expect(ph.caption).toBe('Cracked <valve> box')
  })

  it('rejects foreign files', async () => {
    await expect(importAll('{"hello":1}')).rejects.toThrow('Not a JobCam backup')
  })
})
