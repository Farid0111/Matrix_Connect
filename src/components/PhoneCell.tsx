import { normalizePhone } from '../utils/phone'

/**
 * Affiche le numero saisi par le client et sa version normalisee E.164
 * (`+2290155541115`), pour que le meme numero soit identique partout
 * dans le dashboard.
 */
export function PhoneCell({ phone }: { phone: string }) {
  const { e164 } = normalizePhone(phone)
  return (
    <>
      <span className="phone-cell">{phone}</span>
      {e164 && e164 !== phone && (
        <span className="phone-e164">{e164}</span>
      )}
    </>
  )
}
