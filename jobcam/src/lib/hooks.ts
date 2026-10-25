import { useCallback, useEffect, useRef, useState } from 'react'

/** Load async data; returns [data, reload]. */
export function useLoad<T>(fn: () => Promise<T>, deps: unknown[]): [T | undefined, () => void] {
  const [data, setData] = useState<T>()
  const [tick, setTick] = useState(0)
  useEffect(() => {
    let live = true
    fn().then((d) => live && setData(d))
    return () => { live = false }
    // eslint-disable-next-line
  }, [...deps, tick])
  return [data, useCallback(() => setTick((t) => t + 1), [])]
}

export function useObjectUrl(blob?: Blob): string | undefined {
  const [url, setUrl] = useState<string>()
  useEffect(() => {
    if (!blob) { setUrl(undefined); return }
    const u = URL.createObjectURL(blob)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [blob])
  return url
}

interface RecognitionLike {
  continuous: boolean; interimResults: boolean; lang: string
  start(): void; stop(): void
  onresult: ((e: any) => void) | null; onend: (() => void) | null; onerror: ((e: any) => void) | null
}

/** Speech-to-text via the browser's Web Speech API (feature-detected). */
export function useDictation(onFinal: (text: string) => void) {
  const Ctor = (globalThis as any).SpeechRecognition ?? (globalThis as any).webkitSpeechRecognition
  const rec = useRef<RecognitionLike | null>(null)
  const cb = useRef(onFinal)
  cb.current = onFinal
  const [listening, setListening] = useState(false)
  const [interim, setInterim] = useState('')
  const [error, setError] = useState('')

  const stop = useCallback(() => rec.current?.stop(), [])
  const start = useCallback(() => {
    if (!Ctor || rec.current) return
    const r: RecognitionLike = new Ctor()
    r.continuous = true
    r.interimResults = true
    r.lang = navigator.language || 'en-US'
    r.onresult = (e) => {
      let live = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i]
        if (res.isFinal) cb.current(res[0].transcript.trim())
        else live += res[0].transcript
      }
      setInterim(live)
    }
    r.onerror = (e) => setError(e?.error ?? 'speech error')
    r.onend = () => { rec.current = null; setListening(false); setInterim('') }
    rec.current = r
    setError('')
    setListening(true)
    r.start()
  }, [Ctor])

  useEffect(() => () => rec.current?.stop(), [])
  return { supported: Boolean(Ctor), listening, interim, error, start, stop }
}
