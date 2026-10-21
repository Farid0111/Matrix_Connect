/**
 * Serveur SMS pour le dashboard Matrix Connect.
 *
 * Expose :
 *   GET  /api/sms/status      -> etat de la passerelle
 *   POST /api/sms/send        -> { to: string[], message: string }
 *   POST /api/sms/single      -> { to: string, message: string }
 *   GET  /api/sms/queue/next  -> prochain SMS en attente (mode phone)
 *   POST /api/sms/queue/ack   -> { id, ok, error? } (mode phone)
 *
 * Le mode d'envoi est configure par variable d'environnement :
 *   SMS_MODE=routeros | modemu | phone | log
 *
 * - routeros : passe par /tool sms-send du MikroTik (modem USB + SIM)
 * - modemu   : passe par ModemManager en local (mmcli --command AT+CMGS)
 * - phone    : met en file d'attente ; l'app SMS du telephone recupere
 *              les messages et les envoie via l'app native
 * - log      : ecrit dans le journal sans envoyer (mode test)
 */

import http from 'node:http'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { RouterOsRest } from './routeros.mjs'

const execFileAsync = promisify(execFile)

const PORT = Number(process.env.SMS_PORT || 8787)
const MODE = process.env.SMS_MODE || 'log'
const MIKROTIK_HOST = process.env.MIKROTIK_HOST || ''
const MIKROTIK_USER = process.env.MIKROTIK_USER || 'admin'
const MIKROTIK_PASSWORD = process.env.MIKROTIK_PASSWORD || ''
const MODEM_PORT = process.env.MODEM_PORT || ''

if (process.env.SMS_INSECURE_TLS === '1') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
}

const router = MIKROTIK_HOST
  ? new RouterOsRest({
      host: MIKROTIK_HOST,
      user: MIKROTIK_USER,
      password: MIKROTIK_PASSWORD,
    })
  : null

/**
 * File d'attente des SMS en mode "phone".
 * L'app SMS du telephone interroge cette file et confirme chaque envoi.
 */
const queue = []
let queueSeq = 0
const QUEUE_MAX = 1000

function enqueue(phone, message) {
  if (queue.length >= QUEUE_MAX) {
    throw new Error('File d\'attente SMS pleine')
  }
  queueSeq += 1
  const job = { id: `sms_${queueSeq}`, to: phone, message, createdAt: Date.now() }
  queue.push(job)
  return job
}

function dequeue() {
  return queue.shift() ?? null
}

function json(res, status, body) {
  const payload = JSON.stringify(body)
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  })
  res.end(payload)
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > 1_000_000) {
        reject(new Error('Corps de requete trop volumineux'))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8')
      if (!raw) return resolve({})
      try {
        resolve(JSON.parse(raw))
      } catch {
        reject(new Error('JSON invalide'))
      }
    })
    req.on('error', reject)
  })
}

async function sendOne(phone, message) {
  switch (MODE) {
    case 'routeros': {
      if (!router) throw new Error('MIKROTIK_HOST non configure')
      await router.sendSms(phone, message)
      return { sent: true, via: 'routeros' }
    }

    case 'modemu': {
      if (!MODEM_PORT) throw new Error('MODEM_PORT non configure')
      const { modem } = JSON.parse(
        process.env.MODEM_INFO || '{"modem":"0"}',
      )
      const { stdout, stderr } = await execFileAsync(
        'mmcli',
        [
          '-m',
          modem,
          '--command',
          `AT+CMGS="${phone}"`,
        ],
        { timeout: 30000 },
      ).catch(async (err) => {
        if (err.code === 'modemu' || err.code === 1) {
          return execFileAsync(
            'mmcli',
            [
              '-m',
              modem,
              '--command',
              `AT+CMGS="${phone}"`,
            ],
            { timeout: 30000 },
          )
        }
        throw err
      })
      void stdout
      void stderr
      return { sent: true, via: 'modemu' }
    }

    case 'phone': {
      const job = enqueue(phone, message)
      return { sent: true, via: 'phone', jobId: job.id, queued: true }
    }

    case 'log':
    default: {
      console.log(`[SMS:log] -> ${phone} : ${message}`)
      return { sent: true, via: 'log' }
    }
  }
}

async function handleSend(res, body) {
  const message = String(body.message ?? '').trim()
  if (!message) {
    return json(res, 400, { error: 'Message vide' })
  }
  if (message.length > 480) {
    return json(res, 400, { error: 'Message trop long (480 caracteres max)' })
  }

  const recipients = Array.isArray(body.to) ? body.to : [body.to]
  const targets = recipients
    .map((t) => String(t ?? '').trim())
    .filter((t) => t.length > 0)

  if (targets.length === 0) {
    return json(res, 400, { error: 'Aucun destinataire' })
  }
  if (targets.length > 500) {
    return json(res, 400, { error: 'Maximum 500 destinataires par lot' })
  }

  const results = []
  for (const to of targets) {
    try {
      const info = await sendOne(to, message)
      results.push({ to, ok: true, ...info })
    } catch (err) {
      results.push({
        to,
        ok: false,
        error: err instanceof Error ? err.message : 'Erreur inconnue',
      })
    }
  }

  const sent = results.filter((r) => r.ok).length
  return json(res, 200, {
    total: results.length,
    sent,
    failed: results.length - sent,
    results,
  })
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host}`)

  if (req.method === 'OPTIONS') {
    return json(res, 204, {})
  }

  if (req.method === 'GET' && url.pathname === '/api/sms/status') {
    const base = { mode: MODE, ready: MODE === 'log' || MODE === 'phone' }
    if (MODE === 'phone') {
      return json(res, 200, { ...base, pending: queue.length })
    }
    if (MODE === 'routeros' && router) {
      try {
        const info = await router.ping()
        return json(res, 200, { ...base, ...info })
      } catch (err) {
        return json(res, 200, {
          ...base,
          ready: false,
          error: err instanceof Error ? err.message : 'Erreur inconnue',
        })
      }
    }
    if (MODE === 'modemu') {
      try {
        const { stdout } = await execFileAsync('mmcli', ['-L'], {
          timeout: 10000,
        })
        return json(res, 200, {
          ...base,
          ready: stdout.trim().length > 0,
          modems: stdout.trim(),
        })
      } catch (err) {
        return json(res, 200, {
          ...base,
          ready: false,
          error: err instanceof Error ? err.message : 'Erreur inconnue',
        })
      }
    }
    return json(res, 200, base)
  }

  if (req.method === 'GET' && url.pathname === '/api/sms/queue/next') {
    const job = dequeue()
    if (!job) {
      return json(res, 200, { job: null, pending: 0 })
    }
    return json(res, 200, { job, pending: queue.length })
  }

  if (req.method === 'POST' && url.pathname === '/api/sms/queue/ack') {
    try {
      const body = await readBody(req)
      const id = String(body.id ?? '')
      const ok = body.ok !== false
      console.log(
        `[SMS:phone] ${ok ? 'envoye' : 'echec'} ${id}${ok ? '' : ` (${body.error ?? 'raison inconnue'})`}`,
      )
      return json(res, 200, { id, ok, pending: queue.length })
    } catch (err) {
      return json(res, 400, {
        error: err instanceof Error ? err.message : 'Erreur inconnue',
      })
    }
  }

  if (req.method === 'POST' && url.pathname === '/api/sms/send') {
    try {
      const body = await readBody(req)
      return await handleSend(res, body)
    } catch (err) {
      return json(res, 400, {
        error: err instanceof Error ? err.message : 'Erreur inconnue',
      })
    }
  }

  if (req.method === 'POST' && url.pathname === '/api/sms/single') {
    try {
      const body = await readBody(req)
      const to = String(body.to ?? '').trim()
      const message = String(body.message ?? '').trim()
      if (!to) return json(res, 400, { error: 'Destinataire manquant' })
      if (!message) return json(res, 400, { error: 'Message vide' })
      const info = await sendOne(to, message)
      return json(res, 200, { to, ok: true, ...info })
    } catch (err) {
      return json(res, 500, {
        error: err instanceof Error ? err.message : 'Erreur inconnue',
      })
    }
  }

  return json(res, 404, { error: 'Route inconnue' })
})

server.listen(PORT, () => {
  console.log(`API SMS demarree sur http://localhost:${PORT} (mode: ${MODE})`)
  if (MODE === 'routeros' && !MIKROTIK_HOST) {
    console.warn('MIKROTIK_HOST absent : le mode routeros echouera')
  }
  if (MODE === 'log') {
    console.warn('Mode log : aucun SMS reel n est envoye')
  }
  if (MODE === 'phone') {
    console.log('Mode phone : le telephone recupere les SMS sur /api/sms/queue/next')
  }
})

export { server }
