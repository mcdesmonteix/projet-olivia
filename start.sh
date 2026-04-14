#!/bin/bash
set -e

cd "$(dirname "$0")"

# Détecter l'IP locale automatiquement
LOCAL_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "127.0.0.1")
echo "IP locale détectée : $LOCAL_IP"

CERT_FILE="${LOCAL_IP}+2.pem"
KEY_FILE="${LOCAL_IP}+2-key.pem"

# Générer le certificat SSL si absent
if [ ! -f "$CERT_FILE" ]; then
    echo "Génération du certificat SSL pour $LOCAL_IP..."
    mkcert "$LOCAL_IP" localhost 127.0.0.1
fi

echo ""
echo "Serveur disponible sur :"
echo "  → Toi          : https://localhost:8000"
echo "  → Autre ordi   : https://$LOCAL_IP:8000"
echo ""

.venv/bin/uvicorn main:app \
    --host 0.0.0.0 \
    --port 8000 \
    --ssl-certfile "$CERT_FILE" \
    --ssl-keyfile "$KEY_FILE" \
    --reload
