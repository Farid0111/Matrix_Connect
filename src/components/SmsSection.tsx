import { useEffect, useMemo, useState } from 'react'
import type { WifiUser } from '../types'
import {
  buildSmsUrl,
  detectPlatform,
  fetchSmsStatus,
  openNativeSmsApp,
  resolveRecipients,
  sendSmsBatch,
  type SmsStatus,
} from '../api/sms'
import { normalizePhone } from '../utils/phone'

interface SmsSectionProps {
  users: WifiUser[]
}

export function SmsSection({ users }: SmsSectionProps) {
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState<SmsStatus | null>(null)
  const [statusError, setStatusError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{
    sent: number
    failed: number
    total: number
    errors: string[]
  } | null>(null)
  const [sendError, setSendError] = useState<string | null>(null)
  const [nativeError, setNativeError] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [query, setQuery] = useState('')

  useEffect(() => {
    let cancelled = false
    fetchSmsStatus()
      .then((s) => {
        if (!cancelled) {
          setStatus(s)
          setStatusError(null)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setStatusError(
            err instanceof Error ? err.message : 'Passerelle injoignable',
          )
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  const { valid, invalid } = useMemo(
    () => resolveRecipients(users),
    [users],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return valid
    return valid.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.e164.includes(q) ||
        r.raw.toLowerCase().includes(q) ||
        r.aliases.some((a) => a.toLowerCase().includes(q)),
    )
  }, [valid, query])

  const selectedRecipients = useMemo(
    () => valid.filter((r) => selected.has(r.e164)),
    [valid, selected],
  )

  const platform = useMemo(() => detectPlatform(), [])
  const previewUrl = useMemo(
    () =>
      buildSmsUrl(
        selectedRecipients.length > 0
          ? selectedRecipients.map((r) => r.e164)
          : valid.slice(0, 2).map((r) => r.e164),
        message,
        platform,
      ),
    [selectedRecipients, valid, message, platform],
  )

  function toggle(recipient: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(recipient)) next.delete(recipient)
      else next.add(recipient)
      return next
    })
  }

  function selectAll() {
    setSelected(new Set(filtered.map((r) => r.e164)))
  }

  function clearSelection() {
    setSelected(new Set())
  }

  async function handleSend() {
    const targets =
      selectedRecipients.length > 0
        ? selectedRecipients.map((r) => r.e164)
        : valid.map((r) => r.e164)
    if (targets.length === 0) {
      setSendError('Aucun destinataire valide')
      return
    }
    if (!message.trim()) {
      setSendError('Le message est vide')
      return
    }

    setSending(true)
    setSendError(null)
    setResult(null)

    try {
      const res = await sendSmsBatch(targets, message.trim())
      setResult({
        sent: res.sent,
        failed: res.failed,
        total: res.total,
        errors: res.results
          .filter((r) => !r.ok)
          .slice(0, 10)
          .map((r) => `${r.to} : ${r.error ?? 'echec'}`),
      })
    } catch (err) {
      setSendError(
        err instanceof Error ? err.message : 'Envoi impossible',
      )
    } finally {
      setSending(false)
    }
  }

  function handleNativeSend(recipient: string) {
    if (!message.trim()) {
      setNativeError('Le message est vide')
      return
    }
    setNativeError(null)
    openNativeSmsApp(recipient, message.trim())
  }

  function handleNativeGroupSend() {
    if (!message.trim()) {
      setNativeError('Le message est vide')
      return
    }
    const targets =
      selectedRecipients.length > 0
        ? selectedRecipients.map((r) => r.e164)
        : valid.map((r) => r.e164)
    if (targets.length === 0) {
      setNativeError('Aucun destinataire valide')
      return
    }
    setNativeError(null)

    const platform = detectPlatform()
    if (platform === 'desktop') {
      setNativeError(
        "Le lien d'envoi ne peut pas fonctionner depuis un ordinateur. " +
          'Ouvre ce dashboard sur ton telephone, ou utilise le pont SMS.',
      )
      return
    }

    openNativeSmsApp(targets, message.trim())
  }

  const isReady = status?.ready ?? false

  return (
    <div className="sms-section">
      <div className="sms-toolbar">
        <div className="sms-status">
          <span
            className={`status-dot${isReady ? ' on' : ' off'}`}
            aria-hidden="true"
          />
          <div>
            <strong>
              {statusError
                ? 'Passerelle SMS injoignable'
                : isReady
                  ? 'Passerelle SMS prete'
                  : 'Passerelle SMS non configuree'}
            </strong>
            <span>
              {statusError ??
                (status?.identity
                  ? `${status.identity}${status.version ? ` — RouterOS ${status.version}` : ''}`
                  : (status?.error ?? 'Verifiez le serveur SMS'))}
            </span>
          </div>
        </div>

        <div className="sms-counts">
          <span className="sms-count valid">{valid.length} valide(s)</span>
          {invalid.length > 0 && (
            <span className="sms-count invalid">
              {invalid.length} invalide(s)
            </span>
          )}
        </div>
      </div>

      <div className="sms-compose">
        <label className="sms-field">
          <span>Message</span>
          <textarea
            className="sms-textarea"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Votre message..."
            maxLength={480}
            rows={4}
          />
        </label>
        <div className="sms-compose-meta">
          <span>{message.length} / 480</span>
          <span>{message.length > 0 ? Math.ceil(message.length / 160) : 0} SMS</span>
        </div>
      </div>

      <div className="sms-recipients">
        <div className="sms-recipients-head">
          <h3>Destinataires</h3>
          <div className="sms-actions">
            <input
              type="search"
              className="sms-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher un nom ou un numéro..."
            />
            <button type="button" className="ghost-btn" onClick={selectAll}>
              Tout selectionner
            </button>
            <button type="button" className="ghost-btn" onClick={clearSelection}>
              Deselectionner
            </button>
          </div>
        </div>

        {valid.length === 0 ? (
          <p className="winners-empty">Aucun numero exploitable</p>
        ) : (
          <>
            {filtered.length === 0 && (
              <p className="winners-empty">
                Aucun destinataire ne correspond à « {query} »
              </p>
            )}
            <ul className="sms-list">
              {filtered.map((r) => (
                <li key={r.e164}>
                  <label className="sms-check">
                    <input
                      type="checkbox"
                      checked={selected.has(r.e164)}
                      onChange={() => toggle(r.e164)}
                    />
                    <span className="sms-identity">
                      <span className="sms-owner">
                        {r.name || 'Sans nom'}
                      </span>
                      <span className="sms-number">{r.e164}</span>
                      {r.aliases.length > 0 && (
                        <span className="sms-alias">
                          aussi : {r.aliases.join(', ')}
                        </span>
                      )}
                    </span>
                  </label>
                  <button
                    type="button"
                    className="sms-native-btn"
                    onClick={() => handleNativeSend(r.e164)}
                    disabled={!message.trim()}
                    title={`Ouvrir dans l'application SMS du telephone (${r.name || r.e164})`}
                  >
                    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path
                        d="M21 4H3a1.5 1.5 0 0 0-1.5 1.5v13A1.5 1.5 0 0 0 3 20h18a1.5 1.5 0 0 0 1.5-1.5v-13A1.5 1.5 0 0 0 21 4Z"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      />
                      <path
                        d="M8 9h8M8 13h5"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                      />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}

        {invalid.length > 0 && (
          <details className="sms-invalid">
            <summary>
              {invalid.length} numero(s) non exploitables (cliquez pour voir)
            </summary>
            <ul>
              {invalid.map((v) => (
                <li key={`${v.raw}-${v.name}`}>
                  <span>
                    <strong>{v.name || 'Sans nom'}</strong> — {v.raw || '(vide)'}
                  </span>
                  <em>{v.reason}</em>
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>

      <div className="sms-send">
        <button
          type="button"
          className="sms-send-btn"
          onClick={handleSend}
          disabled={sending || valid.length === 0 || !message.trim()}
        >
          {sending
            ? 'Envoi en cours...'
            : `Envoyer a ${selectedRecipients.length > 0 ? selectedRecipients.length : valid.length} numero(s)`}
        </button>
        <button
          type="button"
          className="sms-send-btn sms-send-btn-native"
          onClick={handleNativeGroupSend}
          disabled={!message.trim() || valid.length === 0}
        >
          Envoyer le groupe via l&apos;app SMS du telephone
        </button>
      </div>

      {nativeError && <p className="sms-feedback error">{nativeError}</p>}

      <details className="sms-debug">
        <summary>Diagnostic de l&apos;envoi natif</summary>
        <dl>
          <dt>Plateforme detectee</dt>
          <dd>
            {platform === 'ios'
              ? 'iOS / iPadOS'
              : platform === 'android'
                ? 'Android'
                : 'Ordinateur (le lien sms: ne fonctionnera pas)'}
          </dd>
          <dt>Lien genere</dt>
          <dd>
            <code>{previewUrl || '(aucun destinataire)'}</code>
          </dd>
          <dt>Destinataires selectionnes</dt>
          <dd>
            {selectedRecipients.length > 0
              ? `${selectedRecipients.length} (${selectedRecipients
                  .slice(0, 3)
                  .map((r) => `${r.name || 'Sans nom'} ${r.e164}`)
                  .join(', ')}${selectedRecipients.length > 3 ? '...' : ''})`
              : `${valid.length} disponible(s)`}
          </dd>
        </dl>
        <p>
          Si le lien ne s&apos;ouvre pas, l&apos;app SMS du systeme refuse le
          schema <code>sms:</code> multi-destinataires. Dans ce cas, utilise le
          pont <code>python3 server/phone_bridge.py</code> en mode{' '}
          <code>phone</code>, ou branche un modem USB sur le MikroTik (mode{' '}
          <code>routeros</code>) pour un envoi automatique.
        </p>
      </details>

      {sendError && <p className="sms-feedback error">{sendError}</p>}

      {result && (
        <p className={`sms-feedback ${result.failed > 0 ? 'warn' : 'ok'}`}>
          {result.sent} envoye(s) sur {result.total}
          {result.failed > 0 ? ` — ${result.failed} echec(s)` : ''}
          {result.errors.length > 0 && (
            <ul>
              {result.errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          )}
        </p>
      )}
    </div>
  )
}

export function phonePreview(phone: string) {
  return normalizePhone(phone)
}
