import { get, saveProject, savePhoto } from './db'
import { processImage, getPosition } from './image'
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
