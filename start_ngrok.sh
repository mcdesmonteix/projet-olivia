#!/bin/bash
set -e
cd "$(dirname "$0")"

cleanup() {
    echo ""
    echo "Arrêt en cours..."
    kill $LT_PID 2>/dev/null
    echo "Au revoir !"
    exit 0
}
trap cleanup SIGINT SIGTERM

echo "🌍 Démarrage de LibreTranslate (14 langues)..."
.venv/bin/libretranslate --load-only fr,en,es,de,it,pt,nl,pl,ru,zh,ja,ar,ko,tr --port 5001 &
LT_PID=$!

printf "   En attente"
until curl -s http://127.0.0.1:5001/languages > /dev/null 2>&1; do
    printf "."
    sleep 1
done
echo " ✅"

echo ""
echo "✅ Serveur prêt (mode ngrok — sans SSL)"
echo ""
echo "   Lance dans un autre terminal : ngrok http 8000"
echo "   Puis partage l'URL ngrok avec Olivia."
echo ""
echo "   (Ctrl+C pour arrêter)"
echo ""

.venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000
