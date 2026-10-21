/**
 * Normalisation des numeros de telephone (MTN / Benin).
 *
 * Format beninois : +229 01 xxxxxxxx
 *   - indicatif pays : 229
 *   - prefixe operateur national : 01
 *   - 8 chiffres de l'abonne
 *
 * Formats rencontres dans la collection Firestore :
 *   0155541115      -> national mobile 10 chiffres
 *   01 55 54 11 15  -> national avec espaces
 *   +2290168242535  -> international deja au bon format
 *   2290195554177   -> international sans le "+"
 *   002295541115    -> international en 00
 *   43306235        -> 8 chiffres : le prefixe 01 a ete omis a la saisie
 *   5585366         -> trop court / non exploitable
 */

export const COUNTRY_CODE = '229'
export const NATIONAL_PREFIX = '01'

export interface NormalizedPhone {
  raw: string
  /** Format E.164 utilisable par un modem GSM, ex: +2290155541115 */
  e164: string | null
  /** Raison du rejet si e164 est null */
  error: string | null
}

/** 10 chiffres : 01 + 8 chiffres, le format national beninois. */
const NATIONAL_MOBILE = /^01\d{8}$/
/** 8 chiffres : le prefixe 01 manque. */
const EIGHT_DIGITS = /^\d{8}$/

function strip(raw: string): string {
  return raw.replace(/[\s.\-()/]/g, '')
}

function benin(national: string): NormalizedPhone['e164'] {
  return '+' + COUNTRY_CODE + national
}

export function normalizePhone(raw: string | null | undefined): NormalizedPhone {
  const original = (raw ?? '').trim()

  if (!original || original === '-') {
    return { raw: original, e164: null, error: 'Numéro vide' }
  }

  let s = strip(original)

  if (s.startsWith('00')) {
    s = '+' + s.slice(2)
  }

  // International deja prefixe par "+" : on retire l'eventuel 229 initial
  // pour retomber sur le format national, puis on renormalise.
  if (s.startsWith('+')) {
    const digits = s.slice(1)
    if (!/^\d{8,15}$/.test(digits)) {
      return { raw: original, e164: null, error: 'Format international invalide' }
    }
    if (digits.startsWith(COUNTRY_CODE)) {
      const national = digits.slice(COUNTRY_CODE.length)
      if (NATIONAL_MOBILE.test(national)) {
        return { raw: original, e164: benin(national), error: null }
      }
      if (EIGHT_DIGITS.test(national)) {
        return { raw: original, e164: benin(NATIONAL_PREFIX + national), error: null }
      }
      // Indicatif Benin mais longueur nationale incoherente : numero
      // incomplet (il manque le "01" ou un chiffre).
      return {
        raw: original,
        e164: null,
        error: `Numéro Bénin incomplet (${national.length} chiffres après le 229)`,
      }
    }
    // Pays etranger : on ne touche a rien
    return { raw: original, e164: '+' + digits, error: null }
  }

  // International sans le "+" : 229xxxxxxxxx
  if (s.startsWith(COUNTRY_CODE) && /^\d{13}$/.test(s)) {
    const national = s.slice(COUNTRY_CODE.length)
    if (NATIONAL_MOBILE.test(national)) {
      return { raw: original, e164: benin(national), error: null }
    }
  }

  // National beninois complet : 01 + 8 chiffres
  if (NATIONAL_MOBILE.test(s)) {
    return { raw: original, e164: benin(s), error: null }
  }

  // 8 chiffres : le prefixe 01 a ete omis a la saisie.
  // 43306235 -> 0143306235 -> +2290143306235
  if (EIGHT_DIGITS.test(s)) {
    return { raw: original, e164: benin(NATIONAL_PREFIX + s), error: null }
  }

  return {
    raw: original,
    e164: null,
    error: `Format non reconnu (${s.length} chiffres)`,
  }
}

export function isSendable(raw: string | null | undefined): boolean {
  return normalizePhone(raw).e164 !== null
}
