import { MediaError } from './decode'

/** Browser-only helpers for video: poster frame, duration, and evenly spaced frames for AI. */

export interface LoadedVideo {
  el: HTMLVideoElement
  duration: number
  width: number
  height: number
  /** false when the browser can read the file's metadata but cannot decode its picture (e.g. iPhone HEVC in Chrome) */
  hasFrame: boolean
  dispose: () => void
}

export const UNPLAYABLE =
  'This browser can’t decode this video’s picture (common for iPhone HEVC .mov files outside Safari). The file is saved and you can download the original; to view it here, record with iPhone Settings → Camera → Formats → Most Compatible, or open JobCam in Safari.'

/**
 * Resolves as soon as we know something useful, and never hangs: iOS Safari won't fetch video data for
 * a detached element until it is played, so after metadata we only give the first frame a short grace period.
 */
export function loadVideo(blob: Blob): Promise<LoadedVideo> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob)
    const el = document.createElement('video')
    el.muted = true
    el.playsInline = true
    el.setAttribute('playsinline', '')
    el.setAttribute('webkit-playsinline', '')
    el.preload = 'auto'
    const dispose = () => URL.revokeObjectURL(url)
    let settled = false
    let grace: ReturnType<typeof setTimeout> | undefined
    const done = async (hasFrame: boolean) => {
      if (settled) return
      settled = true
      clearTimeout(hard); clearTimeout(grace)
      if (!Number.isFinite(el.duration) && hasFrame) {
        // MediaRecorder webm reports Infinity until the end is seeked
        await Promise.race([new Promise<void>((r) => { el.onseeked = () => r(); el.currentTime = 1e9 }), new Promise<void>((r) => setTimeout(r, 2000))])
      }
      resolve({ el, duration: Number.isFinite(el.duration) ? el.duration : 0, width: el.videoWidth, height: el.videoHeight, hasFrame: hasFrame && el.videoWidth > 0, dispose })
    }
    const fail = () => { if (!settled) { settled = true; clearTimeout(hard); clearTimeout(grace); dispose(); reject(new MediaError(UNPLAYABLE)) } }
    const hard = setTimeout(() => (el.readyState >= 1 ? void done(false) : fail()), 12_000)
    el.onerror = fail
    el.onloadedmetadata = () => { grace = setTimeout(() => void done(false), 3000) }
    el.onloadeddata = () => void done(true)
    el.src = url
    el.load()
  })
}

function seek(el: HTMLVideoElement, t: number): Promise<void> {
  return new Promise((res) => {
    const timer = setTimeout(done, 2500) // some browsers never fire "seeked"; draw what we have
    function done() { clearTimeout(timer); el.removeEventListener('seeked', done); res() }
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

const toJpeg = (c: HTMLCanvasElement, q: number) => new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('poster failed'))), 'image/jpeg', q))

/** Dark tile with a play triangle, used when no real frame can be read. */
export async function placeholderPoster(w = 420, h = 236): Promise<Blob> {
  const c = document.createElement('canvas')
  c.width = w; c.height = h
  const g = c.getContext('2d')!
  g.fillStyle = '#0f172a'; g.fillRect(0, 0, w, h)
  g.fillStyle = 'rgba(255,255,255,.85)'
  g.beginPath(); g.moveTo(w / 2 - 22, h / 2 - 30); g.lineTo(w / 2 + 34, h / 2); g.lineTo(w / 2 - 22, h / 2 + 30); g.closePath(); g.fill()
  return toJpeg(c, 0.8)
}

/** Never throws: an unreadable video is still stored (so the user keeps it) with a placeholder poster. */
export async function videoPoster(blob: Blob, edge = 420): Promise<{ thumb: Blob; duration: number; width: number; height: number; decodable: boolean }> {
  let v: LoadedVideo | undefined
  try {
    v = await loadVideo(blob)
    if (!v.hasFrame) return { thumb: await placeholderPoster(), duration: v.duration, width: 1280, height: 720, decodable: false }
    await seek(v.el, Math.min(0.3, v.duration / 2))
    return { thumb: await toJpeg(grab(v.el, edge), 0.7), duration: v.duration, width: v.width, height: v.height, decodable: true }
  } catch {
    return { thumb: await placeholderPoster(), duration: v?.duration ?? 0, width: 1280, height: 720, decodable: false }
  } finally { v?.dispose() }
}

export const fmtDuration = (s = 0) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

/** Evenly spaced JPEG frames (as data URLs) with timestamps, sized for vision models. */
export async function sampleFrames(blob: Blob, count = 6, edge = 1024): Promise<{ dataUrl: string; label: string }[]> {
  const v = await loadVideo(blob)
  try {
    if (!v.hasFrame) throw new MediaError(UNPLAYABLE)
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
