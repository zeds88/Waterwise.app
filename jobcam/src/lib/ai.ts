import type { AiAnalysis, AiIssue, AiSettings, PriceBookEntry, ProjectReview, Severity } from './types'

/**
 * Vision analysis + reasoning through a model the user configures (Claude, any OpenAI-compatible
 * API, or a local server such as Ollama/LM Studio). Nothing is sent unless the user clicks Analyze,
 * and only the downscaled frames/text for that request.
 */

export const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'
export const MAX_FRAMES = 6

const SYSTEM = `You are a senior field inspector and estimator for the trades (irrigation, plumbing, roofing, painting, landscaping, general construction).
Rules:
- Describe only what is actually visible. If something cannot be determined from the images, say so and lower your confidence.
- Prefer concrete, checkable evidence ("brown stains below the valve box lid") over generalities.
- "reasoning" is a short, step-by-step justification (3-6 sentences) linking the evidence you saw to your conclusions.
- Respond with a single JSON object and nothing else.`

const PHOTO_SCHEMA = `{
 "summary": "1-2 sentence description of what the media shows",
 "caption": "short caption under 12 words",
 "tags": ["from: Before, After, Progress, Issue, Damage, Materials, Safety, Final - or a short custom tag"],
 "observations": ["notable visible facts"],
 "issues": [{"title":"", "severity":"low|medium|high", "evidence":"what you see", "recommendation":"what to do"}],
 "materials": ["materials/parts that appear needed"],
 "safety": ["safety or code concerns, if any"],
 "reasoning": "step-by-step justification",
 "confidence": "low|medium|high"
}`

const REVIEW_SCHEMA = `{
 "summary": "2-3 sentence plain-language update suitable for the customer",
 "progress": "where the job stands",
 "risks": ["risks or open problems"],
 "nextSteps": ["ordered, concrete next actions"],
 "suggestedItems": [{"description":"billable item", "qty": 1, "unit":"ea"}],
 "reasoning": "step-by-step justification across the evidence"
}`

export interface Frame { dataUrl: string; label?: string }

type Part = { type: 'text'; text: string } | { type: 'image'; dataUrl: string }

/** Provider-neutral call: returns the model's text. */
export async function callModel(parts: Part[], ai: AiSettings, fetcher: typeof fetch = fetch, maxTokens = 1800): Promise<string> {
  if (!ai.model) throw new Error('Choose an AI model in Settings first.')
  const anthropic = ai.provider === 'anthropic'
  const endpoint = ai.endpoint || (anthropic ? ANTHROPIC_URL : '')
  if (!endpoint) throw new Error('Set an AI endpoint in Settings first.')

  let headers: Record<string, string> = { 'Content-Type': 'application/json' }
  let body: unknown
  if (anthropic) {
    headers = { ...headers, 'x-api-key': ai.apiKey, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' }
    body = {
      model: ai.model, max_tokens: maxTokens, system: SYSTEM,
      messages: [{
        role: 'user',
        content: parts.map((p) => p.type === 'text' ? { type: 'text', text: p.text } : {
          type: 'image', source: { type: 'base64', media_type: /^data:([^;]+)/.exec(p.dataUrl)?.[1] ?? 'image/jpeg', data: p.dataUrl.split(',')[1] },
        }),
      }],
    }
  } else {
    if (ai.apiKey) headers.Authorization = `Bearer ${ai.apiKey}`
    body = {
      model: ai.model, temperature: 0.2, max_tokens: maxTokens,
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: parts.map((p) => p.type === 'text' ? { type: 'text', text: p.text } : { type: 'image_url', image_url: { url: p.dataUrl } }) },
      ],
    }
  }

  const res = await fetcher(endpoint, { method: 'POST', headers, body: JSON.stringify(body) })
  if (!res.ok) throw new Error(`AI request failed (${res.status}): ${(await res.text().catch(() => '')).slice(0, 200)}`)
  const data = await res.json()
  const text: unknown = anthropic ? data?.content?.find?.((c: { type: string }) => c.type === 'text')?.text : data?.choices?.[0]?.message?.content
  if (typeof text !== 'string' || !text.trim()) throw new Error('The AI returned no text')
  return text.trim()
}

/** Pull the first JSON object out of a model reply (handles ```json fences and chatter). */
export function extractJson(text: string): Record<string, unknown> {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(text)?.[1] ?? text
  const start = fenced.indexOf('{')
  if (start < 0) throw new Error('The AI did not return structured data')
  let depth = 0, inStr = false, esc = false
  for (let i = start; i < fenced.length; i++) {
    const c = fenced[i]
    if (inStr) { if (esc) esc = false; else if (c === '\\') esc = true; else if (c === '"') inStr = false; continue }
    if (c === '"') inStr = true
    else if (c === '{') depth++
    else if (c === '}' && --depth === 0) {
      try { return JSON.parse(fenced.slice(start, i + 1)) } catch { throw new Error('The AI returned malformed JSON') }
    }
  }
  throw new Error('The AI returned incomplete JSON')
}

const str = (v: unknown, d = '') => (typeof v === 'string' ? v.trim() : d)
const strs = (v: unknown, max = 12) => (Array.isArray(v) ? v.map((x) => str(x)).filter(Boolean).slice(0, max) : [])
const sev = (v: unknown): Severity => (v === 'high' || v === 'medium' || v === 'low' ? v : 'medium')

export function normalizeAnalysis(raw: Record<string, unknown>, model: string): AiAnalysis {
  const summary = str(raw.summary)
  if (!summary) throw new Error('The AI response had no summary')
  const issues: AiIssue[] = (Array.isArray(raw.issues) ? raw.issues : []).slice(0, 10).map((i: any) => ({
    title: str(i?.title, 'Issue'), severity: sev(i?.severity), evidence: str(i?.evidence), recommendation: str(i?.recommendation),
  }))
  const conf = raw.confidence
  return {
    at: Date.now(), model, summary, caption: str(raw.caption).slice(0, 120), tags: strs(raw.tags, 6),
    observations: strs(raw.observations), issues, materials: strs(raw.materials), safety: strs(raw.safety),
    reasoning: str(raw.reasoning), confidence: conf === 'high' || conf === 'low' ? conf : 'medium',
  }
}

export interface AnalyzeContext { projectName?: string; address?: string; caption?: string; tags?: string[]; isVideo?: boolean }

/** Analyze one photo (1 frame) or one video (several timestamped frames). */
export async function analyzeMedia(frames: Frame[], ctx: AnalyzeContext, ai: AiSettings, fetcher: typeof fetch = fetch): Promise<AiAnalysis> {
  if (frames.length === 0) throw new Error('No image to analyze')
  const used = frames.slice(0, MAX_FRAMES)
  const parts: Part[] = []
  used.forEach((f, i) => {
    if (used.length > 1) parts.push({ type: 'text', text: `Frame ${i + 1} of ${used.length}${f.label ? ` (${f.label})` : ''}:` })
    parts.push({ type: 'image', dataUrl: f.dataUrl })
  })
  const known = [ctx.projectName && `Project: ${ctx.projectName}`, ctx.address && `Address: ${ctx.address}`, ctx.caption && `User caption: ${ctx.caption}`, ctx.tags?.length && `User tags: ${ctx.tags.join(', ')}`].filter(Boolean).join('\n')
  parts.push({ type: 'text', text: `${ctx.isVideo ? 'These are frames sampled in order from one video walkthrough.' : 'This is a single job-site photo.'}\n${known}\n\nAnalyze it. Return JSON exactly in this shape:\n${PHOTO_SCHEMA}` })
  return normalizeAnalysis(extractJson(await callModel(parts, ai, fetcher)), ai.model)
}

/** Reason across everything known about the job (text digest incl. per-photo AI findings). */
export async function reviewProject(digest: string, ai: AiSettings, fetcher: typeof fetch = fetch): Promise<ProjectReview> {
  const parts: Part[] = [{ type: 'text', text: `Here is everything recorded about a job:\n\n${digest}\n\nReason across all of it: reconcile photos with notes, spot gaps and risks, and decide what happens next. Return JSON exactly in this shape:\n${REVIEW_SCHEMA}` }]
  const raw = extractJson(await callModel(parts, ai, fetcher, 2000))
  const summary = str(raw.summary)
  if (!summary) throw new Error('The AI response had no summary')
  return {
    at: Date.now(), model: ai.model, summary, progress: str(raw.progress), risks: strs(raw.risks), nextSteps: strs(raw.nextSteps),
    reasoning: str(raw.reasoning),
    suggestedItems: (Array.isArray(raw.suggestedItems) ? raw.suggestedItems : []).slice(0, 15).map((i: any) => ({
      description: str(i?.description, 'Item'), qty: Number(i?.qty) > 0 ? Number(i.qty) : 1, unit: str(i?.unit, 'ea'),
    })),
  }
}

/** Find a price for an AI-suggested item by matching price-book keywords against its description. */
export function priceFor(description: string, book: PriceBookEntry[]): number {
  const d = description.toLowerCase()
  const hit = book.find((b) => b.keywords.some((k) => d.includes(k.toLowerCase())) || d.includes(b.description.toLowerCase()))
  return hit?.price ?? 0
}
