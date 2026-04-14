# 🌍 Projet Olivia

![Python](https://img.shields.io/badge/Python-3.11+-blue?logo=python)
![FastAPI](https://img.shields.io/badge/FastAPI-0.135-green?logo=fastapi)
![Whisper](https://img.shields.io/badge/Whisper-medium-orange?logo=openai)
![LibreTranslate](https://img.shields.io/badge/LibreTranslate-1.9-purple)
![Langues](https://img.shields.io/badge/Langues-8-red)
![100% Local](https://img.shields.io/badge/100%25-Local-darkgreen)
![Licence MIT](https://img.shields.io/badge/Licence-MIT-yellow)
![POC Validé](https://img.shields.io/badge/POC-Validé%20✅-brightgreen)

Application de conversation multilingue en temps réel. Chaque participant choisit son prénom et sa langue — la traduction est instantanée et automatique.

**Exemple d'usage :** Louise (🇫🇷) et Olivia (🇺🇸) parlent chacune dans leur langue, et se comprennent en temps réel. Nuria (🇪🇸) peut rejoindre la conversation à tout moment.

## 🎬 Démonstration

<video src="docs/media/demo.mov" controls width="100%"></video>

> Si la vidéo ne s'affiche pas, [cliquez ici pour la télécharger](docs/media/demo.mov).

## 📸 Captures d'écran

<table>
  <tr>
    <td align="center"><b>Écran de connexion</b></td>
    <td align="center"><b>Conversation en temps réel</b></td>
  </tr>
  <tr>
    <td><img src="docs/media/screenshot-01-selection.png" alt="Écran de connexion"/></td>
    <td><img src="docs/media/screenshot-02-conversation.png" alt="Conversation"/></td>
  </tr>
  <tr>
    <td align="center"><b>Vue Olivia (EN)</b></td>
    <td align="center"><b>Logs serveur</b></td>
  </tr>
  <tr>
    <td><img src="docs/media/screenshot-03-olivia.png" alt="Vue Olivia"/></td>
    <td><img src="docs/media/screenshot-04-terminal.png" alt="Terminal serveur"/></td>
  </tr>
</table>

## 🌍 Langues supportées

| Drapeau | Langue | Code |
|---------|--------|------|
| 🇫🇷 | Français | `fr` |
| 🇬🇧 | English | `en` |
| 🇨🇳 | 中文 Mandarin | `zh` |
| 🇸🇦 | العربية Arabe | `ar` |
| 🇷🇺 | Русский Russe | `ru` |
| 🇪🇸 | Español | `es` |
| 🇮🇹 | Italiano | `it` |
| 🇵🇹 | Português | `pt` |

## 🎨 Thèmes visuels

L'interface propose 4 thèmes, sélectionnables avant ou pendant la conversation. Le choix est sauvegardé automatiquement.

| # | Thème | Style |
|---|-------|-------|
| 🌈 | **Glassmorphism** | Fond dégradé violet/rose, effets verre dépoli |
| 🌑 | **Dark mode** | Fond sombre, accents violet/vert néon |
| ⬜ | **Minimaliste** | Blanc et noir, typographie épurée |
| 🌸 | **Vivid** | Coloré et chaleureux, chaque utilisateur a sa couleur |

## ✨ Fonctionnalités

- 🎤 **Transcription vocale** locale via [Whisper medium](https://github.com/openai/whisper) (faster-whisper)
- 🌍 **Traduction multilingue** via [LibreTranslate](https://libretranslate.com/) (100% local, 8 langues)
- 🔄 **Temps réel** via WebSockets — plusieurs participants simultanés
- 🤖 **Mode VAD** — détection automatique de la voix, mains libres
- 🔊 **Synthèse vocale (TTS)** — lecture automatique des traductions
- 🎨 **4 thèmes visuels** — sélectionnables et mémorisés
- 🌐 **Interface web** — aucune installation côté client
- 🔒 **100% local** — aucune donnée envoyée sur un serveur externe
- 🖥️ **Cross-platform** — Mac, Windows, Linux

## 🏗️ Architecture

```
Utilisateur A parle (FR)
    └─▶ Whisper transcrit en français
        └─▶ LibreTranslate traduit vers chaque langue présente
            ├─▶ Utilisateur B (EN) reçoit la traduction anglaise
            ├─▶ Utilisateur C (ES) reçoit la traduction espagnole
            └─▶ Utilisateur A (FR) voit son texte original
```

## 📋 Prérequis

- Python 3.11+ — [python.org](https://python.org)
- FFmpeg — [ffmpeg.org](https://ffmpeg.org)
- mkcert — [github.com/FiloSottile/mkcert](https://github.com/FiloSottile/mkcert)
- ~1.5 Go d'espace disque (modèles Whisper medium + LibreTranslate 8 langues)
- Microphone

## 🚀 Installation

### 🍎 macOS

```bash
git clone https://github.com/mcdesmonteix/projet-olivia.git
cd projet-olivia
chmod +x setup.sh start_all.sh start_ngrok.sh
./setup.sh
```

Le script installe automatiquement les dépendances via Homebrew et télécharge les modèles.

### 🪟 Windows

1. Installer [Python 3.11+](https://python.org/downloads/), [FFmpeg](https://ffmpeg.org/download.html) et [mkcert](https://github.com/FiloSottile/mkcert/releases)
2. Cloner le projet et ouvrir un terminal dans le dossier :
```bat
git clone https://github.com/mcdesmonteix/projet-olivia.git
cd projet-olivia
python -m venv .venv
.venv\Scripts\pip install -r requirements.txt
```
3. Télécharger les modèles :
```bat
.venv\Scripts\python -c "from faster_whisper import WhisperModel; WhisperModel('medium')"
.venv\Scripts\libretranslate --load-only fr,en,zh,ar,ru,es,it,pt --update-files
```

---

## ▶️ Lancement

### Cas 1 — Même réseau local (domicile, bureau)

> Deux ordinateurs sur le même Wi-Fi, ou ordi + téléphone sur le même réseau.

**macOS — une seule commande :**
```bash
./start_all.sh
```

**Windows — deux terminaux :**

Terminal 1 :
```bat
.venv\Scripts\libretranslate --load-only fr,en,zh,ar,ru,es,it,pt --port 5001
```

Terminal 2 :
```bat
ipconfig
REM Repérer l'IP locale (ex: 192.168.X.X)
mkcert 192.168.X.X localhost 127.0.0.1
.venv\Scripts\uvicorn main:app --host 0.0.0.0 --port 8000 --ssl-certfile 192.168.X.X+2.pem --ssl-keyfile 192.168.X.X+2-key.pem
```

**Comment se connecter :**

| Appareil | Adresse à ouvrir |
|----------|-----------------|
| L'ordinateur serveur | `https://localhost:8000` |
| Autre ordinateur (même Wi-Fi) | `https://192.168.X.X:8000` *(remplacer par ton IP locale)* |
| Téléphone (même Wi-Fi) | `https://192.168.X.X:8000` *(idem)* |

> La première fois, le navigateur affiche un avertissement SSL (certificat auto-signé).  
> Cliquer sur **"Paramètres avancés"** → **"Continuer quand même"**.  
> Sur iPhone : **"Afficher les détails"** → **"Visiter ce site web"**.

---

### Cas 2 — Longue distance via internet (Ngrok)

> Un participant est à l'étranger, sur un réseau différent.

#### Étape 1 — Installer et configurer Ngrok

**macOS :**
```bash
brew install ngrok
```

**Windows :** Télécharger sur [ngrok.com/download](https://ngrok.com/download) et ajouter au PATH.

Créer un compte gratuit sur [ngrok.com](https://ngrok.com), copier son token et l'enregistrer :
```bash
ngrok config add-authtoken TON_TOKEN_NGROK
```

#### Étape 2 — Lancer le serveur (sans SSL)

**macOS :**
```bash
./start_ngrok.sh
```

**Windows — deux terminaux :**

Terminal 1 :
```bat
.venv\Scripts\libretranslate --load-only fr,en,zh,ar,ru,es,it,pt --port 5001
```

Terminal 2 :
```bat
.venv\Scripts\uvicorn main:app --host 0.0.0.0 --port 8000
```

#### Étape 3 — Ouvrir le tunnel Ngrok

Dans un **nouveau terminal** :
```bash
ngrok http 8000
```

Ngrok affiche une URL de ce type :
```
Forwarding   https://abc123.ngrok-free.app → http://localhost:8000
```

#### Étape 4 — Partager l'URL

Envoie l'URL `https://abc123.ngrok-free.app` à l'autre personne (par SMS, WhatsApp, email…).

**Les deux participants ouvrent la même URL** dans leur navigateur — que ce soit sur ordinateur ou téléphone, n'importe où dans le monde.

> ✅ Ngrok fournit déjà le HTTPS — pas besoin de certificat SSL.  
> ⚠️ Le lien change à chaque redémarrage de Ngrok (version gratuite).

---

#### Récapitulatif des connexions

```
┌─────────────────────────────────────────────────────────────┐
│  Réseau local (même Wi-Fi)                                   │
│                                                              │
│  Serveur (Mac/PC)  ──────────────────────────────────────   │
│       ↕                                                      │
│  Autre PC          →  https://192.168.x.x:8000              │
│  Téléphone         →  https://192.168.x.x:8000              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  Longue distance (Ngrok)                                     │
│                                                              │
│  Serveur (Mac/PC)                                            │
│       ↕ ngrok http 8000                                      │
│  https://abc123.ngrok-free.app                               │
│       ↕                                                      │
│  N'importe quel appareil dans le monde                       │
│  (PC, Mac, iPhone, Android)                                  │
└─────────────────────────────────────────────────────────────┘
```

---

## 📁 Structure du projet

```
projet-olivia/
├── main.py                  # Serveur FastAPI + WebSockets + Whisper + LibreTranslate
├── start_all.sh             # Lancement réseau local (avec SSL)
├── start_ngrok.sh           # Lancement internet via Ngrok (sans SSL)
├── setup.sh                 # Installation automatique (macOS)
├── requirements.txt         # Dépendances Python
├── design_proposals/        # Maquettes HTML des 4 thèmes
└── static/
    ├── index.html           # Interface web
    ├── style.css            # Styles (4 thèmes CSS)
    └── app.js               # WebSocket + audio + VAD + TTS + thèmes
```

## 🗺️ Roadmap

- [x] POC — conversation FR ↔ EN sur réseau local (validé le 14/04/2026)
- [x] Synthèse vocale (TTS) — lecture automatique des traductions
- [x] Mode VAD — détection automatique de la voix
- [x] Script de lancement unique (`./start_all.sh`)
- [x] Connexion internet via Ngrok (`./start_ngrok.sh`)
- [x] Interface dynamique — prénom + langue au choix
- [x] 8 langues : 🇫🇷 🇬🇧 🇨🇳 🇸🇦 🇷🇺 🇪🇸 🇮🇹 🇵🇹
- [x] Whisper medium — meilleure qualité de transcription
- [x] 4 thèmes visuels sélectionnables
- [ ] Application mobile native (iOS / Android)
- [ ] Hébergement permanent (sans avoir à laisser son PC allumé)

## 📄 Licence

MIT — libre d'utilisation, modification et distribution.
