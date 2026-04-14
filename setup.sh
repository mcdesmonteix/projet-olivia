#!/bin/bash
set -e

echo "=== Setup Projet Olivia ==="
echo ""

# 1. Vérifier Python 3.11+
if ! command -v python3 &>/dev/null; then
    echo "❌ Python 3 non trouvé. Installe-le depuis https://python.org"
    exit 1
fi
echo "✅ Python : $(python3 --version)"

# 2. Vérifier FFmpeg
if ! command -v ffmpeg &>/dev/null; then
    echo "📦 Installation de FFmpeg..."
    brew install ffmpeg
fi
echo "✅ FFmpeg : $(ffmpeg -version 2>&1 | head -1)"

# 3. Vérifier mkcert
if ! command -v mkcert &>/dev/null; then
    echo "📦 Installation de mkcert..."
    brew install mkcert
    mkcert -install
fi
echo "✅ mkcert : $(mkcert --version)"

# 4. Créer le virtualenv
if [ ! -d ".venv" ]; then
    echo "📦 Création de l'environnement virtuel..."
    python3 -m venv .venv
fi
echo "✅ Environnement virtuel prêt"

# 5. Installer les dépendances Python
echo "📦 Installation des dépendances Python..."
.venv/bin/pip install --quiet --upgrade pip
.venv/bin/pip install --quiet -r requirements.txt
echo "✅ Dépendances installées"

# 6. Télécharger le modèle Whisper
echo "📦 Téléchargement du modèle Whisper (small, ~244 Mo)..."
.venv/bin/python3 -c "from faster_whisper import WhisperModel; WhisperModel('small')"
echo "✅ Modèle Whisper prêt"

# 7. Télécharger les modèles LibreTranslate
echo "📦 Téléchargement des modèles LibreTranslate FR/EN (~300 Mo)..."
.venv/bin/libretranslate --load-only fr,en --update-files || true
echo "✅ Modèles LibreTranslate prêts"

echo ""
echo "=== Setup terminé ! ==="
echo ""
echo "Pour démarrer l'application :"
echo "  Terminal 1 : .venv/bin/libretranslate --load-only fr,en --port 5001"
echo "  Terminal 2 : ./start.sh"
echo ""
echo "Puis ouvre https://localhost:8000 dans ton navigateur."
