#!/usr/bin/env python3
"""
Pont SMS pour l'app SMS native du telephone.

Tourne sur le telephone (Termux sur Android, Python iOS via a-Shell, ou
n'importe quel PC du reseau). Interroge le serveur Matrix Connect, recupere
le SMS suivant, puis ouvre l'app SMS native avec le numero et le message
pre-remplis, et confirme l'envoi.

Usage :
    python3 phone_bridge.py --server http://192.168.1.10:8787

Sur Android (Termux) :
    pkg install python
    pkg install termux-api
    pip install requests   # optionnel, sinon urllib de la stdlib
    python3 phone_bridge.py --server http://192.168.1.10:8787

Sur iOS (a-Shell / Pythonista) :
    python3 phone_bridge.py --server http://192.168.1.10:8787
"""

import argparse
import json
import os
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

POLL_INTERVAL = 5


def api_get(url, timeout=15):
    with urllib.request.urlopen(url, timeout=timeout) as response:
        return json.loads(response.read().decode("utf-8"))


def api_post(url, payload, timeout=15):
    data = json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(
        url,
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=timeout) as response:
        return json.loads(response.read().decode("utf-8"))


def open_sms_app(numbers, message):
    """
    Ouvre l'app SMS native avec un ou plusieurs destinataires et le message
    pre-rempli.

    Android (intent, Termux) :
        am start -a android.intent.action.SENDTO -d "sms:N1;N2" --es sms_body "texte"

    iOS (URL scheme) :
        sms:/open?addresses=N1,N2&body=texte

    Retourne le nombre de destinataires passes a l'app.
    """
    numbers = [n for n in numbers if n]
    if not numbers:
        raise ValueError("aucun destinataire")

    termux = os.environ.get("TERMUX_VERSION") is not None
    is_ios = sys.platform == "darwin" and not termux

    if termux:
        quoted_body = message.replace('"', '\\"')
        cmd = [
            "am",
            "start",
            "-a",
            "android.intent.action.SENDTO",
            "-d",
            "sms:" + ";".join(numbers),
            "--es",
            "sms_body",
            quoted_body,
        ]
        subprocess.run(cmd, check=False)
        return len(numbers)

    if is_ios:
        url = (
            "sms:/open?addresses="
            + ",".join(urllib.parse.quote(n, safe="+") for n in numbers)
            + "&body="
            + urllib.parse.quote(message)
        )
        subprocess.run(["open", url], check=False)
        return len(numbers)

    # Secours : xdg-open du lien sms:
    url = (
        "sms:"
        + ";".join(numbers)
        + "?body="
        + urllib.parse.quote(message)
    )
    subprocess.run(["xdg-open", url], check=False)
    return len(numbers)


def fetch_batch(base, limit=50):
    """
    Recupere jusqu'a `limit` jobs en attente et les regroupe par message
    identique, afin d'ouvrir une seule composition de groupe.
    """
    jobs = []
    for _ in range(limit):
        try:
            payload = api_get(f"{base}/api/sms/queue/next")
        except (urllib.error.URLError, OSError, json.JSONDecodeError):
            break
        job = payload.get("job")
        if not job:
            break
        jobs.append(job)

    groups = []
    by_message = {}
    for job in jobs:
        key = job["message"]
        if key not in by_message:
            group = {"message": key, "jobs": [], "numbers": []}
            by_message[key] = group
            groups.append(group)
        group = by_message[key]
        group["jobs"].append(job)
        if job["to"] not in group["numbers"]:
            group["numbers"].append(job["to"])
    return groups


def main():
    parser = argparse.ArgumentParser(description="Pont SMS Matrix Connect")
    parser.add_argument(
        "--server",
        default=os.environ.get("MATRIX_SERVER", "http://localhost:8787"),
        help="URL du serveur SMS (ex: http://192.168.1.10:8787)",
    )
    parser.add_argument(
        "--once", action="store_true", help="Traiter un seul SMS puis sortir"
    )
    parser.add_argument(
        "--max-recipients",
        type=int,
        default=20,
        help="Nombre max de destinataires par composition de groupe",
    )
    args = parser.parse_args()

    base = args.server.rstrip("/")
    print(f"Pont SMS -> {base}")

    while True:
        try:
            groups = fetch_batch(base)
        except Exception as err:  # noqa: BLE001
            print(f"  ! erreur : {err}", file=sys.stderr)
            time.sleep(POLL_INTERVAL)
            continue

        if not groups:
            time.sleep(POLL_INTERVAL)
            continue

        for group in groups:
            numbers = group["numbers"][: args.max_recipients]
            jobs = group["jobs"][: len(numbers)]
            print(
                f"  -> groupe {len(numbers)} destinataire(s) "
                f"pour {len(jobs)} job(s)"
            )
            try:
                open_sms_app(numbers, group["message"])
                for job in jobs:
                    api_post(
                        f"{base}/api/sms/queue/ack",
                        {"id": job["id"], "ok": True, "via": "group"},
                    )
                print(f"     app SMS ouverte pour {len(numbers)} numero(s)")
            except Exception as err:  # noqa: BLE001
                for job in jobs:
                    api_post(
                        f"{base}/api/sms/queue/ack",
                        {"id": job["id"], "ok": False, "error": str(err)},
                    )
                print(f"     echec : {err}", file=sys.stderr)

        if args.once:
            return


if __name__ == "__main__":
    main()
