import { ImagePlus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { BRAND_SWATCHES, readableBrand } from '../lib/brand'
import { SAMPLE_TERMS } from '../lib/db'
import { fileToLogo } from '../lib/image'
import type { Branding, Settings } from '../lib/types'
import { Field } from './ui'

/** Letterhead preview exactly as it prints on reports and proposals. */
export function LetterheadPreview({ companyName, b }: { companyName: string; b: Branding }) {
  const color = readableBrand(b.color).hex
  const contact = [b.address, [b.phone, b.email].filter(Boolean).join(' · '), b.website, b.license && `License: ${b.license}`].filter(Boolean) as string[]
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 text-slate-900 dark:border-slate-700" style={{ borderBottom: `4px solid ${color}` }} aria-label="Letterhead preview">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {b.logo && <img src={b.logo} alt="" className="max-h-12 max-w-[140px] object-contain" />}
          <div><p className="font-extrabold" style={{ color }}>{companyName || 'Your company'}</p>{b.tagline && <p className="text-xs text-slate-600">{b.tagline}</p>}</div>
        </div>
        <p className="text-right text-[11px] leading-snug text-slate-600">{contact.map((c, i) => <span key={i}>{c}<br /></span>)}</p>
      </div>
    </div>
  )
}

export default function BrandingSettings({ s, setS }: { s: Settings; setS: (s: Settings) => void }) {
  const b = s.branding
  const [err, setErr] = useState('')
  const set = (patch: Partial<Branding>) => setS({ ...s, branding: { ...b, ...patch } })
  const adjusted = readableBrand(b.color).hex !== b.color.toLowerCase()
  return (
    <section className="card space-y-4">
      <div>
        <h2 className="font-bold">Your brand</h2>
        <p className="text-sm text-slate-500">Your logo, color and contact details appear on every report and proposal, and the app takes on your color.</p>
      </div>
      <LetterheadPreview companyName={s.companyName} b={b} />

      <div className="flex flex-wrap items-center gap-3">
        <label className="btn cursor-pointer"><ImagePlus size={18} /> {b.logo ? 'Replace logo' : 'Upload logo'}
          <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="sr-only" aria-label="Upload logo" onChange={async (e) => {
            const f = e.target.files?.[0]
            e.target.value = ''
            if (!f) return
            try { set({ logo: await fileToLogo(f, f.name) }); setErr('') } catch (x) { setErr((x as Error).message) }
          }} />
        </label>
        {b.logo && <button className="btn btn-ghost" onClick={() => set({ logo: '' })}><Trash2 size={16} /> Remove</button>}
        <span className="text-xs text-slate-500">PNG with a transparent background looks best.</span>
      </div>
      {err && <p role="alert" className="text-sm text-red-600">{err}</p>}

      <div>
        <span className="label">Brand color</span>
        <div className="flex flex-wrap items-center gap-2">
          {BRAND_SWATCHES.map((c) => <button key={c} aria-label={`Use ${c}`} onClick={() => set({ color: c })} className={`h-8 w-8 rounded-full border-2 ${b.color.toLowerCase() === c ? 'border-slate-900 ring-2 ring-slate-400 dark:border-white' : 'border-transparent'}`} style={{ background: c }} />)}
          <input type="color" aria-label="Custom brand color" value={/^#[0-9a-f]{6}$/i.test(b.color) ? b.color : '#2563eb'} onChange={(e) => set({ color: e.target.value })} className="h-8 w-10 cursor-pointer rounded border border-slate-300 bg-transparent" />
        </div>
        {adjusted && <p className="mt-1 text-xs text-slate-500">Slightly darkened to {readableBrand(b.color).hex} so white text stays readable.</p>}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Company name"><input className="input" value={s.companyName} onChange={(e) => setS({ ...s, companyName: e.target.value })} /></Field>
        <Field label="Tagline"><input className="input" value={b.tagline} onChange={(e) => set({ tagline: e.target.value })} placeholder="Licensed & insured" /></Field>
        <Field label="Phone"><input className="input" type="tel" value={b.phone} onChange={(e) => set({ phone: e.target.value })} /></Field>
        <Field label="Email"><input className="input" type="email" value={b.email} onChange={(e) => set({ email: e.target.value })} /></Field>
        <Field label="Website"><input className="input" value={b.website} onChange={(e) => set({ website: e.target.value })} /></Field>
        <Field label="License / certification no."><input className="input" value={b.license} onChange={(e) => set({ license: e.target.value })} /></Field>
      </div>
      <Field label="Business address"><input className="input" value={b.address} onChange={(e) => set({ address: e.target.value })} /></Field>
      <Field label="Terms printed on proposals">
        <textarea className="input min-h-24" value={b.terms} onChange={(e) => set({ terms: e.target.value })} placeholder="Payment terms, validity, change-order policy…" />
      </Field>
      <button className="btn" onClick={() => set({ terms: SAMPLE_TERMS })}>Insert sample terms</button>
      <Field label="Footer (every page of every document)"><textarea className="input min-h-16" value={b.footer} onChange={(e) => set({ footer: e.target.value })} placeholder="Thank you for your business!" /></Field>
    </section>
  )
}
