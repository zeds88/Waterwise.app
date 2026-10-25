/** Browser-only helpers for video: poster frame, duration, and evenly spaced frames for AI. */

export interface LoadedVideo { el: HTMLVideoElement; duration: number; width: number; height: number; dispose: () => void }

export function loadVideo(blob: Blob): Promise<LoadedVideo> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob)
    const el = document.createElement('video')
    el.muted = true
    el.playsInline = true
    el.preload = 'metadata'
    const dispose = () => URL.revokeObjectURL(url)
    el.onerror = () => { dispose(); reject(new Error('This video format cannot be read by your browser')) }
    el.onloadedmetadata = async () => {
      // MediaRecorder webm reports Infinity until the end is seeked
      if (!Number.isFinite(el.duration)) {
        await new Promise<void>((r) => { el.onseeked = () => r(); el.currentTime = 1e9 })
        el.onseeked = null
      }
      resolve({ el, duration: Number.isFinite(el.duration) ? el.duration : 0, width: el.videoWidth, height: el.videoHeight, dispose })
    }
    el.src = url
  })
}

function seek(el: HTMLVideoElement, t: number): Promise<void> {
  return new Promise((res) => {
    const done = () => { el.removeEventListener('seeked', done); res() }
    el.addEventListener('seeked', done)
    el.currentTime = t
  })
}

function grab(el: HTMLVideoElement, edge: number): HTMLCanvasElement {
  const scale = Math.min(1, edge / Math.max(el.videoWidth, el.videoHeight))
  const c = document.createElement('canvas')
  c.width = Math.max(1, Math.round(el.videoWidth * scale))
  c.height = Math.max(1, Math.round(el.videoHeight * scale))
  c.getContext('2d')!.drawImage(el, 0, 0, c.width, c.height)
  return c
}

export async function videoPoster(blob: Blob, edge = 420): Promise<{ thumb: Blob; duration: number; width: number; height: number }> {
  const v = await loadVideo(blob)
  try {
    await seek(v.el, Math.min(0.3, v.duration / 2))
    const c = grab(v.el, edge)
    const thumb = await new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('poster failed'))), 'image/jpeg', 0.7))
    return { thumb, duration: v.duration, width: v.width, height: v.height }
  } finally { v.dispose() }
}

export const fmtDuration = (s = 0) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

/** Evenly spaced JPEG frames (as data URLs) with timestamps, sized for vision models. */
export async function sampleFrames(blob: Blob, count = 6, edge = 1024): Promise<{ dataUrl: string; label: string }[]> {
  const v = await loadVideo(blob)
  try {
    const n = Math.max(1, Math.min(count, Math.ceil(v.duration) || 1))
    const out: { dataUrl: string; label: string }[] = []
    for (let i = 0; i < n; i++) {
      const t = v.duration * ((i + 0.5) / n)
      await seek(v.el, t)
      out.push({ dataUrl: grab(v.el, edge).toDataURL('image/jpeg', 0.8), label: `${fmtDuration(t)}` })
    }
    return out
  } finally { v.dispose() }
}
