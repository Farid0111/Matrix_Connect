/**
 * Client RouterOS REST API (RouterOS 7.1+) — HTTP pur, aucune dépendance.
 * Le service doit être activé sur le routeur :  /ip service enable rest-api
 *
 * Le dashboard est en HTTPS, donc on accepte un certificat auto-signé
 * (variable d'environnement NODE_TLS_REJECT_UNAUTHORIZED=0 côté serveur).
 */

const DEFAULT_PORT = 443

export class RouterOsRest {
  constructor({ host, port = DEFAULT_PORT, user, password, timeout = 10000 }) {
    this.host = host
    this.port = port
    this.user = user
    this.password = password
    this.timeout = timeout
  }

  async request(method, path, body) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), this.timeout)
    const auth = Buffer.from(`${this.user}:${this.password}`).toString('base64')

    try {
      const response = await fetch(`https://${this.host}:${this.port}${path}`, {
        method,
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      })

      const text = await response.text()
      const data = text ? safeJson(text) : null

      if (!response.ok) {
        const detail =
          (data && (data.error || data.message || data.detail)) || text
        throw new Error(`RouterOS ${response.status}: ${detail || 'erreur'}`)
      }

      return data
    } catch (err) {
      if (err.name === 'AbortError') {
        throw new Error(`Timeout RouterOS après ${this.timeout}ms`)
      }
      throw err
    } finally {
      clearTimeout(timer)
    }
  }

  /** Vérifie la connectivité et récupère l'identité du routeur. */
  async ping() {
    const resource = await this.request('GET', '/rest/system/resource')
    return {
      ok: true,
      identity: resource?.identity ?? null,
      model: resource?.['board-name'] ?? null,
      version: resource?.version ?? null,
      uptime: resource?.uptime ?? null,
    }
  }

  /**
   * Envoie un SMS via /tool sms-send.
   * Nécessite un modem USB (Huawei/ZTE) branché sur le routeur avec une carte SIM.
   */
  async sendSms(phoneNumber, message) {
    const result = await this.request('POST', '/rest/tool/sms-send', {
      'phone-number': phoneNumber,
      message,
    })
    return result
  }
}

function safeJson(text) {
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}
