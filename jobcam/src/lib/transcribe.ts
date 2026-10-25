import { encodeWav, extractAudio, hasSound, SAMPLE_RATE } from './audio'
import type { Transcript, TranscriptChunk, TranscriptionSettings } from './types'

export const LOCAL_MODELS = [
  { id: 'Xenova/whisper-tiny.en', label: 'Tiny – English (≈40 MB, fastest)' },
  { id: 'Xenova/whisper-base.en', label: 'Base – English (≈75 MB, more accurate)' },
  { id: 'Xenova/whisper-tiny', label: 'Tiny – multilingual incl. Spanish (≈40 MB)' },
  { id: 'Xenova/whisper-base', label: 'Base – multilingual incl. Spanish (≈75 MB)' },
]

export type Progress = (message: string) => void

const NOISE = /\[[^\]]*\]|\([^)]*\)|♪+/g // "[BLANK_AUDIO]", "(music)", "♪"
export const cleanText = (t: string) => t.replace(NOISE, ' ').replace(/\s+/g, ' ').trim()

/** Normalise Whisper-style output ({text, chunks:[{timestamp:[s,e|null], text}]}) into our Transcript. */
export function normalizeWhisper(raw: { text?: string; chunks?: { timestamp: [number, number | null]; text: string }[] }, engine: Transcript['engine'], model: string, duration = 0): Transcript {
  const chunks: TranscriptChunk[] = (raw.chunks ?? [])
    .map((c) => ({ start: c.timestamp?.[0] ?? 0, end: c.timestamp?.[1] ?? c.timestamp?.[0] ?? duration, text: cleanText(c.text ?? '') }))
    .filter((c) => c.text)
  const text = chunks.length ? chunks.map((c) => c.text).join(' ') : cleanText(raw.text ?? '')
  if (!text) throw new Error('No speech detected in this video.')
  return { at: Date.now(), engine, model, text, chunks }
}

/** Whisper → verbose_json style from OpenAI-compatible APIs. */
export function normalizeApi(raw: { text?: string; segments?: { start: number; end: number; text: string }[] }, model: string): Transcript {
  return normalizeWhisper({ text: raw.text, chunks: raw.segments?.map((s) => ({ timestamp: [s.start, s.end], text: s.text })) }, 'api', model)
}

// ── engines ────────────────────────────────────────────────
type Asr = (audio: Float32Array, opts: Record<string, unknown>) => Promise<{ text?: string; chunks?: { timestamp: [number, number | null]; text: string }[] }>
const cache = new Map<string, Promise<Asr>>()

/** Lazily loads transformers.js (separate chunk) and the model; the browser caches model files after first use. */
async function loadLocal(model: string, onProgress?: Progress): Promise<Asr> {
  if (!cache.has(model)) {
    cache.set(model, (async () => {
      const { pipeline } = await import('@huggingface/transformers')
      let last = ''
      return (await pipeline('automatic-speech-recognition', model, {
        device: 'wasm',
        dtype: 'q8',
        progress_callback: (p: { status?: string; file?: string; progress?: number }) => {
          if (p.status === 'progress' && typeof p.progress === 'number') {
            const msg = `Downloading speech model… ${Math.round(p.progress)}%`
            if (msg !== last) { last = msg; onProgress?.(msg) }
          }
        },
      })) as unknown as Asr
    })().catch((e) => { cache.delete(model); throw e }))
  }
  return cache.get(model)!
}

export interface Deps {
  loadLocal?: typeof loadLocal
  fetcher?: typeof fetch
}

/** Transcribe already-decoded 16 kHz mono samples. Exported for tests; the UI uses transcribeVideo. */
export async function transcribeSamples(samples: Float32Array, cfg: TranscriptionSettings, onProgress?: Progress, deps: Deps = {}): Promise<Transcript> {
  if (cfg.engine === 'off') throw new Error('Transcription is turned off in Settings.')
  if (!hasSound(samples)) throw new Error('No speech detected in this video.')
  const duration = samples.length / SAMPLE_RATE

  if (cfg.engine === 'api') {
    if (!cfg.endpoint) throw new Error('Set a transcription endpoint in Settings.')
    onProgress?.('Uploading audio for transcription…')
    const form = new FormData()
    form.append('file', new Blob([encodeWav(samples)], { type: 'audio/wav' }), 'narration.wav')
    form.append('model', cfg.apiModel || 'whisper-1')
    form.append('response_format', 'verbose_json')
    const res = await (deps.fetcher ?? fetch)(cfg.endpoint, { method: 'POST', headers: cfg.apiKey ? { Authorization: `Bearer ${cfg.apiKey}` } : {}, body: form })
    if (!res.ok) throw new Error(`Transcription request failed (${res.status}): ${(await res.text().catch(() => '')).slice(0, 160)}`)
    const t = normalizeApi(await res.json(), cfg.apiModel || 'whisper-1')
    return { ...t, chunks: t.chunks.map((c) => ({ ...c, end: Math.min(c.end, duration) })) }
  }

  onProgress?.('Loading speech model…')
  let asr: Asr
  try {
    asr = await (deps.loadLocal ?? loadLocal)(cfg.localModel, onProgress)
  } catch (e) {
    throw new Error(`Couldn’t load the speech model (${cfg.localModel}). The first use needs an internet connection to download it once. Details: ${(e as Error).message}`)
  }
  onProgress?.('Transcribing on this device…')
  const out = await asr(samples, { chunk_length_s: 30, stride_length_s: 5, return_timestamps: true, task: 'transcribe' })
  return normalizeWhisper(out, 'local', cfg.localModel, duration)
}

export async function transcribeVideo(blob: Blob, cfg: TranscriptionSettings, onProgress?: Progress, deps?: Deps): Promise<Transcript> {
  if (cfg.engine === 'off') throw new Error('Transcription is turned off in Settings.')
  onProgress?.('Reading the video’s audio…')
  return transcribeSamples(await extractAudio(blob), cfg, onProgress, deps)
}

/** "[0:12] text" lines, for prompts and reports. */
export function formatTranscript(t: Transcript, limit = 6000): string {
  const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
  const body = t.chunks.length ? t.chunks.map((c) => `[${mmss(c.start)}] ${c.text}`).join('\n') : t.text
  return body.length > limit ? body.slice(0, limit) + '\n[…truncated]' : body
}
