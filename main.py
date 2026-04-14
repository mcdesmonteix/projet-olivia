import asyncio
import base64
import json
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
model = WhisperModel("small", device="cpu", compute_type="int8")
print("Modèle prêt !")

# Clients connectés : { "louise": websocket, "olivia": websocket }
clients: Dict[str, WebSocket] = {}


async def transcribe(audio_bytes: bytes) -> str:
    suffix = ".webm"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as f:
        f.write(audio_bytes)
        tmp_path = f.name
    try:
        segments, info = model.transcribe(tmp_path)
        text = " ".join(seg.text.strip() for seg in segments)
        print(f"  Transcription ({info.language}) : {text}")
        return text
    finally:
        os.unlink(tmp_path)


async def translate(text: str, source: str, target: str) -> str:
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            LIBRETRANSLATE_URL,
            json={"q": text, "source": source, "target": target, "api_key": ""},
            timeout=15.0,
        )
        print(f"  LibreTranslate status: {resp.status_code}, body: {resp.text[:200]}")
        data = resp.json()
        result = data.get("translatedText") or data.get("error", "Traduction indisponible")
        print(f"  Traduction ({source}→{target}) : {result}")
        return result


async def broadcast(message: dict):
    dead = []
    for uid, ws in clients.items():
        try:
            await ws.send_json(message)
        except Exception:
            dead.append(uid)
    for uid in dead:
        clients.pop(uid, None)


@app.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    await websocket.accept()
    clients[user_id] = websocket
    print(f"\n[+] {user_id} connecté(e) ({len(clients)} en ligne)")

    await broadcast({"type": "status", "user": user_id, "online": True})

    try:
        while True:
            data = await websocket.receive_json()

            if data["type"] == "audio":
                audio_bytes = base64.b64decode(data["data"])
                lang = data["lang"]  # "fr" ou "en"
                target = "en" if lang == "fr" else "fr"

                print(f"\n[{user_id}] Audio reçu ({len(audio_bytes)} octets)")

                try:
                    original = await transcribe(audio_bytes)
                    if not original.strip():
                        print("  (transcription vide, ignorée)")
                        continue

                    translated = await translate(original, lang, target)

                    await broadcast({
                        "type": "message",
                        "user": user_id,
                        "original": original,
                        "translated": translated,
                        "timestamp": datetime.now().strftime("%H:%M"),
                    })
                except Exception as e:
                    print(f"  Erreur traitement audio : {e}")
                    await websocket.send_json({"type": "error", "message": str(e)})

    except WebSocketDisconnect:
        clients.pop(user_id, None)
        print(f"\n[-] {user_id} déconnecté(e)")
        await broadcast({"type": "status", "user": user_id, "online": False})


@app.get("/")
async def root():
    return FileResponse("static/index.html")


app.mount("/static", StaticFiles(directory="static"), name="static")
