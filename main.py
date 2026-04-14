import base64
import os
import tempfile
from datetime import datetime
from typing import Dict

import httpx
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from faster_whisper import WhisperModel

app = FastAPI()

LIBRETRANSLATE_URL = "http://127.0.0.1:5001/translate"

print("Chargement du modèle Whisper...")
model = WhisperModel("medium", device="cpu", compute_type="int8")
print("Modèle prêt !")

# Utilisateurs connectés : { session_id: { "ws", "name", "lang" } }
users: Dict[str, dict] = {}


async def transcribe(audio_bytes: bytes, lang: str) -> str:
    with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as f:
        f.write(audio_bytes)
        tmp_path = f.name
    try:
        segments, info = model.transcribe(tmp_path, language=lang)
        text = " ".join(seg.text.strip() for seg in segments)
        print(f"  Transcription ({info.language}) : {text}")
        return text
    finally:
        os.unlink(tmp_path)


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


async def broadcast(message: dict, exclude: str = None):
    dead = []
    for sid, info in users.items():
        if sid == exclude:
            continue
        try:
            await info["ws"].send_json(message)
        except Exception:
            dead.append(sid)
    for sid in dead:
        users.pop(sid, None)


async def broadcast_all(message: dict):
    await broadcast(message, exclude=None)


@app.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    await websocket.accept()
    users[session_id] = {"ws": websocket, "name": session_id, "lang": "fr"}

    try:
        while True:
            data = await websocket.receive_json()

            # ── Connexion avec nom et langue ──
            if data["type"] == "join":
                users[session_id]["name"] = data["name"]
                users[session_id]["lang"] = data["lang"]
                name = data["name"]
                print(f"\n[+] {name} connecté(e) en {data['lang']} ({len(users)} en ligne)")

                # Informer tout le monde de la connexion
                await broadcast_all({
                    "type": "status",
                    "session_id": session_id,
                    "name": name,
                    "lang": data["lang"],
                    "online": True,
                })

            # ── Audio reçu ──
            elif data["type"] == "audio":
                user = users[session_id]
                lang = user["lang"]
                name = user["name"]

                audio_bytes = base64.b64decode(data["data"])
                print(f"\n[{name}] Audio reçu ({len(audio_bytes)} octets)")

                try:
                    original = await transcribe(audio_bytes, lang)
                    if not original.strip():
                        print("  (transcription vide, ignorée)")
                        continue

                    # Traduire pour chaque autre utilisateur dans sa langue
                    translations = {}
                    for sid, other in users.items():
                        if sid == session_id:
                            continue
                        target = other["lang"]
                        if target not in translations:
                            translations[target] = await translate(original, lang, target)

                    # Diffuser le message avec toutes les traductions
                    await broadcast_all({
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
                    await websocket.send_json({"type": "error", "message": str(e)})

    except WebSocketDisconnect:
        user = users.pop(session_id, {})
        name = user.get("name", session_id)
        print(f"\n[-] {name} déconnecté(e)")
        await broadcast_all({
            "type": "status",
            "session_id": session_id,
            "name": name,
            "lang": user.get("lang", ""),
            "online": False,
        })


@app.get("/")
async def root():
    return FileResponse("static/index.html")


app.mount("/static", StaticFiles(directory="static"), name="static")
