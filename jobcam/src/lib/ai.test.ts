import { describe, expect, it } from 'vitest'
import { analyzeMedia, callModel, extractJson, MAX_FRAMES, priceFor, reviewProject } from './ai'
import { DEFAULT_SETTINGS } from './db'
import type { AiSettings } from './types'

const openai: AiSettings = { provider: 'openai', endpoint: 'http://x/v1/chat/completions', apiKey: 'k', model: 'm' }
const claude: AiSettings = { provider: 'anthropic', endpoint: '', apiKey: 'sk', model: 'claude-x' }
const GOOD = { summary: 'A cracked valve box.', caption: 'Cracked valve box', tags: ['Issue', 'Damage'], issues: [{ title: 'Cracked lid', severity: 'high', evidence: 'visible crack', recommendation: 'Replace lid' }], reasoning: 'Crack runs across the lid.', confidence: 'high' }

function fake(reply: (url: string, body: any, headers: any) => unknown, status = 200) {
  const calls: { url: string; body: any; headers: any }[] = []
  const f = (async (url: string, init: RequestInit) => {
    const body = JSON.parse(init.body as string)
    calls.push({ url, body, headers: init.headers })
    return new Response(JSON.stringify(reply(url, body, init.headers)), { status })
  }) as unknown as typeof fetch
  return { f, calls }
}
const oai = (text: string) => ({ choices: [{ message: { content: text } }] })
const ant = (text: string) => ({ content: [{ type: 'text', text }] })

describe('extractJson', () => {
  it('handles fences, chatter and braces inside strings', () => {
    expect(extractJson('Sure!\n```json\n{"a":1}\n```')).toEqual({ a: 1 })
    expect(extractJson('here: {"s":"a } b","n":{"x":2}} thanks')).toEqual({ s: 'a } b', n: { x: 2 } })
  })
  it('rejects non-JSON and truncated replies', () => {
    expect(() => extractJson('no json')).toThrow('structured')
    expect(() => extractJson('{"a": ')).toThrow('incomplete')
  })
})

describe('analyzeMedia', () => {
  it('sends images as OpenAI image_url parts and normalizes the reply', async () => {
    const { f, calls } = fake(() => oai(JSON.stringify(GOOD)))
    const a = await analyzeMedia([{ dataUrl: 'data:image/jpeg;base64,AAA' }], { projectName: 'Oak', caption: 'valve' }, openai, f)
    const content = calls[0].body.messages[1].content
    expect(content[0]).toEqual({ type: 'image_url', image_url: { url: 'data:image/jpeg;base64,AAA' } })
    expect(content.at(-1).text).toContain('Project: Oak')
    expect(calls[0].headers.Authorization).toBe('Bearer k')
    expect(a.issues[0]).toMatchObject({ severity: 'high', title: 'Cracked lid' })
    expect(a.reasoning).toContain('Crack')
    expect(a.confidence).toBe('high')
  })

  it('uses the Anthropic Messages API shape and browser-access header', async () => {
    const { f, calls } = fake(() => ant('```json\n' + JSON.stringify(GOOD) + '\n```'))
    await analyzeMedia([{ dataUrl: 'data:image/jpeg;base64,QUJD' }], {}, claude, f)
    expect(calls[0].url).toBe('https://api.anthropic.com/v1/messages')
    expect(calls[0].headers['x-api-key']).toBe('sk')
    expect(calls[0].headers['anthropic-dangerous-direct-browser-access']).toBe('true')
    expect(calls[0].body.messages[0].content[0]).toEqual({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: 'QUJD' } })
    expect(calls[0].body.system).toContain('field inspector')
  })

  it('labels video frames and caps how many are sent', async () => {
    const { f, calls } = fake(() => oai(JSON.stringify(GOOD)))
    const frames = Array.from({ length: 10 }, (_, i) => ({ dataUrl: 'data:image/jpeg;base64,A', label: `0:0${i}` }))
    await analyzeMedia(frames, { isVideo: true }, openai, f)
    const content = calls[0].body.messages[1].content
    expect(content.filter((c: any) => c.type === 'image_url')).toHaveLength(MAX_FRAMES)
    expect(content[0].text).toContain('Frame 1 of 6 (0:00)')
    expect(content.at(-1).text).toContain('video')
  })

  it('fills safe defaults for sloppy model output', async () => {
    const { f } = fake(() => oai('{"summary":"ok","issues":[{"title":"x","severity":"catastrophic"}],"confidence":"sure"}'))
    const a = await analyzeMedia([{ dataUrl: 'data:image/jpeg;base64,A' }], {}, openai, f)
    expect(a.issues[0].severity).toBe('medium')
    expect(a.confidence).toBe('medium')
    expect(a.tags).toEqual([])
  })

  it('surfaces HTTP errors, missing config and empty summaries', async () => {
    await expect(analyzeMedia([{ dataUrl: 'data:image/jpeg;base64,A' }], {}, openai, fake(() => ({ error: 'bad key' }), 401).f)).rejects.toThrow('401')
    await expect(callModel([], { ...openai, model: '' })).rejects.toThrow('model')
    await expect(callModel([], { ...openai, endpoint: '' })).rejects.toThrow('endpoint')
    await expect(analyzeMedia([{ dataUrl: 'data:image/jpeg;base64,A' }], {}, openai, fake(() => oai('{"summary":""}')).f)).rejects.toThrow('summary')
    await expect(analyzeMedia([], {}, openai)).rejects.toThrow('No image')
  })
})

describe('reviewProject', () => {
  it('returns reasoning, next steps and suggested billable items', async () => {
    const { f, calls } = fake(() => oai(JSON.stringify({ summary: 'Mostly done.', progress: '80%', risks: ['Leak may return'], nextSteps: ['Replace lid'], suggestedItems: [{ description: 'Valve box lid', qty: 2, unit: 'ea' }, { description: 'Bad qty', qty: -3 }], reasoning: 'Because.' })))
    const r = await reviewProject('digest text', openai, f)
    expect(calls[0].body.messages[1].content[0].text).toContain('digest text')
    expect(r.nextSteps).toEqual(['Replace lid'])
    expect(r.suggestedItems.map((i) => i.qty)).toEqual([2, 1])
    expect(r.reasoning).toBe('Because.')
  })
})

describe('priceFor', () => {
  it('matches price-book keywords and defaults to 0', () => {
    expect(priceFor('Replace 2 sprinkler heads', DEFAULT_SETTINGS.priceBook)).toBe(35)
    expect(priceFor('Custom stonework', DEFAULT_SETTINGS.priceBook)).toBe(0)
  })
})
