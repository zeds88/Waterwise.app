/** Brand colour handling: keep any chosen colour readable with white text, and expose it to CSS. */

export const BRAND_SWATCHES = ['#2563eb', '#0f766e', '#15803d', '#b45309', '#c2410c', '#b91c1c', '#7e22ce', '#334155']

export function parseHex(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return null
  let h = m[1]
  if (h.length === 3) h = [...h].map((c) => c + c).join('')
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number]
}

const toHex = (rgb: number[]) => '#' + rgb.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')

/** WCAG relative luminance */
export function luminance([r, g, b]: [number, number, number]): number {
  const f = (v: number) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4 }
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}

/** Contrast ratio against white text. */
export const contrastOnWhite = (rgb: [number, number, number]) => 1.05 / (luminance(rgb) + 0.05)

/** Darken a colour (never hue-shift) until white text on it reaches WCAG AA (4.5:1). Invalid input -> default blue. */
export function readableBrand(hex: string): { hex: string; rgb: [number, number, number] } {
  let rgb = parseHex(hex) ?? [37, 99, 235]
  for (let i = 0; i < 40 && contrastOnWhite(rgb) < 4.5; i++) rgb = rgb.map((v) => v * 0.93) as [number, number, number]
  return { hex: toHex(rgb), rgb }
}

/** Apply to the running app (Tailwind's `brand` colour reads --brand). */
export function applyBrand(hex: string): void {
  const { rgb } = readableBrand(hex)
  document.documentElement.style.setProperty('--brand', rgb.map(Math.round).join(' '))
}
