import type { Checklist, Comment, Photo, Project, Settings } from './types'

/** Plain-text digest of a project. This is also the only text ever sent to an optional LLM. */
export function localRecap(project: Project, photos: Photo[], checklists: Checklist[], comments: Comment[]): string {
  const lines: string[] = []
  const times = photos.map((p) => p.takenAt)
  const span = times.length
    ? `${new Date(Math.min(...times)).toLocaleDateString()} – ${new Date(Math.max(...times)).toLocaleDateString()}`
    : 'no photos yet'
  lines.push(`${project.name || 'Untitled project'}${project.address ? ` at ${project.address}` : ''} is ${project.status}.`)
  lines.push(`${photos.length} photo${photos.length === 1 ? '' : 's'} captured (${span}).`)

  const tagCounts = new Map<string, number>()
  for (const p of photos) for (const t of p.tags) tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1)
  if (tagCounts.size) {
    lines.push('Tags: ' + [...tagCounts].sort((a, b) => b[1] - a[1]).map(([t, n]) => `${t} (${n})`).join(', ') + '.')
  }

  const items = checklists.flatMap((c) => c.items)
  if (items.length) {
    const done = items.filter((i) => i.done).length
    lines.push(`Checklists: ${done} of ${items.length} items done.`)
    const open = items.filter((i) => !i.done).slice(0, 5).map((i) => i.text)
    if (open.length) lines.push('Still open: ' + open.join('; ') + '.')
  }
  const captions = photos.filter((p) => p.caption).slice(0, 5).map((p) => p.caption)
  if (captions.length) lines.push('Photo notes: ' + captions.join(' | '))
  const last = comments.slice(-3).map((c) => `${c.author}: ${c.text}`)
  if (last.length) lines.push('Latest comments: ' + last.join(' | '))
  return lines.join('\n')
}

/** Optional: summarise the text digest with any OpenAI-compatible endpoint the user configures. */
export async function aiRecap(digest: string, ai: Settings['ai'], fetcher: typeof fetch = fetch): Promise<string> {
  if (!ai.endpoint || !ai.model) throw new Error('Set an AI endpoint and model in Settings first.')
  const res = await fetcher(ai.endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(ai.apiKey ? { Authorization: `Bearer ${ai.apiKey}` } : {}) },
    body: JSON.stringify({
      model: ai.model,
      messages: [
        { role: 'system', content: 'You write short, plain progress updates for a customer about a field job. 3-4 sentences, no markdown.' },
        { role: 'user', content: digest },
      ],
    }),
  })
  if (!res.ok) throw new Error(`AI request failed (${res.status})`)
  const data = await res.json()
  const text = data?.choices?.[0]?.message?.content
  if (typeof text !== 'string' || !text.trim()) throw new Error('AI returned no text')
  return text.trim()
}
