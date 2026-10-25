import { STORES, getAll, put, type StoreName } from './db'
import { blobToDataUrl, dataUrlToBlob } from './blob'
import type { Photo } from './types'

/** Full-fidelity JSON backup. Photos are inlined as data URLs so the file is portable. */
export async function exportAll(): Promise<string> {
  const out: Record<string, unknown[]> = {}
  for (const store of STORES) {
    const rows = await getAll<Record<string, unknown>>(store)
    out[store] =
      store === 'photos'
        ? await Promise.all(
            (rows as unknown as Photo[]).map(async (p) => ({
              ...p,
              blob: await blobToDataUrl(p.blob),
              thumb: await blobToDataUrl(p.thumb),
            })),
          )
        : rows
  }
  return JSON.stringify({ app: 'jobcam', version: 1, exportedAt: Date.now(), data: out })
}

export async function importAll(json: string): Promise<Record<string, number>> {
  const parsed = JSON.parse(json)
  if (parsed?.app !== 'jobcam' || typeof parsed.data !== 'object') throw new Error('Not a JobCam backup file')
  const counts: Record<string, number> = {}
  for (const store of STORES as readonly StoreName[]) {
    const rows: Record<string, unknown>[] = parsed.data[store] ?? []
    for (const row of rows) {
      if (store === 'photos') {
        row.blob = dataUrlToBlob(row.blob as string)
        row.thumb = dataUrlToBlob(row.thumb as string)
      }
      await put(store, row)
    }
    counts[store] = rows.length
  }
  return counts
}
