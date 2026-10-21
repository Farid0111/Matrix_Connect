export function formatTimestamp(dateStr: string | null): string {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function decodeMac(mac: string): string {
  if (!mac) return ''
  return mac.replace(/%3A/gi, ':')
}

export function isToday(dateStr: string): boolean {
  return new Date(dateStr).toDateString() === new Date().toDateString()
}

export function isRecentlyConnected(dateStr: string | null, minutes = 5): boolean {
  if (!dateStr) return false
  const diff = Date.now() - new Date(dateStr).getTime()
  return diff >= 0 && diff <= minutes * 60 * 1000
}

export function isThisWeek(dateStr: string): boolean {
  const now = new Date()
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - now.getDay())
  startOfWeek.setHours(0, 0, 0, 0)
  const d = new Date(dateStr)
  return d >= startOfWeek && d <= now
}
