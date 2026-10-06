import type { WifiUser } from '../types'

const DB_URL =
  'https://firestore.googleapis.com/v1/projects/fahdbot-ace64/databases/(default)/documents/freeWifiUsers?key=AIzaSyB9uWscwgcxG-Db-SwT-wy8JHg6AjHLdow'

interface FirestoreField {
  stringValue?: string
  timestampValue?: string
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
    if (
      !existing ||
      (user.createdAt &&
        (!existing.createdAt ||
          new Date(user.createdAt) > new Date(existing.createdAt)))
    ) {
      byMac.set(user.mac, user)
    }
  }

  return Array.from(byMac.values())
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
    }
  } while (pageToken)

  const rawUsers = mapDocs(docs).filter((u) => u.mac && u.mac !== '-')

  return {
    users: dedupeByMac(rawUsers),
    rawUsers,
  }
}
