import { useMemo } from 'react'
import type { WifiUser } from '../../types'

const COLORS = ['#ffd43b', '#ffbd19', '#e8731f', '#c94a0e', '#17104a', '#35258a']

interface ServerDonutChartProps {
  users: WifiUser[]
}

export function ServerDonutChart({ users }: ServerDonutChartProps) {
  const { slices, total } = useMemo(() => {
    const servers: Record<string, number> = {}
    for (const u of users) {
      if (u.server && u.server !== '-') {
        servers[u.server] = (servers[u.server] || 0) + 1
      }
    }
    const keys = Object.keys(servers).sort((a, b) => servers[b] - servers[a])
    const sum = keys.reduce((acc, k) => acc + servers[k], 0)

    const size = 140
    const radius = 48
    const cx = size / 2
    const cy = size / 2
    let start = -90

    const result = keys.map((s, idx) => {
      const pct = servers[s] / sum
      const end = start + pct * 360
      const r = radius
      const x1 = cx + r * Math.cos((start * Math.PI) / 180)
      const y1 = cy + r * Math.sin((start * Math.PI) / 180)
      const x2 = cx + r * Math.cos((end * Math.PI) / 180)
      const y2 = cy + r * Math.sin((end * Math.PI) / 180)
      const large = pct > 0.5 ? 1 : 0
      const color = COLORS[idx % COLORS.length]
      const path = `M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large} 1 ${x2},${y2} Z`
      start = end
      return { name: s, count: servers[s], color, path }
    })

    return { slices: result, total: sum }
  }, [users])

  if (!total) {
    return <div className="no-data-chart">Aucune donnée de serveur</div>
  }

  const size = 140
  const cx = size / 2
  const cy = size / 2

  return (
    <div className="donut-chart">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {slices.map((s) => (
          <path key={s.name} d={s.path} fill={s.color} opacity={0.85} />
        ))}
        <circle cx={cx} cy={cy} r={32} fill="var(--card-bg)" />
        <text
          x={cx}
          y={cy + 5}
          textAnchor="middle"
          fontSize={18}
          fontWeight={700}
          fill="var(--navy)"
        >
          {total}
        </text>
      </svg>
      <div className="donut-legend">
        {slices.map((s) => (
          <div className="legend-item" key={s.name}>
            <span className="legend-dot" style={{ background: s.color }} />
            {s.name} ({s.count})
          </div>
        ))}
      </div>
    </div>
  )
}
