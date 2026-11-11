import { useLayoutEffect, useRef, useState } from 'react'

export const PAGE_W = 794
export const PAGE_H = 1123

/**
 * Shows an A4 document (rendered at its real 794px width) scaled to fit the
 * container width. `clip` crops to the first page (thumbnails); otherwise the
 * full height shows, with dashed markers where a new PDF page starts.
 */
export function ScaledDoc({ children, clip = false, markers = false, className = '' }) {
  const outer = useRef(null)
  const inner = useRef(null)
  const [box, setBox] = useState({ scale: 0, height: PAGE_H })

  useLayoutEffect(() => {
    const o = outer.current
    const i = inner.current
    if (!o || !i) return undefined
    const measure = () => {
      const scale = o.clientWidth / PAGE_W
      const height = Math.max(PAGE_H, i.scrollHeight)
      setBox(prev => (prev.scale === scale && prev.height === height ? prev : { scale, height }))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(o)
    ro.observe(i)
    return () => ro.disconnect()
  }, [])

  const pages = Math.ceil((box.height - 4) / PAGE_H)
  const shownHeight = (clip ? PAGE_H : box.height) * box.scale

  return (
    <div ref={outer} className={`scaled-doc ${className}`} style={{ height: shownHeight || undefined }}>
      <div
        ref={inner}
        className="scaled-doc__inner"
        style={{ transform: `scale(${box.scale || 0.0001})`, visibility: box.scale ? 'visible' : 'hidden' }}
      >
        {children}
        {markers && !clip && Array.from({ length: Math.max(0, pages - 1) }, (_, n) => (
          <div key={n} className="scaled-doc__break" style={{ top: PAGE_H * (n + 1) }}>
            <span>Page {n + 2}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
