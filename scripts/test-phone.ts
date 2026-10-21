import { normalizePhone } from '../src/utils/phone'

/**
 * Extrait de la collection reellement observee (lecture du 2026-10-21).
 * Sert a valider la normalisation sans consommer de quota Firestore.
 */
const KNOWN = [
  '435',
  '100',
  '0001',
  '4536',
  '4563',
  '2536',
  '01529',
  '555555',
  '255800',
  '5585366',
  '1235678',
  '4657779',
  '98506459',
  '58146190',
  '43510163',
  '94804629',
  '44543924',
  '47510915',
  '61063505',
  '65604210',
  '58043116',
  '62434644',
  '631842932',
  '524777307',
  '123456789',
  '0155541115',
  '0198203341',
  '0163471290',
  '0164776015',
  '0149839601',
  '0165604210',
  '0196738046',
  '0199009929',
  '0164202720',
  '0194161312',
  '01634711290',
  '01506623662',
  '+3359572972',
  '2290195554177',
  '+2290168242535',
  '+2290194803173',
  '+2290194536131',
  '+2290194272017',
  '+2290166657867',
  '+2290149841802',
  '+2290164909972',
  '+2290151150457',
  '+2290163940007',
]

const valid: string[] = []
const invalid: { raw: string; reason: string }[] = []

for (const p of KNOWN) {
  const r = normalizePhone(p)
  if (r.e164) valid.push(r.e164)
  else invalid.push({ raw: p, reason: r.error ?? '' })
}

console.log('echantillon           :', KNOWN.length)
console.log('exploitables          :', valid.length)
console.log('non exploitables      :', invalid.length)
console.log('')
console.log('non exploitables :')
for (const v of invalid) console.log('  ', v.raw.padEnd(16), v.reason)
console.log('')
console.log('exemples normalises :')
for (const v of [
  '0155541115',
  '+2290168242535',
  '+229 0151150457',
  '2290195554177',
  '43306235',
  '98506459',
]) {
  console.log('  ', v.padEnd(18), '->', normalizePhone(v).e164 ?? 'INVALIDE')
}
console.log('')
console.log('tous les E.164 beninois font 13 chiffres :')
console.log(
  '  ',
  valid.every((v) => v.length === 13 && v.startsWith('+22901')),
)
console.log('doublons :', valid.length - new Set(valid).size)
