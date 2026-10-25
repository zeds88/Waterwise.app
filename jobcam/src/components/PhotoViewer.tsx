import { ChevronLeft, ChevronRight, MapPin, PencilLine, Star, Trash2, Mic } from 'lucide-react'
import { useObjectUrl } from '../lib/hooks'
import { useRef, useState } from 'react'
import { useDictation } from '../lib/hooks'
import type { LineItem, Photo, Project, Settings, Shape } from '../lib/types'
import NarrationPanel from './NarrationPanel'
import { UNPLAYABLE } from '../lib/video'
import AiPanel from './AiPanel'
import Annotator from './Annotator'
import { Img, Modal, TagPicker } from './ui'

interface Props {
  photo: Photo
  index: number
  total: number
  isCover: boolean
  onClose: () => void
  onNav: (delta: number) => void
  onUpdate: (p: Photo) => void
  onDelete: (p: Photo) => void
  onCover: (p: Photo) => void
  project: Project
  settings: Settings
  onAddIssues: (items: string[]) => void
  onAddEstimate: (items: Omit<LineItem, 'id'>[]) => void
}

export default function PhotoViewer({ photo, index, total, isCover, onClose, onNav, onUpdate, onDelete, onCover, project, settings, onAddIssues, onAddEstimate }: Props) {
  const videoUrl = useObjectUrl(photo.kind === 'video' ? photo.blob : undefined)
  const isVideo = photo.kind === 'video'
  const videoEl = useRef<HTMLVideoElement>(null)
  const [videoProblem, setVideoProblem] = useState(false)
  const [marking, setMarking] = useState(false)
  const dict = useDictation((t) => onUpdate({ ...photo, caption: photo.caption ? `${photo.caption} ${t}` : t }))

  return (
    <Modal title={`${isVideo ? 'Video' : 'Photo'} ${index + 1} of ${total}`} onClose={onClose} wide>
      <div className="space-y-4">
        {marking && !isVideo ? (
          <Annotator key={photo.id} photo={photo} onChange={(annotations: Shape[]) => onUpdate({ ...photo, annotations })} />
        ) : (
          <div className="relative overflow-hidden rounded-xl bg-black">
            {isVideo
              ? <video ref={videoEl} key={photo.id} src={videoUrl} onError={() => setVideoProblem(true)} onLoadedMetadata={(e) => { if (!e.currentTarget.videoWidth) setVideoProblem(true) }} controls playsInline poster={undefined} className="mx-auto max-h-[58vh] w-full bg-black" aria-label="Video player" />
              : <Img blob={photo.blob} className="mx-auto max-h-[58vh] w-auto object-contain" alt={photo.caption || 'Job photo'} />}
            {isVideo && videoProblem && (
              <div role="alert" className="space-y-2 bg-amber-100 p-3 text-sm text-amber-950">
                <p>{UNPLAYABLE}</p>
                <a className="btn !py-1.5" href={videoUrl} download={`jobcam-video-${photo.id.slice(0, 6)}`}>Download original</a>
              </div>
            )}
            {photo.annotations.length > 0 && <span className="absolute left-2 top-2 rounded bg-brand px-2 py-0.5 text-xs font-bold text-white">Marked up</span>}
            <button className="absolute left-1 top-1/2 rounded-full bg-black/50 p-2 text-white disabled:opacity-30" disabled={index === 0} onClick={() => onNav(-1)} aria-label="Previous"><ChevronLeft /></button>
            <button className="absolute right-1 top-1/2 rounded-full bg-black/50 p-2 text-white disabled:opacity-30" disabled={index === total - 1} onClick={() => onNav(1)} aria-label="Next"><ChevronRight /></button>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {!isVideo && <button className={`btn ${marking ? 'btn-primary' : ''}`} onClick={() => setMarking((m) => !m)}><PencilLine size={18} /> {marking ? 'Done marking' : 'Mark up'}</button>}
          <button className="btn" onClick={() => onCover(photo)} disabled={isCover}><Star size={18} /> {isCover ? 'Cover photo' : 'Set as cover'}</button>
          {photo.lat !== undefined && (
            <a className="btn" target="_blank" rel="noreferrer" href={`https://www.openstreetmap.org/?mlat=${photo.lat}&mlon=${photo.lng}#map=18/${photo.lat}/${photo.lng}`}><MapPin size={18} /> Map</a>
          )}
          <span className="flex-1" />
          <button className="btn btn-danger" onClick={() => { if (window.confirm('Delete this photo?')) onDelete(photo) }}><Trash2 size={18} /></button>
        </div>

        <div>
          <span className="label">Caption</span>
          <div className="flex gap-2">
            <textarea className="input min-h-16" value={photo.caption} onChange={(e) => onUpdate({ ...photo, caption: e.target.value })} placeholder="What does this photo show?" />
            {dict.supported && (
              <button className={`btn !px-3 self-start ${dict.listening ? 'btn-danger' : ''}`} onClick={dict.listening ? dict.stop : dict.start} aria-label="Dictate caption"><Mic size={18} /></button>
            )}
          </div>
          {dict.interim && <p className="text-xs italic text-slate-500">…{dict.interim}</p>}
        </div>

        {isVideo && <NarrationPanel key={`n-${photo.id}`} photo={photo} settings={settings} onUpdate={onUpdate} onSeek={(t) => { if (videoEl.current) { videoEl.current.currentTime = t; void videoEl.current.play() } }} onAddIssues={onAddIssues} onAddEstimate={onAddEstimate} />}
        <AiPanel key={photo.id} photo={photo} project={project} settings={settings} onUpdate={onUpdate} onAddIssues={onAddIssues} />

        <div>
          <span className="label">Tags</span>
          <TagPicker value={photo.tags} onChange={(tags) => onUpdate({ ...photo, tags })} />
        </div>
        <p className="text-xs text-slate-500">
          {new Date(photo.takenAt).toLocaleString()}{photo.lat !== undefined && ` · ${photo.lat.toFixed(5)}, ${photo.lng!.toFixed(5)} (±${Math.round(photo.accuracy ?? 0)}m)`}
        </p>
      </div>
    </Modal>
  )
}
