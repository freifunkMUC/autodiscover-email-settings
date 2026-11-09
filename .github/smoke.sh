#!/usr/bin/env bash
# Runs the image and checks it from the outside; this also catches what only
# goes wrong there, e.g. a file the Dockerfile does not copy or a dependency
# left out by `npm ci --omit=dev`.
set -euo pipefail

image=$1

docker run -d --name smoke -p 8000:8000 -e DOMAIN=example.com "$image"
trap 'docker logs smoke; docker rm -f smoke >/dev/null' EXIT
for _ in $(seq 30); do curl -sf http://localhost:8000/ >/dev/null && break; sleep 1; done

get() { curl -sf "$@"; }
grep -q '<hostname>imap.example.com</hostname>' <<< "$(get http://localhost:8000/mail/config-v1.1.xml)"
grep -q '<LoginName>alice@example.com</LoginName>' <<< "$(get -X POST -H 'Content-Type: text/xml' \
  --data '<Autodiscover><Request><EMailAddress>alice@example.com</EMailAddress></Request></Autodiscover>' \
  http://localhost:8000/autodiscover/autodiscover.xml)"
grep -q 'com.apple.mail.managed' <<< "$(get 'http://localhost:8000/email.mobileconfig?email=alice@example.com')"
grep -q '"AutodiscoverV1"' <<< "$(get 'http://localhost:8000/autodiscover/autodiscover.json?Protocol=AutodiscoverV1')"
