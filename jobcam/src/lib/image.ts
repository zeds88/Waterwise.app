import type { Photo } from './types'
import { drawShapes } from './annotate'

const MAX_EDGE = 2560
const THUMB_EDGE = 420

function fit(w: number, h: number, edge: number): [number, number] {
  const scale = Math.min(1, edge / Math.max(w, h))
  return [Math.round(w * scale), Math.round(h * scale)]
}

function canvasToBlob(c: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('toBlob failed'))), 'image/jpeg', quality))
}

async function render(bitmap: ImageBitmap, edge: number, quality: number): Promise<Blob> {
  const [w, h] = fit(bitmap.width, bitmap.height, edge)
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  c.getContext('2d')!.drawImage(bitmap, 0, 0, w, h)
  return canvasToBlob(c, quality)
}

/** Downscale a camera frame / picked file into a stored photo plus thumbnail. */
export async function processImage(source: Blob) {
  const bitmap = await createImageBitmap(source, { imageOrientation: 'from-image' })
  const [width, height] = fit(bitmap.width, bitmap.height, MAX_EDGE)
  const [blob, thumb] = await Promise.all([render(bitmap, MAX_EDGE, 0.86), render(bitmap, THUMB_EDGE, 0.7)])
  bitmap.close()
  return { blob, thumb, width, height }
}

/** Burn annotations into the pixels (for export / reports). Original is never modified. */
export async function flattenPhoto(photo: Photo, edge = MAX_EDGE): Promise<Blob> {
  if (photo.annotations.length === 0 && Math.max(photo.width, photo.height) <= edge) return photo.blob
  const bitmap = await createImageBitmap(photo.blob)
  const [w, h] = fit(bitmap.width, bitmap.height, edge)
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')!
  ctx.drawImage(bitmap, 0, 0, w, h)
  drawShapes(ctx, w, h, photo.annotations)
  bitmap.close()
  return canvasToBlob(c, 0.85)
}

export function getPosition(): Promise<GeolocationPosition | null> {
  if (!('geolocation' in navigator)) return Promise.resolve(null)
  return new Promise((res) =>
    navigator.geolocation.getCurrentPosition(res, () => res(null), { enableHighAccuracy: true, timeout: 6000, maximumAge: 30000 }),
  )
}
