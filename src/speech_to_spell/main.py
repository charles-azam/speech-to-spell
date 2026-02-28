import base64
import json
import logging

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from speech_to_spell.voice import transcribe

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Speech to Spell")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket) -> None:
    await websocket.accept()
    logger.info("WebSocket connected")

    while True:
        raw = await websocket.receive_text()
        message = json.loads(raw)

        if message["type"] == "audio":
            player = message["player"]
            audio_b64 = message["audio"]
            audio_bytes = base64.b64decode(audio_b64)

            logger.info(f"Received audio from player {player} ({len(audio_bytes)} bytes)")

            text = transcribe(audio_bytes=audio_bytes)
            logger.info(f"Transcription for player {player}: {text}")

            await websocket.send_text(json.dumps({
                "type": "transcription",
                "player": player,
                "text": text,
            }))
