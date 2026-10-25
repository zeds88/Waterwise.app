import type { Shape } from './types'

export const COLORS = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#ffffff', '#111827']

/** Two barbs of an arrowhead at `to`, pointing away from `from`. Pure, so testable. */
export function arrowHead(from: [number, number], to: [number, number], size: number): [[number, number], [number, number]] {
  const angle = Math.atan2(to[1] - from[1], to[0] - from[0])
  const barb = (delta: number): [number, number] => [
    to[0] - size * Math.cos(angle + delta),
    to[1] - size * Math.sin(angle + delta),
  ]
  return [barb(Math.PI / 7), barb(-Math.PI / 7)]
}

/** Draw normalised shapes onto a canvas context of pixel size w x h. */
export function drawShapes(ctx: CanvasRenderingContext2D, w: number, h: number, shapes: Shape[]): void {
  const stroke = Math.max(3, Math.round(Math.min(w, h) / 160))
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  for (const s of shapes) {
    const pts = s.points.map(([x, y]) => [x * w, y * h] as [number, number])
    if (pts.length === 0) continue
    ctx.strokeStyle = s.color
    ctx.fillStyle = s.color
    ctx.lineWidth = stroke
    const [a] = pts
    const b = pts[pts.length - 1]
    ctx.beginPath()
    switch (s.kind) {
      case 'pen':
        ctx.moveTo(a[0], a[1])
        for (const p of pts.slice(1)) ctx.lineTo(p[0], p[1])
        ctx.stroke()
        break
      case 'rect':
        ctx.strokeRect(Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]))
        break
      case 'ellipse':
        ctx.ellipse((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, Math.abs(b[0] - a[0]) / 2 || 1, Math.abs(b[1] - a[1]) / 2 || 1, 0, 0, Math.PI * 2)
        ctx.stroke()
        break
      case 'arrow': {
        ctx.moveTo(a[0], a[1])
        ctx.lineTo(b[0], b[1])
        ctx.stroke()
        const [l, r] = arrowHead(a, b, stroke * 5)
        ctx.beginPath()
        ctx.moveTo(b[0], b[1])
        ctx.lineTo(l[0], l[1])
        ctx.lineTo(r[0], r[1])
        ctx.closePath()
        ctx.fill()
        break
      }
      case 'text': {
        const size = Math.max(16, Math.round(Math.min(w, h) / 18))
        ctx.font = `700 ${size}px system-ui, sans-serif`
        ctx.textBaseline = 'top'
        ctx.lineWidth = Math.max(3, size / 6)
        ctx.strokeStyle = s.color === '#ffffff' ? '#000000' : '#ffffff'
        ctx.strokeText(s.text ?? '', a[0], a[1])
        ctx.fillText(s.text ?? '', a[0], a[1])
        break
      }
    }
  }
}
