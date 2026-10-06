import { useMemo } from 'react'
import type { WifiUser } from '../../types'

interface ZoneBarChartProps {
  users: WifiUser[]
}

export function ZoneBarChart({ users }: ZoneBarChartProps) {
  const entries = useMemo(() => {
    const zones: Record<string, number> = {}
    for (const u of users) {
      if (u.zone && u.zone !== '-') {
        zones[u.zone] = (zones[u.zone] || 0) + 1
      }
    }
    return Object.keys(zones)
      .sort((a, b) => zones[b] - zones[a])
      .map((z) => ({ zone: z, count: zones[z] }))
  }, [users])

  const max = entries.length ? Math.max(...entries.map((e) => e.count)) : 0

  if (!entries.length) {
    return <div className="no-data-chart">Aucune donnée de zone</div>
  }

  return (
    <div>
      {entries.map(({ zone, count }) => (
        <div className="bar-row" key={zone}>
          <span className="bar-label">{zone}</span>
          <span className="bar-track">
            <span
              className="bar-fill"
              style={{ width: `${(count / max) * 100}%` }}
            />
          </span>
          <span className="bar-value">{count}</span>
        </div>
      ))}
    </div>
  )
}
