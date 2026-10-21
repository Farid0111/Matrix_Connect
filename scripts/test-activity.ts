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
 *
 * Deux metriques distinctes, jamais melangees :
 *   - CONNEXIONS : champ `connectionCount` ecrit par le portail
 *   - VISITES : nombre de passages du client (1 document = 1 passage)
 */

const RECORDS: PhoneRecord[] = [
  // 5 visites, aucun compteur renseigne -> 0 connexion
  ...Array.from({ length: 5 }, (_, i) => ({
    name: 'AkADIRI',
    phone: '0163471290',
    mac: `AA:BB:CC:00:00:${i.toString().padStart(2, '0')}`,
    zone: 'Cotonou',
    createdAt: `2026-10-0${i + 1}T08:00:00Z`,
    connectionCount: 0,
  })),
  // 3 visites, aucun compteur renseigne -> 0 connexion
  ...Array.from({ length: 3 }, (_, i) => ({
    name: 'GUERRA SAKA',
    phone: '0155541115',
    mac: `AA:BB:CC:00:01:${i.toString().padStart(2, '0')}`,
    zone: 'Commissariat',
    createdAt: `2026-10-0${i + 1}T09:00:00Z`,
    connectionCount: 0,
  })),
  // 2 visites, aucun compteur renseigne -> 0 connexion
  ...Array.from({ length: 2 }, (_, i) => ({
    name: 'Barthelemy Zinsou',
    phone: '43306235',
    mac: `AA:BB:CC:00:02:${i.toString().padStart(2, '0')}`,
    zone: 'Abomey-Calavi',
    createdAt: `2026-10-0${i + 1}T10:00:00Z`,
    connectionCount: 0,
  })),
  // 1 visite, aucun compteur renseigne -> 0 connexion
  {
    name: 'Christelle Ahouandjinou',
    phone: '98506459',
    mac: 'AA:BB:CC:00:03:00',
    zone: 'Cotonou',
    createdAt: '2026-10-01T11:00:00Z',
    connectionCount: 0,
  },
  // 1 visite, le portail a renseigne 12 connexions
  {
    name: 'Zime Mohamed',
    phone: '0152971833',
    mac: 'AA:BB:CC:00:04:00',
    zone: 'Cotonou',
    createdAt: '2026-10-15T12:00:00Z',
    connectionCount: 12,
  },
  // 4 visites, compteur renseigne a 1 (par appareil)
  ...Array.from({ length: 4 }, (_, i) => ({
    name: 'Sedjame',
    phone: '0166764375',
    mac: `AA:BB:CC:00:05:${i.toString().padStart(2, '0')}`,
    zone: 'Cotonou',
    createdAt: `2026-10-0${i + 1}T12:00:00Z`,
    connectionCount: 1,
  })),
]

const { valid } = resolveRecipients(RECORDS)
const THRESHOLD = 3

const find = (name: string) => valid.find((r) => r.name === name)

console.log('clients :', valid.length)
for (const r of valid) {
  console.log(
    ' ',
    r.e164.padEnd(18),
    (r.name || '(sans nom)').padEnd(26),
    `${r.connections} connexion(s)`,
    `${r.visits} visite(s)`,
    `| niveau : ${activityLevel(r, THRESHOLD)}`,
  )
}
console.log('')

const byConnections = sortRecipients(valid, 'connections')
const byVisits = sortRecipients(valid, 'visits')
const irregular = irregularRecipients(valid, THRESHOLD)
const summary = activitySummary(valid, THRESHOLD)

console.log('tri connexions :', byConnections.map((r) => `${r.name}:${r.connections}`).join(' | '))
console.log('tri visites    :', byVisits.map((r) => `${r.name}:${r.visits}`).join(' | '))
console.log('')
console.log('irreguliers selectionnes :', irregular.map((r) => r.name).join(', '))
console.log('resume :', JSON.stringify(summary))
console.log('')

const checks: [string, boolean][] = [
  ['6 clients', valid.length === 6],
  [
    'visites = nombre de passages, independamment du compteur',
    find('AkADIRI')?.visits === 5 && find('Zime Mohamed')?.visits === 1,
  ],
  [
    'connexions = compteur du portail quand il est renseigne',
    find('Zime Mohamed')?.connections === 12,
  ],
  [
    'connexions = 0 quand le portail n a rien renseigne',
    find('AkADIRI')?.connections === 0,
  ],
  [
    'les visites ne sont jamais completees par les connexions',
    find('AkADIRI')?.visits === 5 && find('AkADIRI')?.connections === 0,
  ],
  [
    'connexions = somme des compteurs par appareil (4 appareils x 1)',
    find('Sedjame')?.connections === 4 && find('Sedjame')?.visits === 4,
  ],
  [
    'tri connexions : compteur d abord, visites en departage',
    byConnections[0].name === 'Zime Mohamed' && byConnections[1].name === 'Sedjame',
  ],
  [
    'tri visites : AkADIRI en tete',
    byVisits[0].name === 'AkADIRI',
  ],
  [
    'tri irreguliers : les compteurs les plus bas en tete',
    byConnections[byConnections.length - 1].connections === 0,
  ],
  ['4 clients irreguliers (seuil 3)', irregular.length === 4],
  [
    'irreguliers = moins de 3 connexions',
    irregular.every((r) => r.connections < THRESHOLD),
  ],
  [
    'niveau rare / occasional / regular sur les connexions',
    activityLevel(find('Christelle Ahouandjinou')!, THRESHOLD) === 'rare' &&
      activityLevel(find('AkADIRI')!, THRESHOLD) === 'rare' &&
      activityLevel(find('Sedjame')!, THRESHOLD) === 'regular',
  ],
  [
    'resume : 2 reguliers / 4 irreguliers',
    summary.regular === 2 && summary.irregular === 4,
  ],
  ['resume : 16 connexions au total', summary.totalConnections === 16],
  ['resume : 16 visites au total', summary.totalVisits === 16],
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
