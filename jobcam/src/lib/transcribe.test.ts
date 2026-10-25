import { describe, expect, it } from 'vitest'
import { encodeWav, hasSound, rms } from './audio'
import { cleanText, formatTranscript, normalizeApi, normalizeWhisper, transcribeSamples } from './transcribe'
import { DEFAULT_SETTINGS } from './db'
import type { TranscriptionSettings } from './types'

const tone = (sec: number, amp = 0.3) => Float32Array.from({ length: Math.round(16000 * sec) }, (_, i) => amp * Math.sin(i / 8))
const local: TranscriptionSettings = { ...DEFAULT_SETTINGS.transcription, engine: 'local' }
const api: TranscriptionSettings = { ...DEFAULT_SETTINGS.transcription, engine: 'api', apiKey: 'k' }

describe('audio', () => {
  it('encodes a valid 16-bit mono 16 kHz WAV', () => {
    const wav = encodeWav(Float32Array.from([0, 1, -1, 2]))
    const v = new DataView(wav)
    expect(wav.byteLength).toBe(44 + 8)
    expect(String.fromCharCode(v.getUint8(0), v.getUint8(1), v.getUint8(2), v.getUint8(3))).toBe('RIFF')
    expect(v.getUint32(24, true)).toBe(16000)
    expect(v.getUint16(22, true)).toBe(1)
    expect(v.getInt16(46, true)).toBe(32767)   // +1.0
    expect(v.getInt16(48, true)).toBe(-32768)  // -1.0
    expect(v.getInt16(50, true)).toBe(32767)   // clipped 2.0
  })
  it('detects silence', () => {
    expect(hasSound(new Float32Array(16000))).toBe(false)
    expect(hasSound(tone(1))).toBe(true)
    expect(rms(new Float32Array(0))).toBe(0)
  })
})

describe('normalize', () => {
  it('strips Whisper noise tokens and handles open-ended timestamps', () => {
    expect(cleanText(' [BLANK_AUDIO] hello (music) world ♪ ')).toBe('hello world')
    const t = normalizeWhisper({ chunks: [{ timestamp: [0, 3], text: ' Front yard has three broken heads.' }, { timestamp: [3, null], text: ' [BLANK_AUDIO]' }, { timestamp: [4, null], text: ' Zone four valve is leaking' }] }, 'local', 'm', 9)
    expect(t.chunks).toEqual([{ start: 0, end: 3, text: 'Front yard has three broken heads.' }, { start: 4, end: 4, text: 'Zone four valve is leaking' }])
    expect(t.text).toBe('Front yard has three broken heads. Zone four valve is leaking')
  })
  it('refuses empty / noise-only output instead of inventing a transcript', () => {
    expect(() => normalizeWhisper({ text: '[BLANK_AUDIO]' }, 'local', 'm')).toThrow('No speech')
  })
  it('maps API segments', () => {
    const t = normalizeApi({ text: 'x', segments: [{ start: 1, end: 2.5, text: ' hi there ' }] }, 'whisper-1')
    expect(t).toMatchObject({ engine: 'api', model: 'whisper-1', chunks: [{ start: 1, end: 2.5, text: 'hi there' }] })
  })
  it('formats timestamped lines and truncates long text', () => {
    const t = normalizeWhisper({ chunks: [{ timestamp: [75, 80], text: 'valve leaking' }] }, 'local', 'm')
    expect(formatTranscript(t)).toBe('[1:15] valve leaking')
    expect(formatTranscript(t, 5)).toContain('[…truncated]')
  })
})

describe('transcribeSamples', () => {
  it('runs the local engine with timestamps and reports progress', async () => {
    const seen: string[] = []
    let opts: any, loaded = ''
    const t = await transcribeSamples(tone(2), local, (m) => seen.push(m), {
      loadLocal: async (model) => { loaded = model; return async (_a, o) => { opts = o; return { chunks: [{ timestamp: [0, 2], text: ' Replace the controller.' }] } } },
    })
    expect(loaded).toBe('Xenova/whisper-tiny.en')
    expect(opts).toMatchObject({ return_timestamps: true, chunk_length_s: 30 })
    expect(t.text).toBe('Replace the controller.')
    expect(seen).toEqual(['Loading speech model…', 'Transcribing on this device…'])
  })
  it('never calls a model for silent audio', async () => {
    let called = false
    await expect(transcribeSamples(new Float32Array(32000), local, undefined, { loadLocal: async () => { called = true; return async () => ({}) } })).rejects.toThrow('No speech')
    expect(called).toBe(false)
  })
  it('uploads WAV to an OpenAI-compatible endpoint', async () => {
    let url = '', auth = '', form: FormData | undefined
    const fetcher = (async (u: string, init: RequestInit) => {
      url = u; auth = (init.headers as Record<string, string>).Authorization; form = init.body as FormData
      return new Response(JSON.stringify({ text: 'hi', segments: [{ start: 0, end: 1.5, text: ' Valve is leaking ' }] }), { status: 200 })
    }) as unknown as typeof fetch
    const t = await transcribeSamples(tone(2), api, undefined, { fetcher })
    expect(url).toBe('https://api.openai.com/v1/audio/transcriptions')
    expect(auth).toBe('Bearer k')
    expect(form!.get('response_format')).toBe('verbose_json')
    const file = form!.get('file') as File
    expect(file.type).toBe('audio/wav')
    expect(file.size).toBe(44 + 32000 * 2)
    expect(t.chunks[0].text).toBe('Valve is leaking')
  })
  it('surfaces API errors and the off switch', async () => {
    const bad = (async () => new Response('nope', { status: 401 })) as unknown as typeof fetch
    await expect(transcribeSamples(tone(1), api, undefined, { fetcher: bad })).rejects.toThrow('401')
    await expect(transcribeSamples(tone(1), { ...local, engine: 'off' })).rejects.toThrow('turned off')
  })
  it('does not cache a failed model load as success', async () => {
    let n = 0
    const loadLocal = async () => { n++; if (n === 1) throw new Error('offline'); return async () => ({ text: 'ok' }) }
    await expect(transcribeSamples(tone(1), local, undefined, { loadLocal })).rejects.toThrow(/Couldn’t load the speech model.*offline/)
    expect((await transcribeSamples(tone(1), local, undefined, { loadLocal })).text).toBe('ok')
  })
})
