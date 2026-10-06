import { useMemo } from 'react'
import type { WifiUser } from '../types'
import { isThisWeek, isToday } from '../utils/format'

interface StatsGridProps {
  users: WifiUser[]
}

export function StatsGrid({ users }: StatsGridProps) {
  const stats = useMemo(() => {
    let today = 0
    let week = 0
    const zones = new Set<string>()
    const servers = new Set<string>()

    for (const u of users) {
      if (u.createdAt) {
        if (isToday(u.createdAt)) today++
        if (isThisWeek(u.createdAt)) week++
      }
      if (u.zone && u.zone !== '-') zones.add(u.zone)
      if (u.server && u.server !== '-') servers.add(u.server)
    }

    return {
      total: users.length,
      today,
      week,
      zones: zones.size,
      servers: servers.size,
    }
  }, [users])

  return (
    <div className="stats-grid">
      <div className="stat-card">
        <div className="stat-label">Total Inscrits</div>
        <div className="stat-value">{stats.total}</div>
      </div>
      <div className="stat-card">
        <div className="stat-label">Aujourd&apos;hui</div>
        <div className="stat-value">{stats.today}</div>
        <div className="stat-sub">
          {stats.today > 0
            ? "inscriptions aujourd'hui"
            : "pas d'inscription aujourd'hui"}
        </div>
      </div>
      <div className="stat-card">
        <div className="stat-label">Cette Semaine</div>
        <div className="stat-value">{stats.week}</div>
      </div>
      <div className="stat-card">
        <div className="stat-label">Zones Actives</div>
        <div className="stat-value">{stats.zones}</div>
      </div>
      <div className="stat-card">
        <div className="stat-label">Serveurs</div>
        <div className="stat-value">{stats.servers}</div>
      </div>
    </div>
  )
}
