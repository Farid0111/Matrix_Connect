const API_BASE =
  import.meta.env.VITE_SMS_API_URL || 'http://localhost:8787'

export interface SmsStatus {
  mode: string
  ready: boolean
  identity?: string | null
  model?: string | null
  version?: string | null
  error?: string
}

export interface SmsResult {
  to: string
  ok: boolean
  error?: string
}

export interface SmsBatchResult {
  total: number
  sent: number
  failed: number
  results: SmsResult[]
}

export async function fetchSmsStatus(): Promise<SmsStatus> {
  const response = await fetch(`${API_BASE}/api/sms/status`)
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }
  return (await response.json()) as SmsStatus
}

export async function sendSmsBatch(
  recipients: string[],
  message: string,
): Promise<SmsBatchResult> {
  const response = await fetch(`${API_BASE}/api/sms/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to: recipients, message }),
  })
  if (!response.ok) {
    const text = await response.text()
    throw new Error(text || `HTTP ${response.status}`)
  }
  return (await response.json()) as SmsBatchResult
}

export {
  resolveRecipients,
  type SmsRecipient,
  type SmsInvalidRecipient,
} from '../utils/owners'

export type SmsPlatform = 'ios' | 'android' | 'desktop'

export function detectPlatform(): SmsPlatform {
  const ua = navigator.userAgent
  if (/iPad|iPhone|iPod/.test(ua)) return 'ios'
  if (/Android/i.test(ua)) return 'android'
  return 'desktop'
}

/**
 * Construit le lien `sms:` multi-destinataires.
 *
 * iOS     : sms:/open?addresses=%2B229..,%2B229..&body=texte
 * Android : sms:+229..;+229..?body=texte
 *
 * Le "+" est encode en %2B dans l'URL iOS car il se trouve dans une query
 * string, ou un "+" brut serait decode en espace.
 */
export function buildSmsUrl(
  recipients: string[],
  message: string,
  platform: SmsPlatform = detectPlatform(),
): string {
  const list = recipients.filter((r) => r && r.length > 0)
  if (list.length === 0) return ''

  const body = encodeURIComponent(message)

  if (platform === 'ios') {
    const addresses = list.map((r) => encodeURIComponent(r)).join(',')
    return `sms:/open?addresses=${addresses}&body=${body}`
  }
  if (platform === 'android') {
    return `sms:${list.join(';')}?body=${body}`
  }
  return `sms:${list[0]}?body=${body}`
}

/**
 * Ouvre l'app SMS native du telephone avec un ou plusieurs destinataires
 * et le message pre-rempli. A utiliser depuis le dashboard ouvert sur le mobile.
 */
export function openNativeSmsApp(
  recipients: string | string[],
  message: string,
): void {
  const list = Array.isArray(recipients) ? recipients : [recipients]
  const url = buildSmsUrl(list, message)
  if (!url) return

  // Un vrai element <a> cliqué est bien plus fiable que location.href
  // sur iOS Safari, qui ignore parfois les navigations vers un schema perso.
  const link = document.createElement('a')
  link.href = url
  link.rel = 'external'
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  window.setTimeout(() => link.remove(), 1000)
}
