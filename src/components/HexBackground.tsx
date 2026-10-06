import { useEffect, useRef } from 'react'

interface Cell {
  x: number
  y: number
  v: number
  warm: boolean
}

export function HexBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !canvas.getContext) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const R = 22
    const S3 = Math.sqrt(3)
    let W = 0
    let H = 0
    let cells: Cell[] = []
    let pointer: { x: number; y: number } | null = null
    let raf = 0
    let alive = true

    function hex(x: number, y: number, r: number) {
      ctx!.beginPath()
      for (let k = 0; k < 6; k++) {
        const a = (Math.PI / 3) * k
        const px = x + r * Math.cos(a)
        const py = y + r * Math.sin(a)
        if (k) ctx!.lineTo(px, py)
        else ctx!.moveTo(px, py)
      }
      ctx!.closePath()
    }

    function ripple(cx: number, cy: number) {
      for (const cell of cells) {
        const d = Math.hypot(cell.x - cx, cell.y - cy)
        if (d < R * 5) {
          cell.v = Math.max(cell.v, 1 - d / (R * 5) - Math.random() * 0.2 + 0.2)
        }
      }
    }

    function build() {
      const dpr = window.devicePixelRatio || 1
      W = window.innerWidth
      H = window.innerHeight
      canvas!.width = W * dpr
      canvas!.height = H * dpr
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)
      cells = []
      const cols = Math.ceil(W / (1.5 * R)) + 2
      const rows = Math.ceil(H / (S3 * R)) + 2
      for (let i = -1; i < cols; i++) {
        for (let j = -1; j < rows; j++) {
          cells.push({
            x: i * 1.5 * R,
            y: j * S3 * R + (i % 2 ? (S3 * R) / 2 : 0),
            v: 0,
            warm: Math.random() < 0.4,
          })
        }
      }
      if (still) draw()
    }

    function draw() {
      if (!alive) return
      ctx!.clearRect(0, 0, W, H)
      ctx!.lineWidth = 1.5
      for (const q of cells) {
        hex(q.x, q.y, R - 2)
        ctx!.strokeStyle = `rgba(232,115,31,${(0.2 + q.v * 0.7).toFixed(2)})`
        ctx!.stroke()
        if (q.v > 0.02) {
          ctx!.fillStyle = q.warm
            ? `rgba(255,190,30,${(q.v * 0.7).toFixed(2)})`
            : `rgba(232,115,31,${(q.v * 0.4).toFixed(2)})`
          ctx!.fill()
          q.v *= 0.94
        }
      }
      if (still) return
      if (Math.random() < 0.1) {
        const r = cells[Math.floor(Math.random() * cells.length)]
        if (r) ripple(r.x, r.y)
      }
      if (pointer) ripple(pointer.x, pointer.y)
      raf = requestAnimationFrame(draw)
    }

    const onPointer = (e: PointerEvent) => {
      pointer = { x: e.clientX, y: e.clientY }
    }

    build()
    if (!still) raf = requestAnimationFrame(draw)

    const observer = window.ResizeObserver
      ? new ResizeObserver(build)
      : null
    if (observer) observer.observe(document.body)
    else window.addEventListener('resize', build)

    document.addEventListener('pointermove', onPointer)

    return () => {
      alive = false
      cancelAnimationFrame(raf)
      observer?.disconnect()
      window.removeEventListener('resize', build)
      document.removeEventListener('pointermove', onPointer)
    }
  }, [])

  return <canvas className="hexbg" ref={canvasRef} aria-hidden="true" />
}
