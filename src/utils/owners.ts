import { normalizePhone } from './phone'

/**
 * Association numero de telephone -> proprietaire.
 *
 * Un meme numero apparait souvent dans plusieurs enregistrements Firestore :
 *   - plusieurs MAC (la personne a change d'appareil ou de carte SIM) ;
 *   - plusieurs zones / serveurs ;
 *   - plusieurs dates de passage.
 *
 * Le proprietaire retenu est le nom de l'enregistrement le plus recent pour
 * ce numero. Les autres noms vus sont conserves comme alias afin de
 * detecter les numeros partages (famille, collegues, revendeur).
 */

export interface PhoneRecord {
  name: string
  phone: string
  mac: string
  zone: string
  server?: string
  createdAt: string | null
  connectionCount: number
}

export interface PhoneOwner {
  /** Numero normalise E.164, null si le numero est inexploitable */
  e164: string | null
  /** Numero brut d'origine (celui de l'enregistrement le plus recent) */
  raw: string
  /** Proprietaire : nom de l'enregistrement le plus recent pour ce numero */
  name: string
  /** Autres noms rencontres pour ce meme numero */
  aliases: string[]
  /** Toutes les adresses MAC associees a ce numero */
  macs: string[]
  /** Toutes les zones ou ce numero a ete vu */
  zones: string[]
  /**
   * Nombre de connexions du client.
   *
   * Le champ `connectionCount` de la collection n'est renseigne que sur les
   * documents recents ; les anciens ne portent que leur existence, chaque
   * document correspondant a une connexion. On additionne donc, par appareil
   * (MAC), le plus grand des deux : le compteur renseigne par le portail, ou
   * le nombre de documents de cet appareil.
   */
  connections: number
  /** Somme brute des valeurs du champ `connectionCount` */
  reportedConnections: number
  /** Nombre de documents enregistres pour ce numero */
  visits: number
  /** Nombre de jours distincts avec au moins un passage */
  daysActive: number
  /** Derniere visite connue pour ce numero */
  lastVisit: string | null
  /** Premiere visite connue pour ce numero */
  firstVisit: string | null
  /** Nombre d'enregistrements agreges */
  records: number
  /** Raison du rejet si e164 est null */
  error: string | null
}

interface DeviceCounter {
  /** Nombre de documents enregistres pour cet appareil */
  docs: number
  /** Plus grand `connectionCount` renseigne pour cet appareil */
  counter: number
}

interface Accumulator {
  e164: string | null
  error: string | null
  raw: string
  name: string
  /** Timestamp de l'enregistrement ayant fourni le nom courant */
  nameAt: number
  aliases: string[]
  macs: Set<string>
  zones: Set<string>
  days: Set<string>
  devices: Map<string, DeviceCounter>
  visits: number
  reportedConnections: number
  lastVisit: string | null
  lastVisitAt: number
  firstVisit: string | null
  firstVisitAt: number
  records: number
}

/** Certains enregistrements placent le numero de telephone dans le champ "name". */
function looksLikePhone(value: string): boolean {
  if (!/^[\d\s+()./-]+$/.test(value)) return false
  if (normalizePhone(value).e164 !== null) return true
  return /^\d{6,}$/.test(value.replace(/\D/g, ''))
}

function cleanName(name: string | null | undefined): string {
  const v = (name ?? '').trim()
  if (!v || v === '-') return ''
  if (looksLikePhone(v)) return ''
  return v
}

function timeOf(dateStr: string | null | undefined): number {
  if (!dateStr) return 0
  const t = new Date(dateStr).getTime()
  return Number.isNaN(t) ? 0 : t
}

function pushAlias(acc: Accumulator, name: string): void {
  if (!name) return
  if (acc.aliases.some((a) => a.toLowerCase() === name.toLowerCase())) return
  acc.aliases.push(name)
}

/**
 * Regroupe les enregistrements par numero normalise.
 * Un numero inexploitable est groupe a part (cle `raw:<valeur brute>`).
 */
export function groupByPhone(records: PhoneRecord[]): PhoneOwner[] {
  const groups = new Map<string, Accumulator>()

  for (const record of records) {
    const { e164, error, raw } = normalizePhone(record.phone)
    const key = e164 ?? `raw:${raw}`
    const time = timeOf(record.createdAt)
    const name = cleanName(record.name)

    let acc = groups.get(key)

    if (!acc) {
      acc = {
        e164,
        error: error ?? null,
        raw,
        name,
        nameAt: time,
        aliases: [],
        macs: new Set<string>(),
        zones: new Set<string>(),
        days: new Set<string>(),
        devices: new Map<string, DeviceCounter>(),
        visits: 1,
        reportedConnections: record.connectionCount ?? 0,
        lastVisit: record.createdAt ?? null,
        lastVisitAt: time,
        firstVisit: record.createdAt ?? null,
        firstVisitAt: time,
        records: 1,
      }
      groups.set(key, acc)
    } else {
      acc.records += 1
      acc.visits += 1
      acc.reportedConnections = Math.max(
        acc.reportedConnections,
        record.connectionCount ?? 0,
      )

      if (time > acc.lastVisitAt) {
        acc.lastVisitAt = time
        acc.lastVisit = record.createdAt ?? null
        acc.raw = raw
      }

      if (time < acc.firstVisitAt) {
        acc.firstVisitAt = time
        acc.firstVisit = record.createdAt ?? null
      }

      if (time > acc.nameAt) {
        // Enregistrement plus recent : il porte le nouveau proprietaire.
        const previous = acc.name
        if (name) {
          acc.name = name
          acc.nameAt = time
          // L'ancien nom ne devient un alias que s'il differe du nouveau.
          if (previous && previous.toLowerCase() !== name.toLowerCase()) {
            pushAlias(acc, previous)
          }
        } else {
          // Pas de nom exploitable : on garde l'ancien proprietaire mais on
          // considere la position du nom comme plus recente.
          acc.nameAt = time
        }
      } else {
        // Enregistrement plus ancien : son nom devient un alias.
        if (!acc.name) {
          acc.name = name
        } else if (name && name.toLowerCase() !== acc.name.toLowerCase()) {
          pushAlias(acc, name)
        }
      }
    }

    if (record.mac && record.mac !== '-') {
      acc.macs.add(record.mac)
      const device = acc.devices.get(record.mac) ?? { docs: 0, counter: 0 }
      device.docs += 1
      device.counter = Math.max(device.counter, record.connectionCount ?? 0)
      acc.devices.set(record.mac, device)
    }
    if (record.zone && record.zone !== '-') acc.zones.add(record.zone)
    if (record.createdAt) acc.days.add(record.createdAt.slice(0, 10))
  }

  return Array.from(groups.values())
    .map((acc) => {
      // Par appareil : le compteur renseigne par le portail s'il existe,
      // sinon le nombre de documents (1 document = 1 connexion).
      let connections = 0
      for (const device of acc.devices.values()) {
        connections += Math.max(device.counter, device.docs)
      }

      return {
        e164: acc.e164,
        raw: acc.raw,
        name: acc.name,
        aliases: acc.aliases,
        macs: Array.from(acc.macs),
        zones: Array.from(acc.zones).sort(),
        connections,
        visits: acc.visits,
        reportedConnections: acc.reportedConnections,
        daysActive: acc.days.size,
        lastVisit: acc.lastVisit,
        firstVisit: acc.firstVisit,
        records: acc.records,
        error: acc.error,
      }
    })
    .sort((a, b) => {
      const an = a.name || a.raw
      const bn = b.name || b.raw
      const cmp = an.localeCompare(bn, 'fr', { sensitivity: 'base' })
      if (cmp !== 0) return cmp
      return (a.e164 ?? a.raw).localeCompare(b.e164 ?? b.raw)
    })
}

/** Proprietaires dont le numero est exploitable, tries par nom. */
export function buildPhoneOwners(records: PhoneRecord[]): PhoneOwner[] {
  return groupByPhone(records).filter((o) => o.e164 !== null)
}

/**
 * Indexe numero normalise -> proprietaire.
 * Utile pour relier un numero affiche ailleurs (tableau, podium) a son nom.
 */
export function buildOwnerIndex(records: PhoneRecord[]): Map<string, PhoneOwner> {
  const index = new Map<string, PhoneOwner>()
  for (const owner of buildPhoneOwners(records)) {
    if (owner.e164) index.set(owner.e164, owner)
  }
  return index
}

/** Nom du proprietaire d'un numero, ou une valeur de repli. */
export function ownerNameFor(
  phone: string,
  index: Map<string, PhoneOwner>,
  fallback = 'Inconnu',
): string {
  const { e164 } = normalizePhone(phone)
  if (!e164) return fallback
  return index.get(e164)?.name || fallback
}

export interface SmsRecipient {
  /** Numero normalise E.164, ex: +2290155541115 */
  e164: string
  /** Proprietaire du numero (nom le plus recent) */
  name: string
  /** Numero brut d'origine */
  raw: string
  /** Autres noms vus pour ce numero */
  aliases: string[]
  /** MAC associees a ce numero */
  macs: string[]
  /** Zones ou ce numero a ete vu */
  zones: string[]
  /** Nombre de connexions du client (champ `connectionCount`, sinon documents) */
  connections: number
  /** Nombre de documents enregistres pour ce numero */
  visits: number
  /** Somme brute des valeurs du champ `connectionCount` */
  reportedConnections: number
  /** Nombre de jours distincts avec au moins un passage */
  daysActive: number
  /** Derniere visite connue */
  lastVisit: string | null
  /** Premiere visite connue */
  firstVisit: string | null
  /** Nombre d'enregistrements agreges pour ce numero */
  records: number
}

export interface SmsInvalidRecipient {
  raw: string
  name: string
  reason: string
}

/**
 * Convertit une liste d'enregistrements clients en destinataires valides,
 * en associant chaque numero a son proprietaire et en ignorant les numeros
 * inexploitables.
 */
export function resolveRecipients(
  records: PhoneRecord[],
): { valid: SmsRecipient[]; invalid: SmsInvalidRecipient[] } {
  const valid: SmsRecipient[] = []
  const invalid: SmsInvalidRecipient[] = []

  for (const owner of groupByPhone(records)) {
    if (owner.e164) {
      valid.push({
        e164: owner.e164,
        name: owner.name,
        raw: owner.raw,
        aliases: owner.aliases,
        macs: owner.macs,
        zones: owner.zones,
        connections: owner.connections,
        visits: owner.visits,
        reportedConnections: owner.reportedConnections,
        daysActive: owner.daysActive,
        lastVisit: owner.lastVisit,
        firstVisit: owner.firstVisit,
        records: owner.records,
      })
    } else {
      invalid.push({
        raw: owner.raw,
        name: owner.name,
        reason: owner.error ?? 'Numéro invalide',
      })
    }
  }

  return { valid, invalid }
}
