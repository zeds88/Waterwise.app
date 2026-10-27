import { put, get, remove } from './db'
import { decodeImage } from './decode'

export interface Check { name: string; ok: boolean; detail: string }

const run = async (name: string, fn: () => Promise<string>): Promise<Check> => {
  try { return { name, ok: true, detail: await fn() } } catch (e) { return { name, ok: false, detail: (e as Error)?.message || String(e) } }
}

/** Quick self-test of everything photo/video import depends on, so a failure names its cause. */
export async function diagnose(): Promise<Check[]> {
  const checks: Check[] = []
  checks.push(await run('Browser storage', async () => {
    if (!('indexedDB' in globalThis)) throw new Error('IndexedDB is unavailable (private mode or an in-app browser?)')
    return 'available'
  }))
  checks.push(await run('Save a photo to the device', async () => {
    const blob = await new Promise<Blob>((res, rej) => {
      const c = document.createElement('canvas'); c.width = c.height = 8
      c.getContext('2d')!.fillRect(0, 0, 8, 8)
      c.toBlob((b) => (b ? res(b) : rej(new Error('Canvas could not make an image'))), 'image/jpeg')
    })
    await put('meta', { key: 'diag', blob })
    const back = await get<{ blob: Blob }>('meta', 'diag')
    await remove('meta', 'diag')
    if (!back?.blob || back.blob.size !== blob.size) throw new Error('Photo data was not stored')
    return `ok (${blob.size} bytes)`
  }))
  checks.push(await run('Read an image', async () => {
    const c = document.createElement('canvas'); c.width = c.height = 4
    c.getContext('2d')!.fillRect(0, 0, 4, 4)
    const b = await new Promise<Blob>((res, rej) => c.toBlob((x) => (x ? res(x) : rej(new Error('toBlob failed'))), 'image/png'))
    const d = await decodeImage(b, 'test'); d.dispose()
    return 'ok'
  }))
  checks.push(await run('Video playback', async () => {
    const v = document.createElement('video')
    const yes = (t: string) => v.canPlayType(t) !== ''
    return `mp4 ${yes('video/mp4') ? 'yes' : 'no'}, webm ${yes('video/webm') ? 'yes' : 'no'}, mov ${yes('video/quicktime') ? 'yes' : 'no'}`
  }))
  checks.push(await run('Storage space', async () => {
    const e = await navigator.storage?.estimate?.()
    if (!e?.quota) return 'unknown'
    return `${Math.round((e.usage ?? 0) / 1e6)} MB used of ${Math.round(e.quota / 1e6)} MB`
  }))
  return checks
}
