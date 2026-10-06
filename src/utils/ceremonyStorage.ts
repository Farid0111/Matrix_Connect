import type { CeremonySelection } from '../types'

const STORAGE_KEY = 'matrix-ceremony-selections'

function readAll(): Record<string, CeremonySelection> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as Record<string, CeremonySelection>
  } catch {
    return {}
  }
}

function writeAll(data: Record<string, CeremonySelection>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export function loadCeremonySelection(monthKey: string): CeremonySelection {
  const all = readAll()
  return (
    all[monthKey] ?? {
      monthKey,
      winnerIds: [],
      bestClientId: null,
      updatedAt: new Date().toISOString(),
    }
  )
}

export function saveCeremonySelection(selection: CeremonySelection) {
  const all = readAll()
  all[selection.monthKey] = {
    ...selection,
    updatedAt: new Date().toISOString(),
  }
  writeAll(all)
}
