import { ArrowUpRight, Circle, Pencil, Square, Trash2, Type, Undo2 } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { COLORS, drawShapes } from '../lib/annotate'
import { useObjectUrl } from '../lib/hooks'
import type { Photo, Shape, ShapeKind } from '../lib/types'

const TOOLS: { kind: ShapeKind; icon: ReactNode; label: string }[] = [
  { kind: 'arrow', icon: <ArrowUpRight size={18} />, label: 'Arrow' },
  { kind: 'rect', icon: <Square size={18} />, label: 'Box' },
  { kind: 'ellipse', icon: <Circle size={18} />, label: 'Circle' },
  { kind: 'pen', icon: <Pencil size={18} />, label: 'Draw' },
  { kind: 'text', icon: <Type size={18} />, label: 'Text' },
]

/** Non-destructive markup: the original photo is untouched, shapes are stored as vectors. */
export default function Annotator({ photo, onChange }: { photo: Photo; onChange: (s: Shape[]) => void }) {
  const url = useObjectUrl(photo.blob)
  const stage = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [shapes, setShapes] = useState<Shape[]>(photo.annotations)
  const [draft, setDraft] = useState<Shape | null>(null)
  const [tool, setTool] = useState<ShapeKind>('arrow')
  const [color, setColor] = useState(COLORS[0])

  useEffect(() => {
    const el = stage.current
    if (!el) return
    const fit = () => {
      const maxW = el.clientWidth
      const maxH = Math.min(window.innerHeight * 0.58, 640)
      const scale = Math.min(maxW / photo.width, maxH / photo.height)
      setSize({ w: Math.round(photo.width * scale), h: Math.round(photo.height * scale) })
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    return () => ro.disconnect()
  }, [photo.width, photo.height])

  useEffect(() => {
    const c = canvas.current
    if (!c || !size.w) return
    const dpr = window.devicePixelRatio || 1
    c.width = size.w * dpr
    c.height = size.h * dpr
    const ctx = c.getContext('2d')!
    ctx.clearRect(0, 0, c.width, c.height)
    drawShapes(ctx, c.width, c.height, draft ? [...shapes, draft] : shapes)
  }, [shapes, draft, size])

  const pt = (e: React.PointerEvent): [number, number] => {
    const r = canvas.current!.getBoundingClientRect()
    return [Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), Math.min(1, Math.max(0, (e.clientY - r.top) / r.height))]
  }
  const commit = (next: Shape[]) => { setShapes(next); onChange(next) }

  return (
    <div className="space-y-3">
      <div ref={stage} className="flex w-full justify-center rounded-xl bg-black/90 p-0">
        <div className="relative" style={{ width: size.w, height: size.h }}>
          {url && <img src={url} alt="" className="absolute inset-0 h-full w-full select-none" draggable={false} />}
          <canvas
            ref={canvas}
            aria-label="Annotation canvas"
            className="absolute inset-0 h-full w-full touch-none"
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId)
              const p = pt(e)
              if (tool === 'text') {
                const text = window.prompt('Label text')?.trim()
                if (text) commit([...shapes, { kind: 'text', color, points: [p], text }])
                return
              }
              setDraft({ kind: tool, color, points: tool === 'pen' ? [p] : [p, p] })
            }}
            onPointerMove={(e) => {
              if (!draft) return
              const p = pt(e)
              setDraft({ ...draft, points: draft.kind === 'pen' ? [...draft.points, p] : [draft.points[0], p] })
            }}
            onPointerUp={() => {
              if (!draft) return
              const moved = draft.points.length > 2 || Math.hypot(draft.points[1][0] - draft.points[0][0], draft.points[1][1] - draft.points[0][1]) > 0.01
              setDraft(null)
              if (moved) commit([...shapes, draft])
            }}
          />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {TOOLS.map((t) => (
          <button key={t.kind} className={`btn !px-3 ${tool === t.kind ? 'btn-primary' : ''}`} onClick={() => setTool(t.kind)} aria-pressed={tool === t.kind} aria-label={t.label}>
            {t.icon}
          </button>
        ))}
        <span className="mx-1 h-6 w-px bg-slate-300 dark:bg-slate-700" />
        {COLORS.map((c) => (
          <button key={c} aria-label={`Color ${c}`} onClick={() => setColor(c)} className={`h-7 w-7 rounded-full border-2 ${color === c ? 'border-blue-500 ring-2 ring-blue-500/40' : 'border-slate-400'}`} style={{ background: c }} />
        ))}
        <span className="flex-1" />
        <button className="btn !px-3" disabled={!shapes.length} onClick={() => commit(shapes.slice(0, -1))} aria-label="Undo"><Undo2 size={18} /></button>
        <button className="btn !px-3" disabled={!shapes.length} onClick={() => commit([])} aria-label="Clear markup"><Trash2 size={18} /></button>
      </div>
    </div>
  )
}
