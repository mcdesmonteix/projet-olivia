#!/bin/bash
set -e
cd "$(dirname "$0")"

# Arrêter LibreTranslate proprement à la fermeture
cleanup() {
    echo ""
    echo "Arrêt en cours..."
    kill $LT_PID 2>/dev/null
    echo "Au revoir !"
    exit 0
}
trap cleanup SIGINT SIGTERM

# Démarrer LibreTranslate en arrière-plan
echo "🌍 Démarrage de LibreTranslate (14 langues)..."
.venv/bin/libretranslate --load-only fr,en,es,de,it,pt,nl,pl,ru,zh,ja,ar,ko,tr --port 5001 &
LT_PID=$!

# Attendre que LibreTranslate soit prêt
printf "   En attente"
until curl -s http://127.0.0.1:5001/languages > /dev/null 2>&1; do
    printf "."
    sleep 1
done
echo " ✅"

# Détecter l'IP locale et générer le certificat SSL si absent
LOCAL_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "127.0.0.1")
CERT_FILE="${LOCAL_IP}+2.pem"
KEY_FILE="${LOCAL_IP}+2-key.pem"

if [ ! -f "$CERT_FILE" ]; then
    echo "🔒 Génération du certificat SSL pour $LOCAL_IP..."
    mkcert "$LOCAL_IP" localhost 127.0.0.1
fi

echo ""
echo "✅ Application prête !"
echo ""
echo "   Local   → https://localhost:8000"
echo "   Réseau  → https://$LOCAL_IP:8000"
echo ""
echo "   (Ctrl+C pour arrêter)"
echo ""

# Démarrer le serveur
.venv/bin/uvicorn main:app \
    --host 0.0.0.0 \
    --port 8000 \
    --ssl-certfile "$CERT_FILE" \
    --ssl-keyfile "$KEY_FILE"
