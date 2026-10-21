import {
  activityLevel,
  activitySummary,
  irregularRecipients,
  isRegular,
  sortRecipients,
} from '../src/utils/activity'
import { resolveRecipients, type PhoneRecord } from '../src/utils/owners'

/**
 * Verifie le tri par nombre de connexions et le ciblage des clients
 * irreguliers (candidats a une relance par SMS).
 */

const RECORDS: PhoneRecord[] = [
  // Client regulier : 5 passages
  ...Array.from({ length: 5 }, (_, i) => ({
    name: 'AkADIRI',
    phone: '0163471290',
    mac: `AA:BB:CC:00:00:${i.toString().padStart(2, '0')}`,
    zone: 'Cotonou',
    createdAt: `2026-10-0${i + 1}T08:00:00Z`,
    connectionCount: 0,
  })),
  // Client regulier : 3 passages
  ...Array.from({ length: 3 }, (_, i) => ({
    name: 'GUERRA SAKA',
    phone: '0155541115',
    mac: `AA:BB:CC:00:01:${i.toString().padStart(2, '0')}`,
    zone: 'Commissariat',
    createdAt: `2026-10-0${i + 1}T09:00:00Z`,
    connectionCount: 0,
  })),
  // Client irregulier : 2 passages
  ...Array.from({ length: 2 }, (_, i) => ({
    name: 'Barthelemy Zinsou',
    phone: '43306235',
    mac: `AA:BB:CC:00:02:${i.toString().padStart(2, '0')}`,
    zone: 'Abomey-Calavi',
    createdAt: `2026-10-0${i + 1}T10:00:00Z`,
    connectionCount: 0,
  })),
  // Client irregulier : 1 passage
  {
    name: 'Christelle Ahouandjinou',
    phone: '98506459',
    mac: 'AA:BB:CC:00:03:00',
    zone: 'Cotonou',
    createdAt: '2026-10-01T11:00:00Z',
    connectionCount: 0,
  },
  {
    name: 'Djibril Salami',
    phone: '58043116',
    mac: 'AA:BB:CC:00:04:00',
    zone: 'Cotonou',
    createdAt: '2026-10-01T12:00:00Z',
    connectionCount: 0,
  },
]

const { valid } = resolveRecipients(RECORDS)
const THRESHOLD = 3

console.log('clients :', valid.length)
for (const r of valid) {
  console.log(
    ' ',
    r.e164.padEnd(18),
    (r.name || '(sans nom)').padEnd(26),
    `${r.visits} connexion(s)`,
    `| niveau : ${activityLevel(r, THRESHOLD)}`,
  )
}
console.log('')

const byConnections = sortRecipients(valid, 'connections')
const byIrregular = sortRecipients(valid, 'irregular')
const irregular = irregularRecipients(valid, THRESHOLD)
const summary = activitySummary(valid, THRESHOLD)

console.log('tri connexions decroissant :')
console.log(' ', byConnections.map((r) => `${r.name}:${r.visits}`).join(' | '))
console.log('tri irreguliers d abord :')
console.log(' ', byIrregular.map((r) => `${r.name}:${r.visits}`).join(' | '))
console.log('')
console.log('irreguliers selectionnes :', irregular.map((r) => r.name).join(', '))
console.log('resume :', JSON.stringify(summary))
console.log('')

const checks: [string, boolean][] = [
  ['5 clients', valid.length === 5],
  [
    'connexions = nombre de passages par numero',
    valid.find((r) => r.name === 'AkADIRI')?.visits === 5,
  ],
  [
    'tri connexions : du plus regulier au moins regulier',
    byConnections[0].name === 'AkADIRI' && byConnections[1].name === 'GUERRA SAKA',
  ],
  [
    'tri irreguliers : les 1 passage en tete',
    byIrregular[0].visits === 1 && byIrregular[0].name === 'Christelle Ahouandjinou',
  ],
  ['3 clients irreguliers (seuil 3)', irregular.length === 3],
  [
    'irreguliers = 1 ou 2 passages',
    irregular.every((r) => r.visits < THRESHOLD),
  ],
  ['regulier = 3 passages ou plus', isRegular({ visits: 3 }, THRESHOLD)],
  ['non regulier = 2 passages', !isRegular({ visits: 2 }, THRESHOLD)],
  [
    'resume : 2 reguliers / 3 irreguliers',
    summary.regular === 2 && summary.irregular === 3,
  ],
  ['resume : 12 connexions au total', summary.totalConnections === 12],
  [
    'niveaux : rare / occasional / regular',
    activityLevel({ visits: 1 }, THRESHOLD) === 'rare' &&
      activityLevel({ visits: 2 }, THRESHOLD) === 'occasional' &&
      activityLevel({ visits: 5 }, THRESHOLD) === 'regular',
  ],
  [
    'le tri ne modifie pas la liste d origine',
    valid.map((r) => r.e164).join() !==
      byConnections.map((r) => r.e164).join(),
  ],
]

let failed = 0
for (const [label, ok] of checks) {
  if (!ok) failed += 1
  console.log(ok ? '  OK  ' : ' FAIL ', label)
}
console.log('')
console.log(failed === 0 ? 'Tous les tests passent' : `${failed} test(s) en echec`)
