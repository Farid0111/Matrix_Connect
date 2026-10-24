import type { SmsRecipient } from './owners'

/**
 * Tri et ciblage des clients sur le nombre de connexions.
 *
 * Le nombre de connexions d'un client est le champ `connectionCount` ecrit
 * par le portail : somme des compteurs de chaque appareil du client. Ce
 * champ n'est renseigne que sur les documents les plus recents ; les anciens
 * valent 0. Le nombre de VISITES (passages) reste une metrique distincte
 * et n'est jamais confondu avec le nombre de connexions.
 *
 * Un client est considere comme regulier au-dela d'un seuil de connexions ;
 * en dessous, il est "irregulier" et candidat a une relance par SMS.
 */

export type SmsSortMode = 'connections' | 'visits' | 'irregular' | 'name' | 'recent' | 'zone'

export const SORT_MODES: { value: SmsSortMode; label: string }[] = [
  { value: 'connections', label: 'Connexions (decroissant)' },
  { value: 'visits', label: 'Visites (decroissant)' },
  { value: 'irregular', label: 'Irreguliers d’abord' },
  { value: 'name', label: 'Nom (A→Z)' },
  { value: 'recent', label: 'Derniere visite (recent)' },
  { value: 'zone', label: 'Zone (A→Z)' },
]

/** Seuils de regularite proposes (nombre de connexions minimum). */
export const REGULAR_THRESHOLDS = [2, 3, 4, 5, 8, 10]

export const DEFAULT_THRESHOLD = 3

export type ActivityLevel = 'rare' | 'occasional' | 'regular'

/** Un client est regulier s'il a au moins `threshold` connexions. */
export function isRegular(
  recipient: Pick<SmsRecipient, 'connections'>,
  threshold: number,
): boolean {
  return recipient.connections >= threshold
}

/** Niveau de regularite, utilise pour colorer les badges. */
export function activityLevel(
  recipient: Pick<SmsRecipient, 'connections'>,
  threshold: number,
): ActivityLevel {
  if (recipient.connections >= threshold) return 'regular'
  if (recipient.connections >= threshold - 1) return 'occasional'
  return 'rare'
}

function byName(a: SmsRecipient, b: SmsRecipient): number {
  const an = a.name || a.raw
  const bn = b.name || b.raw
  const cmp = an.localeCompare(bn, 'fr', { sensitivity: 'base' })
  if (cmp !== 0) return cmp
  return a.e164.localeCompare(b.e164)
}

/** Trie une liste de destinataires. */
export function sortRecipients(
  list: SmsRecipient[],
  mode: SmsSortMode,
): SmsRecipient[] {
  const copy = [...list]

  switch (mode) {
    case 'connections':
      return copy.sort(
        (a, b) =>
          b.connections - a.connections ||
          b.visits - a.visits ||
          byName(a, b),
      )
    case 'visits':
      return copy.sort(
        (a, b) => b.visits - a.visits || byName(a, b),
      )
    case 'irregular':
      return copy.sort(
        (a, b) => a.connections - b.connections || byName(a, b),
      )
    case 'name':
      return copy.sort(byName)
    case 'recent':
      return copy.sort(
        (a, b) =>
          (b.lastVisit ?? '').localeCompare(a.lastVisit ?? '') ||
          byName(a, b),
      )
    case 'zone':
      return copy.sort(
        (a, b) =>
          (a.zones[0] ?? '').localeCompare(b.zones[0] ?? '') ||
          byName(a, b),
      )
  }
}

/** Destinataires irreguliers : sous le seuil de connexions. */
export function irregularRecipients(
  list: SmsRecipient[],
  threshold: number,
): SmsRecipient[] {
  return list.filter((r) => r.connections < threshold)
}

/** Repartition des clients par nombre de connexions (pour le resume). */
export function activitySummary(
  list: Pick<SmsRecipient, 'connections' | 'visits'>[],
  threshold: number,
): {
  regular: number
  irregular: number
  totalConnections: number
  totalVisits: number
} {
  let regular = 0
  let totalConnections = 0
  let totalVisits = 0

  for (const r of list) {
    if (r.connections >= threshold) regular += 1
    totalConnections += r.connections
    totalVisits += r.visits
  }

  return {
    regular,
    irregular: list.length - regular,
    totalConnections,
    totalVisits,
  }
}
