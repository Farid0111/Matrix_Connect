import type { SmsRecipient } from './owners'

/**
 * Tri et ciblage des clients par nombre de connexions.
 *
 * Dans la collection `freeWifiUsers`, un document correspond a une connexion
 * WiFi (le portail capture enregistre le passage du client). Le nombre de
 * connexions d'un client est donc le nombre de documents portant son numero.
 *
 * Un client est considere comme regulier au-dela d'un seuil de connexions ;
 * en dessous, il est "irregulier" et candidat a une relance par SMS.
 */

export type SmsSortMode = 'connections' | 'irregular' | 'name' | 'recent'

export const SORT_MODES: { value: SmsSortMode; label: string }[] = [
  { value: 'connections', label: 'Connexions (decroissant)' },
  { value: 'irregular', label: 'Irreguliers d’abord' },
  { value: 'name', label: 'Nom (A→Z)' },
  { value: 'recent', label: 'Derniere visite (recent)' },
]

/** Seuils de regularite proposes (nombre de connexions minimum). */
export const REGULAR_THRESHOLDS = [2, 3, 4, 5, 8, 10]

export const DEFAULT_THRESHOLD = 3

export type ActivityLevel = 'rare' | 'occasional' | 'regular'

/** Donnees minimales necessaires pour evaluer la regularite d'un client. */
export interface ConnectionProfile {
  /** Nombre de connexions enregistrees */
  visits: number
}

/** Un client est regulier s'il a au moins `threshold` connexions. */
export function isRegular(
  recipient: ConnectionProfile,
  threshold: number,
): boolean {
  return recipient.visits >= threshold
}

/** Niveau de regularite, utilise pour colorer les badges. */
export function activityLevel(
  recipient: ConnectionProfile,
  threshold: number,
): ActivityLevel {
  if (recipient.visits >= threshold) return 'regular'
  if (recipient.visits >= threshold - 1) return 'occasional'
  return 'rare'
}

function byName(a: SmsRecipient, b: SmsRecipient): number {
  const an = a.name || a.raw
  const bn = b.name || b.raw
  const cmp = an.localeCompare(bn, 'fr', { sensitivity: 'base' })
  if (cmp !== 0) return cmp
  return a.e164.localeCompare(b.e164)
}

/** Trie une liste de destinataires selon le mode choisi. */
export function sortRecipients(
  list: SmsRecipient[],
  mode: SmsSortMode,
): SmsRecipient[] {
  const copy = [...list]

  switch (mode) {
    case 'connections':
      return copy.sort(
        (a, b) =>
          b.visits - a.visits ||
          b.reportedConnections - a.reportedConnections ||
          byName(a, b),
      )
    case 'irregular':
      return copy.sort(
        (a, b) => a.visits - b.visits || byName(a, b),
      )
    case 'name':
      return copy.sort(byName)
    case 'recent':
      return copy.sort(
        (a, b) =>
          (b.lastVisit ?? '').localeCompare(a.lastVisit ?? '') ||
          byName(a, b),
      )
  }
}

/** Destinataires irreguliers : sous le seuil de connexions. */
export function irregularRecipients(
  list: SmsRecipient[],
  threshold: number,
): SmsRecipient[] {
  return list.filter((r) => !isRegular(r, threshold))
}

/** Repartition des clients par nombre de connexions (pour le resume). */
export function activitySummary(
  list: ConnectionProfile[],
  threshold: number,
): { regular: number; irregular: number; totalConnections: number } {
  let regular = 0
  let totalConnections = 0

  for (const r of list) {
    if (isRegular(r, threshold)) regular += 1
    totalConnections += r.visits
  }

  return {
    regular,
    irregular: list.length - regular,
    totalConnections,
  }
}
