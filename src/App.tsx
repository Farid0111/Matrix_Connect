import { useMemo, useState } from 'react'
import { CeremonySection } from './components/CeremonySection'
import { ChartsSection } from './components/ChartsSection'
import { Controls } from './components/Controls'
import { Header } from './components/Header'
import { HexBackground } from './components/HexBackground'
import { Sidebar } from './components/Sidebar'
import { SmsSection } from './components/SmsSection'
import { StatsGrid } from './components/StatsGrid'
import { UsersTable } from './components/UsersTable'
import { useWifiUsers } from './hooks/useWifiUsers'
import type { Section } from './types'
import { decodeMac } from './utils/format'
import { buildOwnerIndex } from './utils/owners'
import './App.css'

export default function App() {
  const { users, rawUsers, loading, refreshing, error, refresh } = useWifiUsers()
  const [section, setSection] = useState<Section>('table')
  const [search, setSearch] = useState('')
  const [zone, setZone] = useState('')
  const [server, setServer] = useState('')

  /** Association numero normalise -> proprietaire, calculee sur tous les enregistrements. */
  const ownerIndex = useMemo(() => buildOwnerIndex(rawUsers), [rawUsers])

  const filteredUsers = useMemo(() => {
    const q = search.toLowerCase().trim()
    return users.filter((u) => {
      const macDecoded = decodeMac(u.mac).toLowerCase()
      const searchMatch =
        !q ||
        u.name.toLowerCase().includes(q) ||
        u.phone.toLowerCase().includes(q) ||
        u.zone.toLowerCase().includes(q) ||
        macDecoded.includes(q)
      const zoneMatch = !zone || u.zone === zone
      const serverMatch = !server || u.server === server
      return searchMatch && zoneMatch && serverMatch
    })
  }, [users, search, zone, server])

  const headerTitle =
    section === 'ceremony'
      ? 'Cérémonie & meilleurs clients'
      : section === 'charts'
        ? 'Analyse des inscriptions'
        : section === 'sms'
          ? 'Messagerie SMS'
          : 'Enregistrements WiFi'

  return (
    <>
      <HexBackground />
      <div className="floaters" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
        <i />
      </div>
      <div className="wave-top" aria-hidden="true">
        <svg viewBox="0 0 1200 120" preserveAspectRatio="none">
          <path d="M321,85.373C393,71 465,65 537,65C609,65 681,71 753,85.373C825,99 897,115 969,115C1041,115 1113,99 1185,85.373V120H0V85.373H321Z" />
        </svg>
      </div>

      <Header title={headerTitle} />

      <div className="wave-divider" aria-hidden="true">
        <svg viewBox="0 0 1200 120" preserveAspectRatio="none">
          <path
            fill="rgba(255, 212, 59, 0.08)"
            d="M321,85.373C393,71 465,65 537,65C609,65 681,71 753,85.373C825,99 897,115 969,115C1041,115 1113,99 1185,85.373V120H0V85.373H321Z"
          />
        </svg>
      </div>

      <div className="dashboard-wrapper">
        <Sidebar
          active={section}
          onChange={setSection}
          onRefresh={refresh}
          loading={refreshing}
        />

        <main className="main-content">
          {section !== 'ceremony' && (
            <StatsGrid users={users} rawUsers={rawUsers} />
          )}

          {section === 'table' && (
            <div className="content-section active">
              <Controls
                users={users}
                search={search}
                zone={zone}
                server={server}
                onSearchChange={setSearch}
                onZoneChange={setZone}
                onServerChange={setServer}
              />
              <UsersTable
                users={filteredUsers}
                loading={loading}
                error={error}
                ownerIndex={ownerIndex}
              />
            </div>
          )}

          {section === 'charts' && (
            <div className="content-section active">
              <ChartsSection users={users} />
            </div>
          )}

          {section === 'ceremony' && (
            <div className="content-section active">
              <CeremonySection rawUsers={rawUsers} loading={loading} />
            </div>
          )}

          {section === 'sms' && (
            <div className="content-section active">
              <SmsSection users={rawUsers} />
            </div>
          )}
        </main>
      </div>
    </>
  )
}
