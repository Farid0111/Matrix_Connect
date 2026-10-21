import { DB_URL } from '../src/api/firestore'
import { groupByPhone, type PhoneRecord } from '../src/utils/owners'

/**
 * Analyse la collection reelle `freeWifiUsers` :
 *   - nombre de documents et de numeros distincts ;
 *   - association numero -> proprietaire ;
 *   - numeros partages (plusieurs noms) ;
 *   - numeros sans nom exploitable ;
 *   - numeros inexploitables.
 *
 * Usage : npx tsx scripts/test-phones-collection.ts
 * Necessite un quota Firestore disponible (sinon HTTP 429).
 */

interface FirestoreField {
  stringValue?: string
  timestampValue?: string
  integerValue?: string
  doubleValue?: number
}

interface FirestoreDocument {
  fields?: Record<string, FirestoreField>
}

interface FirestoreResponse {
  documents?: FirestoreDocument[]
  nextPageToken?: string
}

function readNumber(field: FirestoreField | undefined): number {
  if (!field) return 0
  if (field.integerValue !== undefined) return Number(field.integerValue) || 0
  if (field.doubleValue !== undefined) return field.doubleValue
  if (field.stringValue !== undefined) return Number(field.stringValue) || 0
  return 0
}

async function fetchAll(): Promise<PhoneRecord[]> {
  const docs: FirestoreDocument[] = []
  let pageToken: string | undefined
  const seen = new Set<string>()

  do {
    const url = pageToken
      ? `${DB_URL}&pageToken=${encodeURIComponent(pageToken)}`
      : DB_URL
    const response = await fetch(url, { headers: { Accept: 'application/json' } })
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${await response.text()}`)
    }
    const data = (await response.json()) as FirestoreResponse
    docs.push(...(data.documents ?? []))
    pageToken = data.nextPageToken
    if (pageToken) {
      if (seen.has(pageToken)) break
      seen.add(pageToken)
      await new Promise((r) => setTimeout(r, 150))
    }
  } while (pageToken)

  return docs
    .map((doc) => {
      const f = doc.fields ?? {}
      return {
        name: f.name?.stringValue ?? '-',
        phone: f.phone?.stringValue ?? '-',
        mac: f.mac?.stringValue ?? '-',
        zone: f.zone?.stringValue ?? '-',
        server: f.server?.stringValue ?? '-',
        createdAt: f.createdAt?.timestampValue ?? null,
        connectionCount: readNumber(f.connectionCount),
      }
    })
    .filter((r) => r.mac && r.mac !== '-')
}

const records = await fetchAll()
const groups = groupByPhone(records)
const valid = groups.filter((g) => g.e164)
const invalid = groups.filter((g) => !g.e164)
const shared = valid.filter((g) => g.aliases.length > 0)
const unnamed = valid.filter((g) => !g.name)

console.log('documents lus          :', records.length)
console.log('numeros distincts      :', groups.length)
console.log('  exploitables         :', valid.length)
console.log('  inexploitables       :', invalid.length)
console.log('sans nom               :', unnamed.length)
console.log('numeros partages       :', shared.length)
console.log('')

console.log('numeros sans nom :')
for (const g of unnamed) {
  console.log('  ', g.e164, '| brut :', g.raw, '| macs :', g.macs.length)
}
console.log('')

console.log('numeros partages (alias) :')
for (const g of shared) {
  console.log('  ', g.e164, '->', g.name, '| alias :', g.aliases.join(', '))
}
console.log('')

console.log('numeros inexploitables (avec leur proprietaire) :')
for (const g of invalid) {
  console.log(
    '  ',
    (g.name || '(sans nom)').padEnd(26),
    g.raw.padEnd(16),
    g.error,
  )
}
console.log('')

console.log('extrait de la liste numero -> proprietaire :')
for (const g of valid.slice(0, 25)) {
  console.log(
    '  ',
    (g.e164 ?? '').padEnd(18),
    (g.name || '(sans nom)').padEnd(28),
    `${g.records} enr.`,
    `${g.connections} conn.`,
  )
}
