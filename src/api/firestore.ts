import type { WifiUser } from '../types'

export const DB_URL =
  'https://firestore.googleapis.com/v1/projects/fahdbot-ace64/databases/(default)/documents/freeWifiUsers?key=AIzaSyB9uWscwgcxG-Db-SwT-wy8JHg6AjHLdow'

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

function dedupeByMac(users: WifiUser[]): WifiUser[] {
  const byMac = new Map<string, WifiUser>()

  for (const user of users) {
    if (!user.mac || user.mac === '-') continue
    const existing = byMac.get(user.mac)
    if (!existing) {
      byMac.set(user.mac, user)
      continue
    }

    const isNewer =
      user.createdAt &&
      (!existing.createdAt ||
        new Date(user.createdAt) > new Date(existing.createdAt))

    byMac.set(user.mac, {
      ...(isNewer ? user : existing),
      connectionCount: Math.max(
        existing.connectionCount,
        user.connectionCount,
      ),
    })
  }

  return Array.from(byMac.values())
}

function readNumber(field: FirestoreField | undefined): number {
  if (!field) return 0
  if (field.integerValue !== undefined) return Number(field.integerValue) || 0
  if (field.doubleValue !== undefined) return field.doubleValue
  if (field.stringValue !== undefined) return Number(field.stringValue) || 0
  return 0
}

function mapDocs(docs: FirestoreDocument[]): WifiUser[] {
  return docs.map((doc) => {
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
}

export interface WifiUsersPayload {
  users: WifiUser[]
  rawUsers: WifiUser[]
}

async function fetchPage(pageToken?: string): Promise<FirestoreResponse> {
  const url = pageToken
    ? `${DB_URL}&pageToken=${encodeURIComponent(pageToken)}`
    : DB_URL

  const response = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  })

  if (!response.ok) {
    if (response.status === 429) {
      // Rate limited - wait and retry once
      await new Promise(resolve => setTimeout(resolve, 1000))
      const retryResponse = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      })
      if (!retryResponse.ok) {
        throw new Error(`HTTP ${retryResponse.status}`)
      }
      return (await retryResponse.json()) as FirestoreResponse
    }
    throw new Error(`HTTP ${response.status}`)
  }

  return (await response.json()) as FirestoreResponse
}

export async function fetchWifiUsers(): Promise<WifiUsersPayload> {
  const docs: FirestoreDocument[] = []
  const seenTokens = new Set<string>()
  let pageToken: string | undefined

  do {
    const data = await fetchPage(pageToken)
    docs.push(...(data.documents ?? []))
    pageToken = data.nextPageToken
    if (pageToken) {
      if (seenTokens.has(pageToken)) break
      seenTokens.add(pageToken)
      // Small delay between paginated requests to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  } while (pageToken)

  const rawUsers = mapDocs(docs).filter((u) => u.mac && u.mac !== '-')

  return {
    users: dedupeByMac(rawUsers),
    rawUsers,
  }
}
