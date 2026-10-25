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

/** Photos and videos both come in through here (camera, file picker, drag-drop). */
export const addMedia = (projectId: string, source: Blob, opts: Parameters<typeof addPhoto>[2] = {}) =>
  source.type.startsWith('video/') ? addVideo(projectId, source, opts) : addPhoto(projectId, source, opts)

/** The still image for any media item: the photo itself, or a video's poster frame. */
export const stillOf = (p: Photo): Blob => (p.kind === 'video' ? p.thumb : p.blob)
