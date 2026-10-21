import { rankClientsForMonth } from '../src/utils/ranking'
import type { WifiUser } from '../src/types'

/**
 * Verifie qu'un meme numero reste un seul client, meme si la personne
 * s'est inscrite avec deux formats differents ou depuis deux appareils.
 */

const MONTH = '2026-10'

const USERS: WifiUser[] = [
  {
    name: 'Aline Kponou',
    phone: '0155541115',
    mac: 'AA:BB:CC:00:00:01',
    zone: 'Cotonou',
    server: 'srv-1',
    createdAt: '2026-10-01T08:00:00Z',
    connectionCount: 12,
  },
  {
    name: 'Aline Kponou',
    phone: '+2290155541115',
    mac: 'AA:BB:CC:00:00:02',
    zone: 'Porto-Novo',
    server: 'srv-2',
    createdAt: '2026-10-05T08:00:00Z',
    connectionCount: 18,
  },
  {
    name: 'Aline Kponou',
    phone: '01 55 54 11 15',
    mac: 'AA:BB:CC:00:00:03',
    zone: 'Cotonou',
    server: 'srv-1',
    createdAt: '2026-10-09T08:00:00Z',
    connectionCount: 12,
  },
  {
    name: 'Barthelemy Zinsou',
    phone: '43306235',
    mac: 'AA:BB:CC:00:00:04',
    zone: 'Abomey-Calavi',
    server: 'srv-3',
    createdAt: '2026-10-02T08:00:00Z',
    connectionCount: 4,
  },
  {
    name: 'Christelle Ahouandjinou',
    phone: '+3359572972',
    mac: 'AA:BB:CC:00:00:05',
    zone: 'Cotonou',
    server: 'srv-1',
    createdAt: '2026-10-03T08:00:00Z',
    connectionCount: 1,
  },
  {
    name: 'Djibril Salami',
    phone: '435',
    mac: 'AA:BB:CC:00:00:06',
    zone: 'Cotonou',
    server: 'srv-1',
    createdAt: '2026-10-04T08:00:00Z',
    connectionCount: 1,
  },
]

const ranking = rankClientsForMonth(USERS, MONTH)

console.log('clients classes :', ranking.length)
for (const c of ranking) {
  console.log(
    ' ',
    c.id.padEnd(24),
    (c.name || '(sans nom)').padEnd(26),
    c.phone.padEnd(18),
    `${c.visits} visites`,
    `${c.connectionCount} conn.`,
  )
}
console.log('')

const aline = ranking.find((c) => c.id === 'phone:+2290155541115')
const barthelemy = ranking.find((c) => c.id === 'phone:+2290143306235')
const etranger = ranking.find((c) => c.id === 'phone:+3359572972')
const sansNumero = ranking.find((c) => c.id.startsWith('mac:'))

const checks: [string, boolean][] = [
  ['4 clients classes (numero normalise)', ranking.length === 4],
  ['Aline fusionnee en un seul client', !!aline],
  ['Aline : 3 visites cumulees', aline?.visits === 3],
  [
    'Aline : connexions = somme des compteurs par appareil (12+18+12)',
    aline?.connectionCount === 42,
  ],
  ['Aline : nom le plus recent', aline?.name === 'Aline Kponou'],
  ['Aline : zones fusionnees', aline?.zonesUsed.length === 2],
  ['Barthelemy : 8 chiffres -> +2290143306235', !!barthelemy],
  ['Etranger : identite par son propre numero', !!etranger],
  ['Sans numero exploitable : repli sur la MAC', !!sansNumero],
  [
    'Classement par connexions decroissantes',
    ranking.every(
      (c, i) => i === 0 || ranking[i - 1].connectionCount >= c.connectionCount,
    ),
  ],
]

let failed = 0
for (const [label, ok] of checks) {
  if (!ok) failed += 1
  console.log(ok ? '  OK  ' : ' FAIL ', label)
}
console.log('')
console.log(failed === 0 ? 'Tous les tests passent' : `${failed} test(s) en echec`)
