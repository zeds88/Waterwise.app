import type { AiAnalysis, Checklist, Comment, Estimate, Project, ProjectReview, Settings } from './types'
import { money, totals } from './estimate'

export const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')

export interface ReportPhoto {
  src: string // data URL of the flattened (annotated) image
  caption: string
  tags: string[]
  takenAt: number
  lat?: number
  lng?: number
  isVideo?: boolean
  duration?: string
  ai?: Pick<AiAnalysis, 'summary' | 'issues' | 'reasoning'>
  transcript?: string
}

export interface ReportInput {
  settings: Pick<Settings, 'companyName'>
  project: Project
  photos: ReportPhoto[]
  checklists: Checklist[]
  comments: Comment[]
  estimates: Estimate[]
  recap?: string
  review?: ProjectReview
}

/** Self-contained HTML: open it, print it to PDF, or email it. No server needed. */
export function buildReportHtml(r: ReportInput): string {
  const { project: p } = r
  const photoHtml = r.photos
    .map(
      (ph) => `<figure><img src="${ph.src}" alt="${esc(ph.caption || 'Job photo')}">
<figcaption>${ph.isVideo ? `<span class="tag">▶ Video ${esc(ph.duration ?? '')}</span><br>` : ''}${ph.caption ? `<b>${esc(ph.caption)}</b><br>` : ''}${esc(new Date(ph.takenAt).toLocaleString())}${
        ph.lat !== undefined && ph.lng !== undefined ? ` · ${ph.lat.toFixed(5)}, ${ph.lng.toFixed(5)}` : ''
      }${ph.tags.length ? `<br>${ph.tags.map((t) => `<span class="tag">${esc(t)}</span>`).join(' ')}` : ''}${
        ph.ai ? `<div class="ai"><b>AI:</b> ${esc(ph.ai.summary)}${ph.ai.issues.map((i) => `<br>• <b>${esc(i.title)}</b> (${esc(i.severity)}) – ${esc(i.recommendation)}`).join('')}</div>` : ''
      }${ph.transcript ? `<details><summary>Narration transcript</summary><div class="ai" style="white-space:pre-wrap">${esc(ph.transcript)}</div></details>` : ''}</figcaption></figure>`,
    )
    .join('\n')

  const checklistHtml = r.checklists
    .map(
      (c) => `<h3>${esc(c.title)}</h3><ul class="check">${c.items
        .map((i) => `<li class="${i.done ? 'done' : ''}">${i.done ? '☑' : '☐'} ${esc(i.text)}</li>`)
        .join('')}</ul>`,
    )
    .join('')

  const estimateHtml = r.estimates
    .map((e) => {
      const t = totals(e)
      return `<h3>${esc(e.title)}</h3><table><thead><tr><th>Item</th><th>Qty</th><th>Unit</th><th>Price</th><th>Total</th></tr></thead><tbody>${e.items
        .map((i) => `<tr><td>${esc(i.description)}</td><td>${i.qty}</td><td>${esc(i.unit)}</td><td>${money(i.unitPrice)}</td><td>${money(i.qty * i.unitPrice)}</td></tr>`)
        .join('')}</tbody><tfoot><tr><td colspan="4">Subtotal</td><td>${money(t.subtotal)}</td></tr>${
        e.taxRate ? `<tr><td colspan="4">Tax (${e.taxRate}%)</td><td>${money(t.tax)}</td></tr>` : ''
      }<tr><td colspan="4"><b>Total</b></td><td><b>${money(t.total)}</b></td></tr></tfoot></table>`
    })
    .join('')

  const commentHtml = r.comments
    .map((c) => `<p class="comment"><b>${esc(c.author)}</b> <small>${esc(new Date(c.createdAt).toLocaleString())}</small><br>${esc(c.text)}</p>`)
    .join('')

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(p.name || 'Job report')} – ${esc(r.settings.companyName)}</title>
<style>
body{font:15px/1.5 system-ui,sans-serif;max-width:900px;margin:0 auto;padding:24px;color:#0f172a}
h1{margin:0 0 4px}h2{margin-top:32px;border-bottom:2px solid #e2e8f0;padding-bottom:4px}
.meta{color:#475569}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:16px}
figure{margin:0;break-inside:avoid}img{width:100%;border-radius:8px;display:block}
figcaption{font-size:12px;color:#475569;margin-top:4px}.tag{background:#e0f2fe;color:#075985;border-radius:99px;padding:1px 8px;font-size:11px}
table{width:100%;border-collapse:collapse}td,th{border-bottom:1px solid #e2e8f0;padding:6px;text-align:left}
ul.check{list-style:none;padding:0}li.done{color:#64748b;text-decoration:line-through}
.ai{margin-top:6px;background:#faf5ff;border-left:3px solid #a855f7;padding:4px 8px;border-radius:4px;color:#3b0764}.recap{background:#f1f5f9;border-radius:8px;padding:12px;white-space:pre-wrap}
@media print{body{padding:0}h2{break-after:avoid}}
</style></head><body>
<p class="meta">${esc(r.settings.companyName)} · Job report · ${esc(new Date().toLocaleDateString())}</p>
<h1>${esc(p.name || 'Untitled project')}</h1>
<p class="meta">${[p.address, p.customer, p.phone, p.email].filter(Boolean).map(esc).join(' · ')}</p>
${r.recap ? `<h2>Summary</h2><div class="recap">${esc(r.recap)}</div>` : ''}
${r.review ? `<h2>AI job review</h2><div class="recap">${esc(r.review.summary)}${r.review.progress ? `\n\nProgress: ${esc(r.review.progress)}` : ''}</div>${r.review.risks.length ? `<h3>Risks</h3><ul>${r.review.risks.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}${r.review.nextSteps.length ? `<h3>Next steps</h3><ol>${r.review.nextSteps.map((x) => `<li>${esc(x)}</li>`).join('')}</ol>` : ''}<details><summary>How the AI reasoned</summary><p>${esc(r.review.reasoning)}</p></details>` : ''}
${p.notes ? `<h2>Notes</h2><p>${esc(p.notes).replace(/\n/g, '<br>')}</p>` : ''}
${r.photos.length ? `<h2>Photos (${r.photos.length})</h2><div class="grid">${photoHtml}</div>` : ''}
${r.checklists.length ? `<h2>Checklists</h2>${checklistHtml}` : ''}
${r.estimates.length ? `<h2>Estimate</h2>${estimateHtml}` : ''}
${r.comments.length ? `<h2>Comments</h2>${commentHtml}` : ''}
</body></html>`
}
