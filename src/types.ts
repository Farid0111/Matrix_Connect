export interface WifiUser {
  name: string
  phone: string
  mac: string
  zone: string
  server: string
  createdAt: string | null
  connectionCount: number
}

export type Section = 'table' | 'charts' | 'ceremony' | 'sms'

export interface Stats {
  total: number
  today: number
  week: number
  zones: number
  servers: number
}

export interface ClientRank {
  id: string
  name: string
  phone: string
  mac: string
  zone: string
  server: string
  visits: number
  connectionCount: number
  lastVisit: string | null
  zonesUsed: string[]
}

export interface CeremonySelection {
  monthKey: string
  winnerIds: string[]
  bestClientId: string | null
  updatedAt: string
}
