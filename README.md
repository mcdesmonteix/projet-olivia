# 🎙️ WhisperBridge

![Python](https://img.shields.io/badge/Python-3.11+-blue?logo=python)
![FastAPI](https://img.shields.io/badge/FastAPI-0.135-green?logo=fastapi)
![Whisper](https://img.shields.io/badge/Whisper-small%2Bmedium-orange?logo=openai)
![LibreTranslate](https://img.shields.io/badge/LibreTranslate-1.9-purple)
![Langues](https://img.shields.io/badge/Langues-8-red)
![100% Local](https://img.shields.io/badge/100%25-Local-darkgreen)
![Licence MIT](https://img.shields.io/badge/Licence-MIT-yellow)
![En ligne](https://img.shields.io/badge/En%20ligne-whisperbridge.duckdns.org-brightgreen)

**Application de traduction vocale en temps réel.** Parlez dans votre langue — vos interlocuteurs vous comprennent dans la leur, instantanément.

Chaque conversation se crée en un clic et génère un lien unique à partager. Aucune installation côté client.

> 🌐 **Instance publique disponible sur [`https://whisperbridge.duckdns.org`](https://whisperbridge.duckdns.org)**

![WhisperBridge branding](docs/media/branding.png)

---

## 📸 Aperçu

<div align="center">
  <img src="docs/media/screenshots/mockup-participants.png" width="45%" alt="Participants connectés" />
  <img src="docs/media/screenshots/mockup-conversation.png" width="45%" alt="Conversation traduite" />
</div>

> 🎠 Carrousel interactif disponible sur [mcdesmonteix.github.io/whisperbridge](https://mcdesmonteix.github.io/whisperbridge/#screenshots)

---

## ✨ Fonctionnalités

- 🎤 **Transcription vocale** locale via [Whisper](https://github.com/openai/whisper) — small (FR/EN/ES/IT/PT) et medium (ZH/AR/RU)
- 🌍 **Traduction multilingue** via [LibreTranslate](https://libretranslate.com/) — 100% local, 8 langues
- 🔗 **Salles privées** — chaque conversation a son URL unique (`/room/abc123`), isolée des autres
- 🔄 **Temps réel** via WebSockets — plusieurs participants simultanés
- 🤖 **Mode VAD** — détection automatique de la voix, mains libres
- 🔊 **Synthèse vocale (TTS)** — lecture automatique des traductions
- 🎨 **4 thèmes visuels** — sélectionnables et mémorisés
- 🌐 **Interface web** — aucune installation côté client
- 🔒 **100% local** — aucune donnée envoyée à des services tiers

---

## 🚀 Utilisation rapide

### Instance publique (recommandé)

Ouvre [`https://whisperbridge.duckdns.org`](https://whisperbridge.duckdns.org) dans ton navigateur.

1. Entre ton prénom et ta langue
2. Clique **Créer une conversation** → une URL unique est générée
3. Clique **🔗 Partager le lien** et envoie-le à tes interlocuteurs
4. Parlez chacun dans votre langue

### Auto-hébergement

```bash
git clone https://github.com/mcdesmonteix/whisperbridge.git
cd whisperbridge
chmod +x setup.sh
./setup.sh
```

Voir les sections détaillées ci-dessous pour macOS, Windows et le déploiement serveur.

---

## 🌍 Langues supportées

| Drapeau | Langue | Code | Modèle Whisper |
|---------|--------|------|----------------|
| 🇫🇷 | Français | `fr` | small |
| 🇬🇧 | English | `en` | small |
| 🇪🇸 | Español | `es` | small |
| 🇮🇹 | Italiano | `it` | small |
| 🇵🇹 | Português | `pt` | small |
| 🇨🇳 | 中文 Mandarin | `zh` | medium |
| 🇸🇦 | العربية Arabe | `ar` | medium |
| 🇷🇺 | Русский Russe | `ru` | medium |

---

## 🎨 Thèmes visuels

| # | Thème | Style |
|---|-------|-------|
| 🌈 | **Glassmorphism** | Fond dégradé violet/rose, effets verre dépoli |
| 🌑 | **Dark mode** | Fond sombre, accents violet/vert néon |
| ⬜ | **Minimaliste** | Blanc et noir, typographie épurée |
| 🌸 | **Vivid** | Coloré et chaleureux, chaque utilisateur a sa couleur |

---

## 🏗️ Architecture

```
Utilisateur A parle (FR)
    └─▶ Whisper transcrit en français
        └─▶ LibreTranslate traduit vers chaque langue présente dans la salle
            ├─▶ Utilisateur B (EN) reçoit la traduction anglaise
            ├─▶ Utilisateur C (ES) reçoit la traduction espagnole
            └─▶ Utilisateur A (FR) voit son texte original

Salles isolées : /room/abc123 ≠ /room/xyz789
Chaque salle est indépendante — les messages ne se croisent pas.
```

---

## 📋 Prérequis (auto-hébergement)

- Python 3.11+
- FFmpeg
- mkcert (pour HTTPS local)
- ~1.5 Go d'espace disque (modèles Whisper + LibreTranslate 8 langues)
- Microphone

---

## 🖥️ Installation locale

### 🍎 macOS

```bash
git clone https://github.com/mcdesmonteix/whisperbridge.git
cd whisperbridge
chmod +x setup.sh start_all.sh start_ngrok.sh
./setup.sh
```

### 🪟 Windows

```bat
git clone https://github.com/mcdesmonteix/whisperbridge.git
cd whisperbridge
python -m venv .venv
.venv\Scripts\pip install -r requirements.txt
.venv\Scripts\python -c "from faster_whisper import WhisperModel; WhisperModel('small'); WhisperModel('medium')"
.venv\Scripts\libretranslate --load-only fr,en,zh,ar,ru,es,it,pt --update-files
```

---

## ▶️ Lancement

### Réseau local (même Wi-Fi)

```bash
./start_all.sh
```

### Internet via Ngrok

```bash
./start_ngrok.sh
# Puis dans un autre terminal :
ngrok http 8000
```

### Serveur permanent (production)

Déployé sur Oracle Cloud Free Tier avec Caddy + Let's Encrypt.  
Voir [`https://whisperbridge.duckdns.org`](https://whisperbridge.duckdns.org).

---

## 📁 Structure du projet

```
whisperbridge/
├── main.py                  # Serveur FastAPI + WebSockets + Whisper + LibreTranslate + Salles
├── start_all.sh             # Lancement réseau local (avec SSL)
├── start_ngrok.sh           # Lancement internet via Ngrok (sans SSL)
├── setup.sh                 # Installation automatique (macOS)
├── requirements.txt         # Dépendances Python
└── static/
    ├── index.html           # Interface web
    ├── style.css            # Styles (4 thèmes CSS)
    └── app.js               # WebSocket + audio + VAD + TTS + salles + thèmes
```

---

## 🗺️ Roadmap

- [x] POC — conversation FR ↔ EN sur réseau local
- [x] Synthèse vocale (TTS)
- [x] Mode VAD — détection automatique de la voix
- [x] Interface dynamique — prénom + langue au choix
- [x] 8 langues supportées
- [x] 4 thèmes visuels
- [x] Optimisation latence — Whisper small/medium selon la langue, beam_size=1
- [x] Hébergement permanent — Oracle Cloud + HTTPS (whisperbridge.duckdns.org)
- [x] Salles privées — chaque conversation a son URL unique
- [ ] Application mobile native (iOS / Android) — mode hors-ligne

---

## 📄 Licence

MIT — libre d'utilisation, modification et distribution.
