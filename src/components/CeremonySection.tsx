import { useEffect, useMemo, useState } from 'react'
import type { ClientRank, WifiUser } from '../types'
import {
  loadCeremonySelection,
  saveCeremonySelection,
} from '../utils/ceremonyStorage'
import { decodeMac, formatTimestamp } from '../utils/format'
import {
  availableMonthKeys,
  formatMonthLabel,
  monthKeyFromDate,
  rankClientsForMonth,
} from '../utils/ranking'

interface CeremonySectionProps {
  rawUsers: WifiUser[]
  loading: boolean
}

function Medal({ rank }: { rank: number }) {
  if (rank === 1) return <span className="medal gold">1</span>
  if (rank === 2) return <span className="medal silver">2</span>
  if (rank === 3) return <span className="medal bronze">3</span>
  return <span className="rank-num">{rank}</span>
}

export function CeremonySection({ rawUsers, loading }: CeremonySectionProps) {
  const months = useMemo(() => availableMonthKeys(rawUsers), [rawUsers])
  const [monthKey, setMonthKey] = useState(monthKeyFromDate)
  const [winnerIds, setWinnerIds] = useState<string[]>([])
  const [bestClientId, setBestClientId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    if (!months.includes(monthKey) && months.length) {
      setMonthKey(months[0])
    }
  }, [months, monthKey])

  useEffect(() => {
    const saved = loadCeremonySelection(monthKey)
    setWinnerIds(saved.winnerIds)
    setBestClientId(saved.bestClientId)
  }, [monthKey])

  const ranking = useMemo(
    () => rankClientsForMonth(rawUsers, monthKey),
    [rawUsers, monthKey],
  )

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return ranking
    return ranking.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        c.zone.toLowerCase().includes(q) ||
        decodeMac(c.mac).toLowerCase().includes(q),
    )
  }, [ranking, search])

  const top3 = ranking.slice(0, 3)
  const autoBest = ranking[0] ?? null
  const best =
    ranking.find((c) => c.id === bestClientId) ?? autoBest

  const selectedWinners = useMemo(
    () =>
      winnerIds
        .map((id) => ranking.find((c) => c.id === id))
        .filter((c): c is ClientRank => Boolean(c)),
    [winnerIds, ranking],
  )

  function persist(nextWinners: string[], nextBest: string | null) {
    saveCeremonySelection({
      monthKey,
      winnerIds: nextWinners,
      bestClientId: nextBest,
      updatedAt: new Date().toISOString(),
    })
  }

  function showToast(message: string) {
    setToast(message)
    window.setTimeout(() => setToast(null), 2200)
  }

  function toggleWinner(id: string) {
    setWinnerIds((prev) => {
      const next = prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev, id]
      persist(next, bestClientId)
      return next
    })
  }

  function designateBest(id: string) {
    setBestClientId(id)
    setWinnerIds((prev) => {
      const next = prev.includes(id) ? prev : [...prev, id]
      persist(next, id)
      return next
    })
    showToast('Meilleur client du mois désigné')
  }

  function selectTop(n: number) {
    const next = ranking.slice(0, n).map((c) => c.id)
    const nextBest = ranking[0]?.id ?? null
    setWinnerIds(next)
    setBestClientId(nextBest)
    persist(next, nextBest)
    showToast(`Top ${n} sélectionné pour la cérémonie`)
  }

  function drawRandom(count = 3) {
    if (ranking.length === 0) return
    const pool = [...ranking]
    const picked: string[] = []
    const n = Math.min(count, pool.length)
    for (let i = 0; i < n; i++) {
      const idx = Math.floor(Math.random() * pool.length)
      picked.push(pool[idx].id)
      pool.splice(idx, 1)
    }
    setWinnerIds(picked)
    const nextBest = picked[0] ?? null
    setBestClientId(nextBest)
    persist(picked, nextBest)
    showToast('Tirage au sort effectué')
  }

  function clearSelection() {
    setWinnerIds([])
    setBestClientId(null)
    persist([], null)
    showToast('Sélection effacée')
  }

  if (loading && rawUsers.length === 0) {
    return (
      <div className="ceremony-empty">
        <span>🔄</span> Chargement du classement...
      </div>
    )
  }

  return (
    <div className="ceremony-section">
      {toast && <div className="ceremony-toast">{toast}</div>}

      <div className="ceremony-toolbar">
        <div className="ceremony-toolbar-left">
          <label className="ceremony-field">
            <span>Mois</span>
            <select
              value={monthKey}
              onChange={(e) => setMonthKey(e.target.value)}
            >
              {months.map((m) => (
                <option key={m} value={m}>
                  {formatMonthLabel(m)}
                </option>
              ))}
            </select>
          </label>
          <input
            className="search-box ceremony-search"
            type="text"
            placeholder="Filtrer les clients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="ceremony-actions">
          <button type="button" className="ghost-btn" onClick={() => selectTop(3)}>
            Top 3
          </button>
          <button type="button" className="ghost-btn" onClick={() => selectTop(5)}>
            Top 5
          </button>
          <button type="button" className="ghost-btn" onClick={() => drawRandom(3)}>
            Tirage au sort
          </button>
          <button type="button" className="ghost-btn danger" onClick={clearSelection}>
            Effacer
          </button>
        </div>
      </div>

      <div className="ceremony-hero">
        <div className="best-client-card">
          <p className="best-eyebrow">Meilleur client du mois</p>
          <h2>{formatMonthLabel(monthKey)}</h2>
          {best ? (
            <>
              <div className="best-avatar" aria-hidden="true">
                {(best.name || '?').charAt(0).toUpperCase()}
              </div>
              <p className="best-name">{best.name}</p>
              <p className="best-meta">{best.phone}</p>
              <div className="best-stats">
                <div>
                  <strong>{best.visits}</strong>
                  <span>connexions</span>
                </div>
                <div>
                  <strong>{best.zonesUsed.length || 1}</strong>
                  <span>zone(s)</span>
                </div>
                <div>
                  <strong>{best.zone}</strong>
                  <span>principale</span>
                </div>
              </div>
              {bestClientId === best.id ? (
                <span className="best-badge">Désigné manuellement</span>
              ) : (
                <span className="best-badge muted">Classement automatique</span>
              )}
            </>
          ) : (
            <p className="best-empty">Aucune activité ce mois-ci</p>
          )}
        </div>

        <div className="podium-card">
          <h3>Podium du mois</h3>
          {top3.length === 0 ? (
            <p className="no-data-chart">Pas encore de candidats</p>
          ) : (
            <div className="podium">
              {[1, 0, 2].map((pos) => {
                const client = top3[pos]
                if (!client) {
                  return <div key={pos} className={`podium-slot place-${pos + 1} empty`} />
                }
                return (
                  <button
                    key={client.id}
                    type="button"
                    className={`podium-slot place-${pos + 1}${
                      bestClientId === client.id ? ' crowned' : ''
                    }`}
                    onClick={() => designateBest(client.id)}
                    title="Désigner meilleur client"
                  >
                    <Medal rank={pos + 1} />
                    <strong>{client.name}</strong>
                    <span>{client.visits} connexions</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <div className="winners-card">
          <div className="winners-card-head">
            <h3>Sélection cérémonie</h3>
            <span className="winners-count">{selectedWinners.length} lot(s)</span>
          </div>
          {selectedWinners.length === 0 ? (
            <p className="winners-empty">
              Cochez des clients dans le classement ou utilisez Top 3 / Tirage
              au sort.
            </p>
          ) : (
            <ul className="winners-list">
              {selectedWinners.map((w, i) => (
                <li key={w.id}>
                  <span className="winner-lot">Lot {i + 1}</span>
                  <div>
                    <strong>
                      {w.name}
                      {w.id === bestClientId ? ' ★' : ''}
                    </strong>
                    <span>
                      {w.phone} · {w.visits} connexions
                    </span>
                  </div>
                  <button
                    type="button"
                    className="icon-remove"
                    onClick={() => toggleWinner(w.id)}
                    aria-label="Retirer"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="ranking-card">
        <div className="ranking-card-head">
          <h3>Classement — {formatMonthLabel(monthKey)}</h3>
          <span>{filtered.length} client(s)</span>
        </div>
        <div className="table-container ranking-table">
          <table>
            <thead>
              <tr>
                <th>Sél.</th>
                <th>#</th>
                <th>Client</th>
                <th>Téléphone</th>
                <th>Zone</th>
                <th>Connexions</th>
                <th>Dernière visite</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="no-data">
                    Aucun client pour ce mois
                  </td>
                </tr>
              ) : (
                filtered.map((c) => {
                  const rank = ranking.findIndex((r) => r.id === c.id) + 1
                  const selected = winnerIds.includes(c.id)
                  const isBest = bestClientId === c.id
                  return (
                    <tr
                      key={c.id}
                      className={`${selected ? 'row-selected' : ''}${
                        isBest ? ' row-best' : ''
                      }`}
                    >
                      <td>
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleWinner(c.id)}
                          aria-label={`Sélectionner ${c.name}`}
                        />
                      </td>
                      <td>
                        <Medal rank={rank} />
                      </td>
                      <td>
                        <div className="client-cell">
                          <strong>{c.name}</strong>
                          <span className="mac-cell">{decodeMac(c.mac)}</span>
                        </div>
                      </td>
                      <td>{c.phone}</td>
                      <td>{c.zone}</td>
                      <td>
                        <span className="visits-pill">{c.visits}</span>
                      </td>
                      <td>{formatTimestamp(c.lastVisit)}</td>
                      <td>
                        <button
                          type="button"
                          className={`mini-btn${isBest ? ' active' : ''}`}
                          onClick={() => designateBest(c.id)}
                        >
                          {isBest ? '★ Meilleur' : 'Désigner'}
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
