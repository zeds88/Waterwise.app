import { get, saveProject, savePhoto } from './db'
import { processImage, getPosition } from './image'
import { videoPoster } from './video'
import { uid } from './id'
import type { Photo, Project } from './types'

/** Normalise a camera frame / picked file into a stored Photo for a project. */
export async function addPhoto(projectId: string, source: Blob, opts: { tags?: string[]; caption?: string; withGps?: boolean } = {}): Promise<Photo> {
  const [img, pos] = await Promise.all([processImage(source), opts.withGps === false ? null : getPosition()])
  const photo: Photo = {
    id: uid(), projectId, ...img, takenAt: Date.now(), tags: opts.tags ?? [], caption: opts.caption ?? '', annotations: [],
    ...(pos ? { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy } : {}),
  }
  await savePhoto(photo)
  const project = await get<Project>('projects', projectId)
  if (project) await saveProject({ ...project, coverPhotoId: project.coverPhotoId ?? photo.id })
  return photo
}

export async function addVideo(projectId: string, source: Blob, opts: { tags?: string[]; caption?: string; withGps?: boolean } = {}): Promise<Photo> {
  const [poster, pos] = await Promise.all([videoPoster(source), opts.withGps === false ? null : getPosition()])
  const type = source.type || ((source as File).name?.toLowerCase().endsWith('.mov') ? 'video/quicktime' : 'video/mp4')
  if (!source.type) source = new Blob([source], { type })
  const photo: Photo = {
    id: uid(), kind: 'video', projectId, blob: source, thumb: poster.thumb, width: poster.width, height: poster.height, duration: poster.duration,
    takenAt: Date.now(), tags: opts.tags ?? [], caption: opts.caption ?? '', annotations: [],
    ...(pos ? { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy } : {}),
  }
  await savePhoto(photo)
  const project = await get<Project>('projects', projectId)
  if (project) await saveProject({ ...project, coverPhotoId: project.coverPhotoId ?? photo.id })
  return photo
}

const isVideo = (b: Blob) => b.type.startsWith('video/') || /\.(mp4|mov|m4v|webm|3gp|mkv)$/i.test((b as File).name ?? '')

/** Storage failures (full disk, private mode) get a plain-language message. */
export function explainError(e: unknown): string {
  const err = e as { name?: string; message?: string }
  if (err?.name === 'QuotaExceededError') return 'Not enough storage left on this device. Delete some media or export a backup first.'
  return err?.message || 'Unknown error'
}

/** Photos and videos both come in through here (camera, file picker, drag-drop). */
export async function addMedia(projectId: string, source: Blob, opts: Parameters<typeof addPhoto>[2] = {}): Promise<Photo> {
  try {
    return isVideo(source) ? await addVideo(projectId, source, opts) : await addPhoto(projectId, source, opts)
  } catch (e) {
    throw new Error(explainError(e))
  }
}

/** The still image for any media item: the photo itself, or a video's poster frame. */
export const stillOf = (p: Photo): Blob => (p.kind === 'video' ? p.thumb : p.blob)
