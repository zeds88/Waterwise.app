import type { Branding, Checklist, Comment, Estimate, Photo, Project, ScopeDoc, Settings } from './types'
import { uid } from './id'

/**
 * Tiny promise wrapper over IndexedDB. Everything lives on the device;
 * nothing is uploaded unless the user exports or configures sync themselves.
 */
const DB_NAME = 'jobcam'
const DB_VERSION = 2 // v2 adds the 'scopes' store; existing data is untouched

export const STORES = ['projects', 'photos', 'checklists', 'comments', 'estimates', 'scopes', 'meta'] as const
export type StoreName = (typeof STORES)[number]
const BY_PROJECT: StoreName[] = ['photos', 'checklists', 'comments', 'estimates', 'scopes']

let dbPromise: Promise<IDBDatabase> | null = null

export function openDb(): Promise<IDBDatabase> {
  dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      const tx = req.transaction!
      for (const name of STORES) {
        // create only what's missing, so upgrading never touches existing stores
        const store = db.objectStoreNames.contains(name) ? tx.objectStore(name) : db.createObjectStore(name, { keyPath: name === 'meta' ? 'key' : 'id' })
        if (BY_PROJECT.includes(name) && !store.indexNames.contains('projectId')) store.createIndex('projectId', 'projectId')
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return dbPromise
}

/** Test helper: drop the cached connection and database. */
export async function resetDb(): Promise<void> {
  if (dbPromise) (await dbPromise).close()
  dbPromise = null
  await new Promise<void>((res, rej) => {
    const r = indexedDB.deleteDatabase(DB_NAME)
    r.onsuccess = () => res()
    r.onerror = () => rej(r.error)
  })
}

function wrap<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((res, rej) => {
    req.onsuccess = () => res(req.result)
    req.onerror = () => rej(req.error)
  })
}

async function tx(store: StoreName, mode: IDBTransactionMode) {
  const db = await openDb()
  return db.transaction(store, mode).objectStore(store)
}

export const put = async <T>(store: StoreName, value: T): Promise<T> => {
  await wrap((await tx(store, 'readwrite')).put(value))
  return value
}
export const get = async <T>(store: StoreName, id: string): Promise<T | undefined> =>
  wrap((await tx(store, 'readonly')).get(id)) as Promise<T | undefined>
export const getAll = async <T>(store: StoreName): Promise<T[]> =>
  wrap((await tx(store, 'readonly')).getAll()) as Promise<T[]>
export const getByProject = async <T>(store: StoreName, projectId: string): Promise<T[]> =>
  wrap((await tx(store, 'readonly')).index('projectId').getAll(projectId)) as Promise<T[]>
export const remove = async (store: StoreName, id: string): Promise<void> => {
  await wrap((await tx(store, 'readwrite')).delete(id))
}

// ── Projects ───────────────────────────────────────────────
export function newProject(partial: Partial<Project> = {}): Project {
  const now = Date.now()
  return {
    id: uid(), name: '', address: '', customer: '', phone: '', email: '',
    status: 'active', notes: '', createdAt: now, updatedAt: now, ...partial,
  }
}
export const saveProject = (p: Project) => put('projects', { ...p, updatedAt: Date.now() })

export async function listProjects(): Promise<Project[]> {
  return (await getAll<Project>('projects')).sort((a, b) => b.updatedAt - a.updatedAt)
}

/** Deleting a project removes everything that belongs to it. */
export async function deleteProject(id: string): Promise<void> {
  for (const store of BY_PROJECT) {
    for (const row of await getByProject<{ id: string }>(store, id)) await remove(store, row.id)
  }
  await remove('projects', id)
}

// ── Photos ─────────────────────────────────────────────────
export const savePhoto = (p: Photo) => put('photos', p)
export async function listPhotos(projectId: string): Promise<Photo[]> {
  return (await getByProject<Photo>('photos', projectId)).sort((a, b) => b.takenAt - a.takenAt)
}
export const listChecklists = (projectId: string) => getByProject<Checklist>('checklists', projectId)
export const listComments = async (projectId: string) =>
  (await getByProject<Comment>('comments', projectId)).sort((a, b) => a.createdAt - b.createdAt)
export const listEstimates = (projectId: string) => getByProject<Estimate>('estimates', projectId)
export const listScopes = async (projectId: string) =>
  (await getByProject<ScopeDoc>('scopes', projectId)).sort((a, b) => a.createdAt - b.createdAt)

// ── Settings ───────────────────────────────────────────────
export const DEFAULT_BRANDING: Branding = { logo: '', color: '#2563eb', tagline: '', phone: '', email: '', website: '', address: '', license: '', terms: '', footer: '' }

export const SAMPLE_TERMS =
  'Payment: ____% deposit due at acceptance; balance due on completion. Pricing is valid for 30 days. Changes to the scope are documented in a signed change order before work begins. Late balances may incur interest as allowed by law.'

export const DEFAULT_SETTINGS: Settings = {
  branding: DEFAULT_BRANDING,
  customTemplates: [],
  companyName: 'My Company',
  author: 'Me',
  taxRate: 0,
  ai: { provider: 'openai', endpoint: '', apiKey: '', model: '' },
  transcription: { engine: 'local', localModel: 'Xenova/whisper-tiny.en', endpoint: 'https://api.openai.com/v1/audio/transcriptions', apiKey: '', apiModel: 'whisper-1' },
  priceBook: [
    { keywords: ['sprinkler head', 'rotor head', 'spray head'], description: 'Replace sprinkler head', unit: 'ea', price: 35 },
    { keywords: ['valve'], description: 'Replace zone valve', unit: 'ea', price: 145 },
    { keywords: ['backflow'], description: 'Backflow preventer service', unit: 'ea', price: 175 },
    { keywords: ['controller', 'timer'], description: 'Install smart controller', unit: 'ea', price: 320 },
    { keywords: ['pipe', 'line break', 'broken line'], description: 'Repair pipe / line break', unit: 'ea', price: 125 },
    { keywords: ['drain'], description: 'Clear or repair drain', unit: 'ea', price: 195 },
    { keywords: ['paint', 'painting'], description: 'Painting (per room)', unit: 'room', price: 450 },
    { keywords: ['drywall'], description: 'Drywall repair', unit: 'patch', price: 150 },
  ],
}

export async function loadSettings(): Promise<Settings> {
  const row = await get<{ key: string; value: Settings }>('meta', 'settings')
  return { ...DEFAULT_SETTINGS, ...row?.value, branding: { ...DEFAULT_BRANDING, ...row?.value?.branding }, customTemplates: row?.value?.customTemplates ?? [], ai: { ...DEFAULT_SETTINGS.ai, ...row?.value?.ai }, transcription: { ...DEFAULT_SETTINGS.transcription, ...row?.value?.transcription } }
}
export async function saveSettings(value: Settings) {
  const row = await put('meta', { key: 'settings', value })
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('jobcam:settings')) // lets the shell re-theme instantly
  return row
}
