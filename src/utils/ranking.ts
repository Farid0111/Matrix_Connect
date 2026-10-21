import type { ClientRank, WifiUser } from '../types'
import { decodeMac } from './format'
import { groupByPhone } from './owners'
import { normalizePhone } from './phone'

export function monthKeyFromDate(date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

export function formatMonthLabel(monthKey: string): string {
  const [y, m] = monthKey.split('-').map(Number)
  const date = new Date(y, m - 1, 1)
  return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
}

/**
 * Identifiant client.
 *
 * On se base sur le numero normalise : une meme personne qui s'est inscrite
 * avec deux formats differents (`0155541115` et `+2290155541115`) ou depuis
 * deux appareils (deux MAC) reste un seul client.
 */
export function clientId(user: Pick<WifiUser, 'phone' | 'mac'>): string {
  const { e164 } = normalizePhone(user.phone)
  if (e164) return `phone:${e164}`
  return `mac:${decodeMac(user.mac).toLowerCase()}`
}

export function isInMonth(dateStr: string | null, monthKey: string): boolean {
  if (!dateStr) return false
  return dateStr.slice(0, 7) === monthKey
}

/** Rank clients by number of WiFi visits in the selected month. */
export function rankClientsForMonth(
  rawUsers: WifiUser[],
  monthKey: string,
): ClientRank[] {
  // Connexions totales par client, toutes periodes confondues : champ
  // `connectionCount` du portail quand il est renseigne, sinon le nombre de
  // passages de l'appareil (1 document = 1 connexion).
  const totals = new Map<string, number>()
  for (const owner of groupByPhone(rawUsers)) {
    if (!owner.e164) continue
    totals.set(`phone:${owner.e164}`, owner.connections)
  }
  for (const u of rawUsers) {
    const id = clientId(u)
    if (totals.has(id)) continue
    totals.set(id, (totals.get(id) ?? 0) + 1)
  }

  const map = new Map<
    string,
    {
      name: string
      phone: string
      mac: string
      zone: string
      server: string
      visits: number
      connectionCount: number
      lastVisit: string | null
      zones: Set<string>
    }
  >()

  for (const u of rawUsers) {
    if (!isInMonth(u.createdAt, monthKey)) continue
    const id = clientId(u)
    const phone = normalizePhone(u.phone).e164 ?? u.phone
    const existing = map.get(id)

    if (!existing) {
      map.set(id, {
        name: u.name,
        phone,
        mac: u.mac,
        zone: u.zone,
        server: u.server,
        visits: 1,
        connectionCount: totals.get(id) ?? 1,
        lastVisit: u.createdAt,
        zones: new Set(u.zone && u.zone !== '-' ? [u.zone] : []),
      })
      continue
    }

    existing.visits += 1
    existing.connectionCount = Math.max(
      existing.connectionCount,
      totals.get(id) ?? existing.connectionCount,
    )
    if (u.zone && u.zone !== '-') existing.zones.add(u.zone)
    if (
      u.createdAt &&
      (!existing.lastVisit ||
        new Date(u.createdAt) > new Date(existing.lastVisit))
    ) {
      existing.lastVisit = u.createdAt
      existing.name = u.name || existing.name
      existing.phone = phone
      existing.mac = u.mac || existing.mac
      existing.zone = u.zone || existing.zone
      existing.server = u.server || existing.server
    }
  }

  return Array.from(map.entries())
    .map(([id, value]) => ({
      id,
      name: value.name,
      phone: value.phone,
      mac: value.mac,
      zone: value.zone,
      server: value.server,
      visits: value.visits,
      connectionCount: value.connectionCount,
      lastVisit: value.lastVisit,
      zonesUsed: Array.from(value.zones).sort(),
    }))
    .sort((a, b) => {
      if (b.connectionCount !== a.connectionCount) {
        return b.connectionCount - a.connectionCount
      }
      if (b.visits !== a.visits) return b.visits - a.visits
      const ta = a.lastVisit ? new Date(a.lastVisit).getTime() : 0
      const tb = b.lastVisit ? new Date(b.lastVisit).getTime() : 0
      return tb - ta
    })
}

export function availableMonthKeys(rawUsers: WifiUser[]): string[] {
  const keys = new Set<string>()
  for (const u of rawUsers) {
    if (u.createdAt) keys.add(u.createdAt.slice(0, 7))
  }
  const current = monthKeyFromDate()
  keys.add(current)
  return Array.from(keys).sort((a, b) => b.localeCompare(a))
}
