import { useMemo } from 'react'
import type { WifiUser } from '../types'

interface ControlsProps {
  users: WifiUser[]
  search: string
  zone: string
  server: string
  onSearchChange: (value: string) => void
  onZoneChange: (value: string) => void
  onServerChange: (value: string) => void
}

export function Controls({
  users,
  search,
  zone,
  server,
  onSearchChange,
  onZoneChange,
  onServerChange,
}: ControlsProps) {
  const { zones, servers } = useMemo(() => {
    const zoneCounts: Record<string, number> = {}
    const serverCounts: Record<string, number> = {}

    for (const u of users) {
      if (u.zone && u.zone !== '-') {
        zoneCounts[u.zone] = (zoneCounts[u.zone] || 0) + 1
      }
      if (u.server && u.server !== '-') {
        serverCounts[u.server] = (serverCounts[u.server] || 0) + 1
      }
    }

    return { zones: zoneCounts, servers: serverCounts }
  }, [users])

  return (
    <div className="controls">
      <input
        type="text"
        className="search-box"
        placeholder="Rechercher par nom, téléphone ou zone..."
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
      />
      <select
        className="zone-filter"
        value={zone}
        onChange={(e) => onZoneChange(e.target.value)}
      >
        <option value="">Toutes les zones</option>
        {Object.keys(zones)
          .sort()
          .map((z) => (
            <option key={z} value={z}>
              {z} ({zones[z]})
            </option>
          ))}
      </select>
      <select
        className="zone-filter"
        value={server}
        onChange={(e) => onServerChange(e.target.value)}
      >
        <option value="">Tous les serveurs</option>
        {Object.keys(servers)
          .sort()
          .map((s) => (
            <option key={s} value={s}>
              {s} ({servers[s]})
            </option>
          ))}
      </select>
    </div>
  )
}
