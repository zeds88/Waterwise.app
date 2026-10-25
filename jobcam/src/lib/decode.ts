/** Robust image decoding across browsers (EXIF rotation, big phone photos, odd formats). */

export interface Decoded {
  source: CanvasImageSource
  width: number
  height: number
  dispose: () => void
}

export class MediaError extends Error {}

const withTimeout = <T,>(p: Promise<T>, ms: number): Promise<T> =>
  new Promise((res, rej) => {
    const t = setTimeout(() => rej(new Error('timed out')), ms)
    p.then((v) => { clearTimeout(t); res(v) }, (e) => { clearTimeout(t); rej(e) })
  })

function viaImg(blob: Blob): Promise<Decoded> {
  return withTimeout(
    new Promise<Decoded>((resolve, reject) => {
      const url = URL.createObjectURL(blob)
      const img = new Image()
      img.decoding = 'async'
      img.onload = () => resolve({ source: img, width: img.naturalWidth, height: img.naturalHeight, dispose: () => URL.revokeObjectURL(url) })
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('decode failed')) }
      img.src = url
    }),
    30_000,
  )
}

export function friendlyImageError(name: string, type: string): string {
  const heic = /hei[cf]/i.test(type) || /\.hei[cf]$/i.test(name)
  return heic
    ? `“${name}” is a HEIC photo, which this browser can’t open. Open JobCam in Safari on iPhone, or switch the phone to Settings → Camera → Formats → Most Compatible (or share the photo as JPEG).`
    : `“${name}” couldn’t be read as an image${type ? ` (${type})` : ''}. Try a JPEG or PNG.`
}

/**
 * <img> first: every browser applies the photo's EXIF rotation when drawing it, and it reads
 * whatever formats the browser can display. createImageBitmap is the fallback.
 */
export async function decodeImage(blob: Blob, name = 'this file'): Promise<Decoded> {
  try {
    const d = await viaImg(blob)
    if (d.width > 0 && d.height > 0) return d
    d.dispose()
  } catch { /* fall through */ }
  try {
    const bm = await createImageBitmap(blob)
    return { source: bm, width: bm.width, height: bm.height, dispose: () => bm.close() }
  } catch { /* fall through */ }
  throw new MediaError(friendlyImageError((blob as File).name || name, blob.type))
}
