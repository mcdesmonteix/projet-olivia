import asyncio
import base64
import os
import tempfile
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from typing import Dict

import httpx
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from faster_whisper import WhisperModel

app = FastAPI()

LIBRETRANSLATE_URL = "http://127.0.0.1:5001/translate"

# Langues complexes (non-latines) → modèle medium pour la qualité
LANGS_MEDIUM = {"zh", "ar", "ru"}

# ── Limites de sécurité ──
MAX_AUDIO_BYTES    = 10 * 1024 * 1024  # 10 Mo max par message audio
MAX_PARTICIPANTS   = 2                  # 2 personnes max par salle
RATE_LIMIT_SECONDS = 3.0               # 1 audio toutes les 3s par session
INACTIVITY_TIMEOUT = 30 * 60           # 30 min sans message → déconnexion

print("Chargement des modèles Whisper...")
model_small = WhisperModel("small", device="cpu", compute_type="int8")
model_medium = WhisperModel("medium", device="cpu", compute_type="int8")
print("Modèles prêts !")

_executor = ThreadPoolExecutor(max_workers=2)

# Salles : { room_id: { session_id: { "ws", "name", "lang", "last_audio", "last_seen" } } }
rooms: Dict[str, Dict[str, dict]] = {}


def _transcribe_sync(audio_bytes: bytes, lang: str) -> str:
    whisper = model_medium if lang in LANGS_MEDIUM else model_small
    with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as f:
        f.write(audio_bytes)
        tmp_path = f.name
    try:
        segments, info = whisper.transcribe(
            tmp_path,
            language=lang,
            beam_size=1,
            no_speech_threshold=0.6,
            condition_on_previous_text=False,
            vad_filter=True,
            vad_parameters={"min_silence_duration_ms": 300},
        )
        text = " ".join(
            seg.text.strip()
            for seg in segments
            if seg.no_speech_prob < 0.6
        )
        print(f"  Transcription ({info.language}, {'medium' if lang in LANGS_MEDIUM else 'small'}) : {text}")
        return text
    finally:
        os.unlink(tmp_path)


async def transcribe(audio_bytes: bytes, lang: str) -> str:
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(_executor, _transcribe_sync, audio_bytes, lang)


async def translate(text: str, source: str, target: str) -> str:
    if source == target:
        return text
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            LIBRETRANSLATE_URL,
            json={"q": text, "source": source, "target": target, "api_key": ""},
            timeout=15.0,
        )
        data = resp.json()
        result = data.get("translatedText") or data.get("error", "Traduction indisponible")
        print(f"  Traduction ({source}→{target}) : {result}")
        return result


async def broadcast_room(room_id: str, message: dict, exclude: str = None):
    if room_id not in rooms:
        return
    dead = []
    for sid, info in rooms[room_id].items():
        if sid == exclude:
            continue
        try:
            await info["ws"].send_json(message)
        except Exception:
            dead.append(sid)
    for sid in dead:
        rooms[room_id].pop(sid, None)


def disconnect_user(room_id: str, session_id: str):
    """Retire un utilisateur de sa salle et nettoie si vide."""
    user = rooms.get(room_id, {}).pop(session_id, {})
    if room_id in rooms and not rooms[room_id]:
        del rooms[room_id]
    return user


@app.get("/room/{room_id}")
async def room_page(room_id: str):
    return FileResponse("static/index.html", headers={"Cache-Control": "no-cache, no-store, must-revalidate"})


@app.websocket("/ws/{room_id}/{session_id}")
async def websocket_endpoint(websocket: WebSocket, room_id: str, session_id: str):
    await websocket.accept()

    # ── Salle pleine ? ──
    if room_id in rooms and len(rooms[room_id]) >= MAX_PARTICIPANTS:
        await websocket.send_json({"type": "error", "message": "Salle complète (2 participants maximum)."})
        await websocket.close()
        return

    if room_id not in rooms:
        rooms[room_id] = {}
    rooms[room_id][session_id] = {
        "ws": websocket,
        "name": session_id,
        "lang": "fr",
        "last_audio": 0.0,
        "last_seen": time.time(),
    }

    async def inactivity_watchdog():
        """Déconnecte la session après INACTIVITY_TIMEOUT secondes sans activité."""
        while True:
            await asyncio.sleep(60)
            if session_id not in rooms.get(room_id, {}):
                return
            idle = time.time() - rooms[room_id][session_id]["last_seen"]
            if idle >= INACTIVITY_TIMEOUT:
                print(f"\n[timeout] {rooms[room_id][session_id]['name']} inactif depuis {idle:.0f}s")
                await websocket.close()
                return

    watchdog = asyncio.create_task(inactivity_watchdog())

    try:
        while True:
            data = await websocket.receive_json()
            rooms[room_id][session_id]["last_seen"] = time.time()

            # ── Connexion avec nom et langue ──
            if data["type"] == "join":
                rooms[room_id][session_id]["name"] = data["name"]
                rooms[room_id][session_id]["lang"] = data["lang"]
                name = data["name"]
                print(f"\n[+] {name} connecté(e) en {data['lang']} (salle {room_id}, {len(rooms[room_id])} en ligne)")

                await broadcast_room(room_id, {
                    "type": "status",
                    "session_id": session_id,
                    "name": name,
                    "lang": data["lang"],
                    "online": True,
                })

            # ── Audio reçu ──
            elif data["type"] == "audio":
                user = rooms[room_id][session_id]
                lang = user["lang"]
                name = user["name"]

                # Rate limiting
                now = time.time()
                if now - user["last_audio"] < RATE_LIMIT_SECONDS:
                    print(f"  [{name}] rate limit — ignoré")
                    continue
                rooms[room_id][session_id]["last_audio"] = now

                audio_bytes = base64.b64decode(data["data"])

                # Limite de taille
                if len(audio_bytes) > MAX_AUDIO_BYTES:
                    print(f"  [{name}] audio trop volumineux ({len(audio_bytes)} octets) — rejeté")
                    await websocket.send_json({"type": "error", "message": "Audio trop volumineux."})
                    continue

                print(f"\n[{name}] Audio reçu ({len(audio_bytes)} octets, salle {room_id})")

                try:
                    original = await transcribe(audio_bytes, lang)
                    if not original.strip():
                        print("  (transcription vide, ignorée)")
                        continue

                    translations = {}
                    for sid, other in rooms[room_id].items():
                        if sid == session_id:
                            continue
                        target = other["lang"]
                        if target not in translations:
                            translations[target] = await translate(original, lang, target)

                    await broadcast_room(room_id, {
                        "type": "message",
                        "session_id": session_id,
                        "name": name,
                        "lang": lang,
                        "original": original,
                        "translations": translations,
                        "timestamp": datetime.now().strftime("%H:%M"),
                    })

                except Exception as e:
                    print(f"  Erreur : {e}")
                    await websocket.send_json({"type": "error", "message": "Erreur lors du traitement audio."})

    except WebSocketDisconnect:
        pass
    finally:
        watchdog.cancel()
        user = disconnect_user(room_id, session_id)
        name = user.get("name", session_id)
        print(f"\n[-] {name} déconnecté(e) (salle {room_id})")
        await broadcast_room(room_id, {
            "type": "status",
            "session_id": session_id,
            "name": name,
            "lang": user.get("lang", ""),
            "online": False,
        })


@app.get("/")
async def root():
    return FileResponse("static/index.html", headers={"Cache-Control": "no-cache, no-store, must-revalidate"})


app.mount("/static", StaticFiles(directory="static"), name="static")
