import type { WifiUser } from '../types'
import { decodeMac, formatTimestamp, isRecentlyConnected } from '../utils/format'
import { normalizePhone } from '../utils/phone'
import type { PhoneOwner } from '../utils/owners'
import { PhoneCell } from './PhoneCell'

interface UsersTableProps {
  users: WifiUser[]
  loading: boolean
  error: string | null
  /** Association numero normalise -> proprietaire */
  ownerIndex?: Map<string, PhoneOwner>
}

export function UsersTable({
  users,
  loading,
  error,
  ownerIndex,
}: UsersTableProps) {
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
            <th>Connexions</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          {loading && (
            <tr>
              <td colSpan={8} className="loading">
                <span>🔄</span> Chargement...
              </td>
            </tr>
          )}
          {!loading && error && (
            <tr>
              <td colSpan={8} className="no-data">
                <span>❌</span> Erreur: {error}
              </td>
            </tr>
          )}
          {!loading && !error && users.length === 0 && (
            <tr>
              <td colSpan={8} className="no-data">
                <span>ℹ️</span> Aucun enregistrement
              </td>
            </tr>
          )}
{!loading &&
              !error &&
              users.map((u, i) => {
                const recent = isRecentlyConnected(u.createdAt, 60)
                const { e164 } = normalizePhone(u.phone)
                const owner = e164 ? ownerIndex?.get(e164) : undefined
                const ownerName = owner?.name || u.name
                const otherName =
                  ownerName && u.name && u.name !== ownerName ? u.name : null
                return (
                  <tr
                    key={`${u.mac}-${u.createdAt ?? i}`}
                    className={recent ? 'recent' : ''}
                  >
                    <td>{i + 1}</td>
                    <td>
                      <span className="owner-cell">{ownerName}</span>
                      {otherName && (
                        <span className="owner-alias">{otherName}</span>
                      )}
                    </td>
                    <td>
                      <PhoneCell phone={u.phone} />
                    </td>
                    <td>{u.zone}</td>
                    <td>{u.server}</td>
                    <td className="mac-cell">{decodeMac(u.mac)}</td>
                    <td>
                      <span
                        className="total-pill"
                        title={`${owner?.connections ?? 0} connexion(s) pour ce numero`}
                      >
                        {owner?.connections ?? 0}
                      </span>
                    </td>
                    <td>{formatTimestamp(u.createdAt)}</td>
                  </tr>
                )
              })}
        </tbody>
      </table>
    </div>
  )
}
