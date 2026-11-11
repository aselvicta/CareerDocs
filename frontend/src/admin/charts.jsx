import { useEffect, useMemo, useRef, useState } from 'react'
import { fmtNum } from './format'

/** Single headline number with an optional secondary line. */
export function StatTile({ label, value, sub, icon: Icon }) {
  return (
    <div className="stat-tile">
      <p className="stat-tile__label">
        {Icon && <Icon size={14} aria-hidden />} {label}
      </p>
      <p className="stat-tile__value">{typeof value === 'number' ? fmtNum(value) : value}</p>
      {sub && <p className="stat-tile__sub">{sub}</p>}
    </div>
  )
}

function useWidth(ref) {
  const [w, setW] = useState(600)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => setW(Math.max(260, Math.floor(entry.contentRect.width))))
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref])
  return w
}

function niceMax(v) {
  if (v <= 4) return 4
  const pow = 10 ** Math.floor(Math.log10(v))
  const n = v / pow
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10
  return step * pow
}

const shortDate = iso =>
  new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

/**
 * Single-series time chart (area + 2px line) with a crosshair tooltip and a table view.
 * data: [{date: 'YYYY-MM-DD', value: number}]
 */
export function TrendChart({ data, label, height = 220 }) {
  const wrapRef = useRef(null)
  const width = useWidth(wrapRef)
  const [hover, setHover] = useState(null)
  const [showTable, setShowTable] = useState(false)

  const pad = { top: 12, right: 12, bottom: 26, left: 40 }
  const innerW = width - pad.left - pad.right
  const innerH = height - pad.top - pad.bottom
  const max = niceMax(Math.max(0, ...data.map(d => d.value)))
  const n = data.length
  const x = i => pad.left + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW)
  const y = v => pad.top + innerH - (v / max) * innerH

  const { line, area } = useMemo(() => {
    if (!n) return { line: '', area: '' }
    const pts = data.map((d, i) => `${x(i).toFixed(1)},${y(d.value).toFixed(1)}`)
    return {
      line: `M${pts.join('L')}`,
      area: `M${x(0)},${y(0)}L${pts.join('L')}L${x(n - 1)},${y(0)}Z`,
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, width, height, max])

  const ticks = [0, 0.25, 0.5, 0.75, 1].map(t => Math.round(max * t * 100) / 100)
  const labelIdx = n > 1 ? [...new Set([0, Math.floor((n - 1) / 2), n - 1])] : [0]
  const total = data.reduce((s, d) => s + d.value, 0)

  function onMove(e) {
    const rect = e.currentTarget.getBoundingClientRect()
    const px = e.clientX - rect.left
    const i = n <= 1 ? 0 : Math.round(((px - pad.left) / innerW) * (n - 1))
    setHover(Math.max(0, Math.min(n - 1, i)))
  }

  const h = hover != null ? data[hover] : null

  return (
    <div className="viz">
      <div className="viz__chart" ref={wrapRef}>
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={`${label}: ${fmtNum(total)} total over ${n} days`}
          onMouseMove={onMove}
          onMouseLeave={() => setHover(null)}
        >
          {ticks.map(t => (
            <g key={t}>
              <line className="viz__grid" x1={pad.left} x2={width - pad.right} y1={y(t)} y2={y(t)} />
              <text className="viz__tick" x={pad.left - 8} y={y(t)} dy="0.32em" textAnchor="end">
                {fmtNum(t)}
              </text>
            </g>
          ))}
          {labelIdx.map(i => (
            <text
              key={i}
              className="viz__tick"
              x={x(i)}
              y={height - 6}
              textAnchor={i === 0 && n > 1 ? 'start' : i === n - 1 && n > 1 ? 'end' : 'middle'}
            >
              {shortDate(data[i].date)}
            </text>
          ))}
          <path className="viz__area" d={area} />
          <path className="viz__line" d={line} />
          {h && (
            <g>
              <line className="viz__crosshair" x1={x(hover)} x2={x(hover)} y1={pad.top} y2={pad.top + innerH} />
              <circle className="viz__dot" cx={x(hover)} cy={y(h.value)} r={4.5} />
            </g>
          )}
          <rect x={pad.left} y={pad.top} width={innerW} height={innerH} fill="transparent" />
        </svg>
        {h && (
          <div
            className="viz__tooltip"
            style={{
              left: Math.min(Math.max(x(hover), 70), width - 70),
              top: Math.max(y(h.value) - 12, 0),
            }}
          >
            <span className="viz__tooltip-date">{shortDate(h.date)}</span>
            <span className="viz__tooltip-value">
              <i className="viz__swatch" aria-hidden /> {label}: <strong>{fmtNum(h.value)}</strong>
            </span>
          </div>
        )}
      </div>
      <button type="button" className="btn btn-ghost btn-sm viz__table-toggle" onClick={() => setShowTable(s => !s)}>
        {showTable ? 'Hide table' : 'Show as table'}
      </button>
      {showTable && (
        <div className="table-responsive viz__table">
          <table className="admin-table">
            <thead><tr><th>Date</th><th className="num">{label}</th></tr></thead>
            <tbody>
              {[...data].reverse().map(d => (
                <tr key={d.date}><td>{d.date}</td><td className="num">{fmtNum(d.value)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

/** Ranked horizontal bars, each row direct-labelled with its value. */
export function BarList({ items, formatLabel = l => l, empty = 'No data yet.', onSelect }) {
  if (!items?.length) return <p className="empty-state">{empty}</p>
  const max = Math.max(...items.map(i => i.count), 1)
  const total = items.reduce((s, i) => s + i.count, 0)
  return (
    <ul className="barlist">
      {items.map(item => {
        const pct = total ? Math.round((item.count / total) * 100) : 0
        const text = formatLabel(item.label)
        const content = (
          <>
            <span className="barlist__label" title={text}>{text}</span>
            <span className="barlist__value">
              {fmtNum(item.count)} <span className="barlist__pct">{pct}%</span>
            </span>
            <span className="barlist__track" aria-hidden>
              <span className="barlist__bar" style={{ width: `${(item.count / max) * 100}%` }} />
            </span>
          </>
        )
        return (
          <li key={item.label} className="barlist__row" title={`${text}: ${fmtNum(item.count)} (${pct}%)`}>
            {onSelect ? (
              <button type="button" className="barlist__btn" onClick={() => onSelect(item)}>{content}</button>
            ) : content}
          </li>
        )
      })}
    </ul>
  )
}
