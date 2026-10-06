import { useMemo } from 'react'
import type { WifiUser } from '../../types'

interface DailyLineChartProps {
  users: WifiUser[]
}

export function DailyLineChart({ users }: DailyLineChartProps) {
  const daily = useMemo(() => {
    const result: Record<string, { count: number; label: string }> = {}
    const today = new Date()

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(today.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      result[key] = {
        count: 0,
        label: d.toLocaleDateString('fr-FR', { weekday: 'short' }),
      }
    }

    for (const u of users) {
      if (!u.createdAt) continue
      const day = new Date(u.createdAt).toISOString().slice(0, 10)
      if (result[day]) result[day].count++
    }

    return result
  }, [users])

  const keys = Object.keys(daily)
  const max = keys.length ? Math.max(...keys.map((k) => daily[k].count)) : 0

  if (!max) {
    return (
      <div className="no-data-chart">
        Aucune inscription dans les 7 derniers jours
      </div>
    )
  }

  const h = 160
  const w = 400
  const padding = 30
  const chartW = w - padding * 2
  const step = chartW / (keys.length - 1)

  const points = keys
    .map((k, i) => {
      const x = padding + i * step
      const y = h - padding - (daily[k].count / max) * (h - padding * 2)
      return `${i === 0 ? 'M' : 'L'}${x},${y}`
    })
    .join('')

  return (
    <svg
      className="line-chart"
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="xMidYMid meet"
    >
      <line
        x1={padding}
        y1={h - padding}
        x2={w - padding}
        y2={h - padding}
        stroke="var(--card-border)"
        strokeWidth={1}
      />
      {keys.map((k, i) => {
        const x = padding + i * step
        const y = h - padding - (daily[k].count / max) * (h - padding * 2)
        return (
          <g key={k}>
            <line
              x1={x}
              y1={h - padding}
              x2={x}
              y2={h - padding + 4}
              stroke="var(--text-muted)"
              strokeWidth={1}
            />
            <text
              x={x}
              y={h - padding + 16}
              textAnchor="middle"
              fontSize={9}
              fill="var(--text-muted)"
            >
              {daily[k].label}
            </text>
            <circle cx={x} cy={y} r={4} fill="var(--yellow)" />
            <text
              x={x}
              y={y - 8}
              textAnchor="middle"
              fontSize={10}
              fill="var(--navy)"
              fontWeight={700}
            >
              {daily[k].count}
            </text>
          </g>
        )
      })}
      <path
        d={points}
        fill="none"
        stroke="var(--yellow)"
        strokeWidth={2.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  )
}
