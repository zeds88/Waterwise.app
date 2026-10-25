import type { AiAnalysis, Branding, Checklist, Comment, Estimate, Project, ProjectReview, Settings } from './types'
import { money, totals } from './estimate'
import { readableBrand } from './brand'
import type { RenderedScope } from './scope'

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
  settings: Pick<Settings, 'companyName' | 'branding'>
  project: Project
  photos: ReportPhoto[]
  checklists: Checklist[]
  comments: Comment[]
  estimates: Estimate[]
  recap?: string
  review?: ProjectReview
  scopes?: RenderedScope[]
}

const safeImg = (src: string) => (/^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(src) ? src : '')

/** Letterhead built from the user's branding. Everything is escaped; the logo must be a raster data URL. */
export function brandHeader(companyName: string, b: Branding, label: string): string {
  const logo = safeImg(b.logo)
  const contact = [b.address, [b.phone, b.email].filter(Boolean).join(' · '), b.website, b.license ? `License: ${b.license}` : ''].filter(Boolean).map(esc).join('<br>')
  return `<header class="brand">
<div class="who">${logo ? `<img class="logo" src="${logo}" alt="">` : ''}<div><div class="co">${esc(companyName)}</div>${b.tagline ? `<div class="tag">${esc(b.tagline)}</div>` : ''}</div></div>
<div class="contact">${contact}</div>
</header>
<p class="doclabel">${esc(label)} · ${esc(new Date().toLocaleDateString())}</p>`
}

export const brandFooter = (b: Branding) => (b.footer ? `<footer>${esc(b.footer).replace(/\n/g, '<br>')}</footer>` : '')

export function brandCss(b: Branding): string {
  return `:root{--brand:${readableBrand(b.color).hex}}
body{font:15px/1.5 system-ui,sans-serif;max-width:900px;margin:0 auto;padding:24px;color:#0f172a}
header.brand{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;border-bottom:4px solid var(--brand);padding-bottom:12px}
.who{display:flex;gap:12px;align-items:center}.logo{max-height:64px;max-width:200px;object-fit:contain}
.co{font-size:20px;font-weight:800;color:var(--brand)}.tag{color:#475569;font-size:13px}.contact{text-align:right;font-size:12px;color:#475569}
.doclabel{color:#64748b;font-size:12px;margin:8px 0 0}
h1{margin:12px 0 4px}h2{margin-top:28px;border-bottom:2px solid var(--brand);padding-bottom:4px;color:var(--brand)}h3{margin:16px 0 4px}
.meta{color:#475569}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:16px}
figure{margin:0;break-inside:avoid}figure img{width:100%;border-radius:8px;display:block}
figcaption{font-size:12px;color:#475569;margin-top:4px}.tag-pill{background:#e0f2fe;color:#075985;border-radius:99px;padding:1px 8px;font-size:11px}
table{width:100%;border-collapse:collapse}th{background:var(--brand);color:#fff}td,th{border-bottom:1px solid #e2e8f0;padding:6px;text-align:left}
ul.check{list-style:none;padding:0}li.done{color:#64748b;text-decoration:line-through}
.ai{margin-top:6px;background:#faf5ff;border-left:3px solid #a855f7;padding:4px 8px;border-radius:4px;color:#3b0764}.recap{background:#f1f5f9;border-radius:8px;padding:12px;white-space:pre-wrap}
.scope{margin-bottom:12px}.scope ol,.scope ul{margin:4px 0 8px 20px;padding:0}.scope p{margin:4px 0}
.sign{display:grid;grid-template-columns:1fr 1fr;gap:32px;margin-top:48px}.sign div{border-top:1px solid #0f172a;padding-top:4px;font-size:12px;color:#475569}
footer{margin-top:32px;border-top:1px solid #e2e8f0;padding-top:8px;font-size:11px;color:#64748b}
@media(max-width:600px){header.brand{flex-direction:column}.contact{text-align:left}}
@media print{body{padding:0}h2{break-after:avoid}.scope{break-inside:avoid}}`
}

/** One scope-of-work document as HTML. */
export function scopeHtml(r: RenderedScope): string {
  const ul = (h: string, a: string[], tag: 'ul' | 'ol' = 'ul') => (a.length ? `<h3>${h}</h3><${tag}>${a.map((x) => `<li>${esc(x)}</li>`).join('')}</${tag}>` : '')
  return `<section class="scope"><h2>${esc(r.title)}</h2><p>${esc(r.summary)}</p>${ul('Scope of work', r.scope, 'ol')}${ul('Included', r.included)}${ul('Not included', r.excluded)}${ul('Assumptions', r.assumptions)}${r.warranty ? `<h3>Warranty</h3><p>${esc(r.warranty)}</p>` : ''}</section>`
}

/** Customer documents only ever show estimates the user has approved for them. */
export const customerEstimates = (estimates: Estimate[]) => estimates.filter((e) => e.proposal !== false)

function estimateHtml(estimates: Estimate[]): string {
  return customerEstimates(estimates)
    .map((e) => {
      const t = totals(e)
      return `<h3>${esc(e.title)}</h3><table><thead><tr><th>Item</th><th>Qty</th><th>Unit</th><th>Price</th><th>Total</th></tr></thead><tbody>${e.items
        .map((i) => `<tr><td>${esc(i.description)}</td><td>${i.qty}</td><td>${esc(i.unit)}</td><td>${money(i.unitPrice)}</td><td>${money(i.qty * i.unitPrice)}</td></tr>`)
        .join('')}</tbody><tfoot><tr><td colspan="4">Subtotal</td><td>${money(t.subtotal)}</td></tr>${
        e.taxRate ? `<tr><td colspan="4">Tax (${e.taxRate}%)</td><td>${money(t.tax)}</td></tr>` : ''
      }<tr><td colspan="4"><b>Total</b></td><td><b>${money(t.total)}</b></td></tr></tfoot></table>`
    })
    .join('')
}

/** Customer-ready proposal: scope(s), pricing, terms and an acceptance block. */
export function buildProposalHtml(r: Pick<ReportInput, 'settings' | 'project' | 'scopes' | 'estimates'>): string {
  const { project: p, settings: { branding: b, companyName } } = r
  const details = [p.address, p.customer && `Prepared for ${p.customer}`, p.phone, p.email].filter(Boolean).map((x) => esc(x as string)).join(' · ')
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Proposal – ${esc(p.name || 'Project')} – ${esc(companyName)}</title>
<style>${brandCss(b)}</style></head><body>
${brandHeader(companyName, b, 'Proposal & scope of work')}
<h1>${esc(p.name || 'Untitled project')}</h1>
<p class="meta">${details}</p>
${(r.scopes ?? []).map(scopeHtml).join('')}
${customerEstimates(r.estimates).length ? `<h2>Pricing</h2>${estimateHtml(r.estimates)}` : ''}
${b.terms ? `<h2>Terms</h2><p>${esc(b.terms).replace(/\n/g, '<br>')}</p>` : ''}
<h2>Acceptance</h2><p>By signing, the customer accepts the scope, pricing and terms above.</p>
<div class="sign"><div>Customer signature &nbsp;&nbsp;&nbsp;&nbsp; Date</div><div>${esc(companyName)} representative &nbsp;&nbsp;&nbsp;&nbsp; Date</div></div>
${brandFooter(b)}
</body></html>`
}

/** Self-contained HTML: open it, print it to PDF, or email it. No server needed. */
export function buildReportHtml(r: ReportInput): string {
  const { project: p, settings: { branding: b, companyName } } = r
  const photoHtml = r.photos
    .map(
      (ph) => `<figure><img src="${ph.src}" alt="${esc(ph.caption || 'Job photo')}">
<figcaption>${ph.isVideo ? `<span class="tag-pill">▶ Video ${esc(ph.duration ?? '')}</span><br>` : ''}${ph.caption ? `<b>${esc(ph.caption)}</b><br>` : ''}${esc(new Date(ph.takenAt).toLocaleString())}${
        ph.lat !== undefined && ph.lng !== undefined ? ` · ${ph.lat.toFixed(5)}, ${ph.lng.toFixed(5)}` : ''
      }${ph.tags.length ? `<br>${ph.tags.map((t) => `<span class="tag-pill">${esc(t)}</span>`).join(' ')}` : ''}${
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

  const commentHtml = r.comments
    .map((c) => `<p class="comment"><b>${esc(c.author)}</b> <small>${esc(new Date(c.createdAt).toLocaleString())}</small><br>${esc(c.text)}</p>`)
    .join('')

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(p.name || 'Job report')} – ${esc(companyName)}</title>
<style>${brandCss(b)}</style></head><body>
${brandHeader(companyName, b, 'Job report')}
<h1>${esc(p.name || 'Untitled project')}</h1>
<p class="meta">${[p.address, p.customer, p.phone, p.email].filter(Boolean).map(esc).join(' · ')}</p>
${r.recap ? `<h2>Summary</h2><div class="recap">${esc(r.recap)}</div>` : ''}
${r.review ? `<h2>AI job review</h2><div class="recap">${esc(r.review.summary)}${r.review.progress ? `\n\nProgress: ${esc(r.review.progress)}` : ''}</div>${r.review.risks.length ? `<h3>Risks</h3><ul>${r.review.risks.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}${r.review.nextSteps.length ? `<h3>Next steps</h3><ol>${r.review.nextSteps.map((x) => `<li>${esc(x)}</li>`).join('')}</ol>` : ''}<details><summary>How the AI reasoned</summary><p>${esc(r.review.reasoning)}</p></details>` : ''}
${p.notes ? `<h2>Notes</h2><p>${esc(p.notes).replace(/\n/g, '<br>')}</p>` : ''}
${(r.scopes ?? []).map(scopeHtml).join('')}
${r.photos.length ? `<h2>Photos (${r.photos.length})</h2><div class="grid">${photoHtml}</div>` : ''}
${r.checklists.length ? `<h2>Checklists</h2>${checklistHtml}` : ''}
${customerEstimates(r.estimates).length ? `<h2>Estimate</h2>${estimateHtml(r.estimates)}` : ''}
${r.comments.length ? `<h2>Comments</h2>${commentHtml}` : ''}
${brandFooter(b)}
</body></html>`
}
