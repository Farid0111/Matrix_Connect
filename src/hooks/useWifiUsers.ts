import { useCallback, useEffect, useState } from 'react'
import { fetchWifiUsers } from '../api/firestore'
import type { WifiUser } from '../types'

export function useWifiUsers() {
  const [users, setUsers] = useState<WifiUser[]>([])
  const [rawUsers, setRawUsers] = useState<WifiUser[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (mode: 'initial' | 'silent' | 'manual' = 'silent') => {
    try {
      setError(null)
      if (mode === 'manual') setRefreshing(true)
      const data = await fetchWifiUsers()
      setUsers(data.users)
      setRawUsers(data.rawUsers)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  const refresh = useCallback(() => {
    void load('manual')
  }, [load])

  useEffect(() => {
    void load('initial')
  }, [load])

  return { users, rawUsers, loading, refreshing, error, refresh }
}
