import { resolveRecipients, type PhoneRecord } from '../src/utils/owners'

/**
 * Verifie l'association numero -> proprietaire.
 * Cas couverts :
 *   - un numero present sur plusieurs MAC (une personne, plusieurs appareils) ;
 *   - un numero dont le proprietaire a change (nom le plus recent retenu) ;
 *   - un numero partage entre deux personnes (alias) ;
 *   - des numeros inexploitables regroupes avec leur nom ;
 *   - le regroupement des formats differents (0155541115 / +2290155541115).
 */

const RECORDS: PhoneRecord[] = [
  {
    name: 'Aline Kponou',
    phone: '0155541115',
    mac: 'AA:BB:CC:00:00:01',
    zone: 'Cotonou',
    createdAt: '2026-10-01T08:00:00Z',
    connectionCount: 12,
  },
  {
    name: 'Aline Kponou',
    phone: '+2290155541115',
    mac: 'AA:BB:CC:00:00:02',
    zone: 'Porto-Novo',
    createdAt: '2026-10-05T08:00:00Z',
    connectionCount: 18,
  },
  {
    name: 'Aline Kponou',
    phone: '01 55 54 11 15',
    mac: 'AA:BB:CC:00:00:03',
    zone: 'Cotonou',
    createdAt: '2026-10-02T08:00:00Z',
    connectionCount: 12,
  },
  {
    name: 'Barthelemy Zinsou',
    phone: '43306235',
    mac: 'AA:BB:CC:00:00:04',
    zone: 'Abomey-Calavi',
    createdAt: '2026-10-03T08:00:00Z',
    connectionCount: 3,
  },
  {
    name: 'Barthelemy Zinsou',
    phone: '+2290143306235',
    mac: 'AA:BB:CC:00:00:05',
    zone: 'Abomey-Calavi',
    createdAt: '2026-10-07T08:00:00Z',
    connectionCount: 5,
  },
  {
    name: 'Christelle Ahouandjinou',
    phone: '98506459',
    mac: 'AA:BB:CC:00:00:06',
    zone: 'Cotonou',
    createdAt: '2026-10-04T08:00:00Z',
    connectionCount: 1,
  },
  {
    name: 'Christelle Ahouandjinou',
    phone: '98506459',
    mac: 'AA:BB:CC:00:00:07',
    zone: 'Parakou',
    createdAt: '2026-10-09T08:00:00Z',
    connectionCount: 1,
  },
  {
    name: 'Djibril Salami',
    phone: '435',
    mac: 'AA:BB:CC:00:00:08',
    zone: 'Cotonou',
    createdAt: '2026-10-06T08:00:00Z',
    connectionCount: 1,
  },
  {
    name: 'Djibril Salami',
    phone: '5585366',
    mac: 'AA:BB:CC:00:00:09',
    zone: 'Cotonou',
    createdAt: '2026-10-06T08:00:00Z',
    connectionCount: 1,
  },
  {
    name: 'Estelle Dossou',
    phone: '+3359572972',
    mac: 'AA:BB:CC:00:00:0A',
    zone: 'Cotonou',
    createdAt: '2026-10-08T08:00:00Z',
    connectionCount: 2,
  },
  {
    name: 'Serge Ahouandjinou',
    phone: '0163471290',
    mac: 'AA:BB:CC:00:00:0B',
    zone: 'Cotonou',
    createdAt: '2026-10-01T08:00:00Z',
    connectionCount: 1,
  },
  {
    name: 'Serge Dossou',
    phone: '+2290163471290',
    mac: 'AA:BB:CC:00:00:0C',
    zone: 'Cotonou',
    createdAt: '2026-10-10T08:00:00Z',
    connectionCount: 4,
  },
  {
    name: '0151924113',
    phone: '0151924113',
    mac: 'AA:BB:CC:00:00:0D',
    zone: 'Cotonou',
    createdAt: '2026-10-11T08:00:00Z',
    connectionCount: 0,
  },
]

const { valid, invalid } = resolveRecipients(RECORDS)

console.log('enregistrements      :', RECORDS.length)
console.log('numeros valides      :', valid.length)
console.log('numeros invalides    :', invalid.length)
console.log('')
console.log('numero               proprietaire                 macs  zone')
for (const r of valid) {
  console.log(
    ' ',
    r.e164.padEnd(18),
    (r.name || '(sans nom)').padEnd(28),
    String(r.macs.length).padStart(4),
    r.zones.join('/'),
  )
}console.log('')
console.log('alias :')
for (const r of valid) {
  if (r.aliases.length > 0) {
    console.log(' ', r.e164, '->', r.aliases.join(', '))
  }
}
console.log('')
console.log('invalides :')
for (const v of invalid) {
  console.log(' ', (v.name || '(sans nom)').padEnd(28), v.raw.padEnd(12), v.reason)
}
console.log('')

const aline = valid.find((r) => r.e164 === '+2290155541115')
const barthelemy = valid.find((r) => r.e164 === '+2290143306235')
const christelle = valid.find((r) => r.e164 === '+2290198506459')
const estelle = valid.find((r) => r.e164 === '+3359572972')
const serge = valid.find((r) => r.e164 === '+2290163471290')

const checks: [string, boolean][] = [
  ['Aline : un seul numero pour 3 MAC', !!aline && aline.macs.length === 3],
  ['Aline : proprietaire = nom le plus ancien identique', aline?.name === 'Aline Kponou'],
  ['Aline : connexions = 3 passages', aline?.visits === 3],
  ['Aline : 3 zones/enregistrements fusionnes', !!aline && aline.records === 3],
  [
    'Barthelemy : 8 chiffres -> +2290143306235',
    barthelemy?.e164 === '+2290143306235',
  ],
  ['Barthelemy : proprietaire correct', barthelemy?.name === 'Barthelemy Zinsou'],
  [
    'Christelle : proprietaire = enregistrement le plus recent (2026-10-09)',
    christelle?.lastVisit?.startsWith('2026-10-09') ?? false,
  ],
  ['Christelle : 2 MAC fusionnes', christelle?.macs.length === 2],
  ['Etranger : +3359572972 intact', estelle?.e164 === '+3359572972'],
  ['Etranger : proprietaire conserve', estelle?.name === 'Estelle Dossou'],
  ['Invalides regroupes par nom', invalid.length === 2],
  [
    'Invalide : nom associe au numero non exploitable',
    invalid.some((v) => v.name === 'Djibril Salami' && v.raw === '435'),
  ],
  ['Nom change : proprietaire = nom le plus recent', serge?.name === 'Serge Dossou'],
  [
    'Nom change : ancien nom conserve en alias',
    serge?.aliases.length === 1 && serge.aliases[0] === 'Serge Ahouandjinou',
  ],
  [
    'Pas d alias quand le nom est identique',
    valid.every((r) => !r.aliases.some((a) => a === r.name)),
  ],
  [
    'Nom qui ressemble a un numero : pas de proprietaire',
    valid.find((r) => r.e164 === '+2290151924113')?.name === '',
  ],
]

let failed = 0
for (const [label, ok] of checks) {
  if (!ok) failed += 1
  console.log(ok ? '  OK  ' : ' FAIL ', label)
}
console.log('')
console.log(failed === 0 ? 'Tous les tests passent' : `${failed} test(s) en echec`)
