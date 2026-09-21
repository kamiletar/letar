#!/bin/bash
# Только после успешного продления: кладём сертификат в Maddy и перезапускаем его.
set -e
DOMAIN=mail.letar.best
MADDY_CERTS=/opt/maddy/data/certs
[ "${RENEWED_LINEAGE:-}" = "/etc/letsencrypt/live/$DOMAIN" ] || exit 0
cp "$RENEWED_LINEAGE/fullchain.pem" "$MADDY_CERTS/fullchain.pem"
cp "$RENEWED_LINEAGE/privkey.pem" "$MADDY_CERTS/privkey.pem"
chmod 644 "$MADDY_CERTS/fullchain.pem"
chmod 600 "$MADDY_CERTS/privkey.pem"
docker restart maddy
