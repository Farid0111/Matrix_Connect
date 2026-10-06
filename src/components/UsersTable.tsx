import type { WifiUser } from '../types'
import { decodeMac, formatTimestamp } from '../utils/format'

interface UsersTableProps {
  users: WifiUser[]
  loading: boolean
  error: string | null
}

export function UsersTable({ users, loading, error }: UsersTableProps) {
  return (
    <div className="table-container">
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Nom</th>
            <th>Téléphone</th>
            <th>Zone</th>
            <th>Serveur</th>
            <th>MAC</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          {loading && (
            <tr>
              <td colSpan={7} className="loading">
                <span>🔄</span> Chargement...
              </td>
            </tr>
          )}
          {!loading && error && (
            <tr>
              <td colSpan={7} className="no-data">
                <span>❌</span> Erreur: {error}
              </td>
            </tr>
          )}
          {!loading && !error && users.length === 0 && (
            <tr>
              <td colSpan={7} className="no-data">
                <span>ℹ️</span> Aucun enregistrement
              </td>
            </tr>
          )}
          {!loading &&
            !error &&
            users.map((u, i) => (
              <tr key={`${u.mac}-${u.createdAt ?? i}`}>
                <td>{i + 1}</td>
                <td>{u.name}</td>
                <td>{u.phone}</td>
                <td>{u.zone}</td>
                <td>{u.server}</td>
                <td className="mac-cell">{decodeMac(u.mac)}</td>
                <td>{formatTimestamp(u.createdAt)}</td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  )
}
