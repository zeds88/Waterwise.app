import { callModel } from './ai'
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
  const spoken = photos.filter((p) => p.transcript).slice(0, 3).map((p) => p.transcript!.text.slice(0, 300))
  if (spoken.length) lines.push('Video narration: ' + spoken.join(' | '))
  const findings = photos.filter((p) => p.ai).slice(0, 8).map((p) => `${p.ai!.summary}${p.ai!.issues.length ? ` Issues: ${p.ai!.issues.map((i) => `${i.title} (${i.severity})`).join(', ')}.` : ''}`)
  if (findings.length) lines.push('AI photo findings: ' + findings.join(' | '))
  const last = comments.slice(-3).map((c) => `${c.author}: ${c.text}`)
  if (last.length) lines.push('Latest comments: ' + last.join(' | '))
  return lines.join('\n')
}

/** Optional: plain-language customer update from the text digest, via the configured model. */
export async function aiRecap(digest: string, ai: Settings['ai'], fetcher: typeof fetch = fetch): Promise<string> {
  const text = await callModel([{ type: 'text', text: `Write a short customer-facing progress update (3-4 sentences, no markdown) from these job notes:\n\n${digest}` }], ai, fetcher, 400)
  return text
}
