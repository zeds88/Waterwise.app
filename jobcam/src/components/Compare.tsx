import { useState } from 'react'
import { useObjectUrl } from '../lib/hooks'

/** Before/after reveal slider. */
export default function Compare({ before, after }: { before: Blob; after: Blob }) {
  const a = useObjectUrl(before)
  const b = useObjectUrl(after)
  const [pos, setPos] = useState(50)
  return (
    <div className="space-y-3">
      <div className="relative mx-auto aspect-[4/3] w-full select-none overflow-hidden rounded-xl bg-black">
        {b && <img src={b} alt="After" className="absolute inset-0 h-full w-full object-contain" draggable={false} />}
        {a && (
          <img src={a} alt="Before" className="absolute inset-0 h-full w-full object-contain" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }} draggable={false} />
        )}
        <div className="pointer-events-none absolute inset-y-0 w-0.5 bg-white shadow" style={{ left: `${pos}%` }} />
        <span className="absolute left-2 top-2 rounded bg-black/60 px-2 py-0.5 text-xs font-bold text-white">BEFORE</span>
        <span className="absolute right-2 top-2 rounded bg-black/60 px-2 py-0.5 text-xs font-bold text-white">AFTER</span>
      </div>
      <input type="range" min={0} max={100} value={pos} onChange={(e) => setPos(+e.target.value)} aria-label="Before/after slider" />
    </div>
  )
}
