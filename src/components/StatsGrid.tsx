import { useMemo } from 'react'
import type { WifiUser } from '../types'
import { activitySummary, DEFAULT_THRESHOLD } from '../utils/activity'
import { isThisWeek, isToday } from '../utils/format'
import { groupByPhone } from '../utils/owners'

interface StatsGridProps {
  /** Enregistrements deduplies par MAC (une ligne par appareil) */
  users: WifiUser[]
  /** Tous les enregistrements bruts (une ligne par passage) */
  rawUsers?: WifiUser[]
  /** Nombre de connexions minimum pour qu'un client soit regulier */
  threshold?: number
}

export function StatsGrid({
  users,
  rawUsers,
  threshold = DEFAULT_THRESHOLD,
}: StatsGridProps) {
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

    // Un client = un numero de telephone : le regroupement se fait sur
    // l'ensemble des enregistrements, pas sur les seuls appareils dedupes.
    const owners = groupByPhone(rawUsers ?? users)
    const clients = owners.filter((o) => o.e164 !== null)

    const connections = clients.reduce((sum, o) => sum + o.visits, 0)
    const activity = activitySummary(clients, threshold)

    const top = [...clients].sort(
      (a, b) =>
        b.visits - a.visits ||
        b.reportedConnections - a.reportedConnections ||
        (b.lastVisit ?? '').localeCompare(a.lastVisit ?? ''),
    )[0]

    return {
      total: rawUsers?.length ?? users.length,
      clients: clients.length,
      today,
      week,
      zones: zones.size,
      servers: servers.size,
      connections,
      regular: activity.regular,
      irregular: activity.irregular,
      top,
    }
  }, [users, rawUsers, threshold])

  return (
    <div className="stats-grid">
      <div className="stat-card">
        <div className="stat-label">Total Inscrits</div>
        <div className="stat-value">{stats.total}</div>
        <div className="stat-sub">{stats.clients} client(s) distinct(s)</div>
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
      <div className="stat-card">
        <div className="stat-label">Meilleur Client</div>
        <div className="stat-value stat-value-sm">
          {stats.top ? stats.top.name || 'Sans nom' : '-'}
        </div>
        <div className="stat-sub">
          {stats.top
            ? `${stats.top.visits} connexion(s) · ${stats.top.daysActive} jour(s)`
            : 'aucun client'}
        </div>
      </div>
      <div className="stat-card">
        <div className="stat-label">Total Connexions</div>
        <div className="stat-value">{stats.connections}</div>
        <div className="stat-sub">
          {stats.total} passage(s) enregistre(s)
        </div>
      </div>
      <div className="stat-card">
        <div className="stat-label">Clients Reguliers</div>
        <div className="stat-value">{stats.regular}</div>
        <div className="stat-sub">
          {stats.irregular} irregulier(s) a relancer
        </div>
      </div>
    </div>
  )
}
