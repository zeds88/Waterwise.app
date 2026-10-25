/** Audio helpers: pull the soundtrack out of a video as 16 kHz mono (what Whisper expects). */

export const SAMPLE_RATE = 16000
export const MAX_VIDEO_BYTES = 400 * 1024 * 1024

/** RMS loudness 0..1. Used to skip near-silent audio, which makes Whisper hallucinate text. */
export function rms(samples: Float32Array): number {
  if (!samples.length) return 0
  let sum = 0
  for (let i = 0; i < samples.length; i++) sum += samples[i] * samples[i]
  return Math.sqrt(sum / samples.length)
}
export const hasSound = (samples: Float32Array) => rms(samples) > 0.003

/** 16-bit PCM mono WAV, for transcription APIs that want a file upload. */
export function encodeWav(samples: Float32Array, sampleRate = SAMPLE_RATE): ArrayBuffer {
  const buf = new ArrayBuffer(44 + samples.length * 2)
  const v = new DataView(buf)
  const str = (o: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)) }
  str(0, 'RIFF'); v.setUint32(4, 36 + samples.length * 2, true); str(8, 'WAVE'); str(12, 'fmt ')
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true)
  v.setUint32(24, sampleRate, true); v.setUint32(28, sampleRate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true)
  str(36, 'data'); v.setUint32(40, samples.length * 2, true)
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true)
  }
  return buf
}

/** Decode a video/audio file's soundtrack to mono 16 kHz floats. Browser only. */
export async function extractAudio(blob: Blob): Promise<Float32Array> {
  if (blob.size > MAX_VIDEO_BYTES) throw new Error('This video is too large to transcribe in the browser (over 400 MB).')
  const Ctx: typeof AudioContext = (globalThis as any).AudioContext ?? (globalThis as any).webkitAudioContext
  if (!Ctx) throw new Error('This browser cannot decode audio.')
  const ctx = new Ctx()
  try {
    let decoded: AudioBuffer
    try {
      decoded = await ctx.decodeAudioData(await blob.arrayBuffer())
    } catch {
      throw new Error('No readable audio track in this video.')
    }
    const frames = Math.max(1, Math.ceil(decoded.duration * SAMPLE_RATE))
    const off = new OfflineAudioContext(1, frames, SAMPLE_RATE)
    const src = off.createBufferSource()
    src.buffer = decoded
    src.connect(off.destination) // channel layout is down-mixed to mono by the destination
    src.start()
    return (await off.startRendering()).getChannelData(0).slice()
  } finally {
    void ctx.close()
  }
}
