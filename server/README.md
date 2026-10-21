# Serveur SMS (passerelle entre le dashboard et la carte SIM)

Le navigateur ne peut pas piloter un modem GSM : il faut un petit serveur
intermediaire. Ce serveur expose une API HTTP au dashboard et envoie
reellement les SMS via la carte SIM.

## Modes d'envoi (`SMS_MODE`)

| Mode | Carte SIM | Ce qu'il faut |
|---|---|---|
| `log` | aucune | Mode test : les SMS sont seulement ecrits dans le journal |
| `phone` | dans le telephone | Le pont `phone_bridge.py` tourne sur le telephone et pilote l'app SMS native |
| `routeros` | dans un modem USB branche sur le MikroTik | `/ip service enable rest-api` sur le routeur |
| `modemu` | dans un modem USB branche sur la machine qui heberge ce serveur | `mmcli` (ModemManager) installe et configure |

## Mode `phone` : piloter l'app SMS du telephone

Le dashboard met les SMS en file d'attente. Un petit script sur le telephone
interroge la file, ouvre l'app SMS native avec le numero et le message
pre-remplis, puis confirme l'envoi.

Sur le poste qui heberge le serveur :
```bash
SMS_MODE=phone npm run sms
```

Sur le telephone (meme reseau, ou via WireGuard) :
```bash
# Android / Termux
pkg install python termux-api
python3 phone_bridge.py --server http://192.168.1.10:8787

# iOS / a-Shell ou Pythonista
python3 phone_bridge.py --server http://192.168.1.10:8787
```

Le pont ouvre l'app Messages/SMS du systeme : le message est pre-rempli,
l'utilisateur n'a plus qu'a appuyer sur **Envoyer**. C'est la seule methode
qui fonctionne avec une SIM dans un telephone classique, car iOS et Android
interdisent aux applications tierces d'envoyer des SMS en silence.

Les jobs qui partagent le ** meme message** sont regroupes : l'app SMS
s'ouvre une seule fois avec tous les destinataires. `--max-recipients`
(20 par defaut) limite la taille d'un groupe — au-dela, certains operateurs
refusent les MMS de groupe.

### Option sans pont : lien `sms:` direct

Si tu ouvres le dashboard **sur le telephone**, le bouton
&laquo;&nbsp;Envoyer le groupe via l'app SMS du telephone&raquo;&nbsp; ouvre
directement l'app SMS avec tous les destinataires selectionnes et le message
pre-rempli. Plus simple que le pont, mais un envoi a la fois.


## Demarrage

```bash
# Mode test
SMS_MODE=log npm run sms

# Via le MikroTik (carte SIM dans un modem USB sur le routeur)
SMS_MODE=routeros \
MIKROTIK_HOST=10.99.54.1 \
MIKROTIK_USER=admin \
MIKROTIK_PASSWORD=secret \
SMS_INSECURE_TLS=1 \
npm run sms

# Via ModemManager en local
SMS_MODE=modemu npm run sms
```

Le serveur ecoute sur `http://localhost:8787` (variable `SMS_PORT`).
Pour que le dashboard y accede depuis un autre poste, remplacez `localhost`
par l'IP du serveur, et renseignez `VITE_SMS_API_URL` dans `.env.local`.

## Configuration cote routeur (mode `routeros`)

```
/ip service enable rest-api
/ip service set rest-api address=10.99.54.0/24
```

Le modem USB avec la carte SIM doit etre configure dans
`/interface lte` ou via `ppp` (APN, PIN, user/PIN).

## API

- `GET /api/sms/status` — etat de la passerelle
- `POST /api/sms/send` — `{ "to": ["+2290155541115"], "message": "..." }`
- `POST /api/sms/single` — `{ "to": "+2290155541115", "message": "..." }`
- `GET /api/sms/queue/next` — prochain SMS en attente (mode `phone`)
- `POST /api/sms/queue/ack` — `{ "id": "sms_1", "ok": true }` (mode `phone`)

## Numeros

Format beninois : **+229 01 xxxxxxxx** (indicatif pays + prefixe `01` + 8 chiffres).

La normalisation (`src/utils/phone.ts`) accepte :

| Saisie | Resultat |
|---|---|
| `0155541115` | `+2290155541115` |
| `01 55 54 11 15` | `+2290155541115` |
| `+2290168242535` | `+2290168242535` |
| `2290195554177` | `+2290195554177` |
| `002295541115` | invalide ( incomplet ) |
| `43306235` | `+2290143306235` (prefixe `01` ajoute ) |

Les numeros trop courts (3 a 9 chiffres) ou trop longs (11 chiffres) restent
non exploitables et sont signales dans l'interface. Les numeros etrangers
sont laisses intacts.
