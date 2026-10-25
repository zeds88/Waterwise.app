import type { Photo } from './types'
import { drawShapes } from './annotate'
import { decodeImage } from './decode'

const MAX_EDGE = 2560
const THUMB_EDGE = 420

function fit(w: number, h: number, edge: number): [number, number] {
  const scale = Math.min(1, edge / Math.max(w, h))
  return [Math.max(1, Math.round(w * scale)), Math.max(1, Math.round(h * scale))]
}

function canvasToBlob(c: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('Could not encode the image (the device may be low on memory).'))), 'image/jpeg', quality))
}

function render(src: CanvasImageSource, sw: number, sh: number, edge: number, quality: number): Promise<Blob> {
  const [w, h] = fit(sw, sh, edge)
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  c.getContext('2d')!.drawImage(src, 0, 0, w, h)
  return canvasToBlob(c, quality)
}

/** Downscale a camera frame / picked file into a stored photo plus thumbnail. */
export async function processImage(source: Blob) {
  const img = await decodeImage(source)
  try {
    const [width, height] = fit(img.width, img.height, MAX_EDGE)
    const blob = await render(img.source, img.width, img.height, MAX_EDGE, 0.86)
    const thumb = await render(img.source, img.width, img.height, THUMB_EDGE, 0.7)
    return { blob, thumb, width, height }
  } finally { img.dispose() }
}

/** Burn annotations into the pixels (for export / reports). Original is never modified. */
export async function flattenPhoto(photo: Photo, edge = MAX_EDGE): Promise<Blob> {
  if (photo.annotations.length === 0 && Math.max(photo.width, photo.height) <= edge) return photo.blob
  const img = await decodeImage(photo.blob)
  try {
    const [w, h] = fit(img.width, img.height, edge)
    const c = document.createElement('canvas')
    c.width = w
    c.height = h
    const ctx = c.getContext('2d')!
    ctx.drawImage(img.source, 0, 0, w, h)
    drawShapes(ctx, w, h, photo.annotations)
    return await canvasToBlob(c, 0.85)
  } finally { img.dispose() }
}

// ── location ──────────────────────────────────────────────
// Geolocation can wait indefinitely on a permission prompt, so it must never block saving a photo.
let lastPosition: { pos: GeolocationPosition; at: number } | null = null

/** Ask once (e.g. when the camera opens) so the prompt is answered before the first shot. */
export function warmPosition(): void {
  if (!('geolocation' in navigator)) return
  navigator.geolocation.getCurrentPosition((pos) => { lastPosition = { pos, at: Date.now() } }, () => {}, { enableHighAccuracy: true, timeout: 20_000, maximumAge: 60_000 })
}

export async function getPosition(maxWaitMs = 1500): Promise<GeolocationPosition | null> {
  if (lastPosition && Date.now() - lastPosition.at < 120_000) return lastPosition.pos
  if (!('geolocation' in navigator)) return null
  return new Promise((res) => {
    const t = setTimeout(() => res(lastPosition?.pos ?? null), maxWaitMs)
    navigator.geolocation.getCurrentPosition(
      (pos) => { lastPosition = { pos, at: Date.now() }; clearTimeout(t); res(pos) },
      () => { clearTimeout(t); res(null) },
      { enableHighAccuracy: true, timeout: maxWaitMs, maximumAge: 120_000 },
    )
  })
}

/** Downscaled JPEG data URL of the *unmarked* image, sized for vision models. */
export async function toModelDataUrl(blob: Blob, edge = 1280): Promise<string> {
  const img = await decodeImage(blob)
  try {
    const [w, h] = fit(img.width, img.height, edge)
    const c = document.createElement('canvas')
    c.width = w
    c.height = h
    c.getContext('2d')!.drawImage(img.source, 0, 0, w, h)
    return c.toDataURL('image/jpeg', 0.8)
  } finally { img.dispose() }
}
