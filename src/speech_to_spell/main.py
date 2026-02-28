import asyncio
import base64
import json
import logging

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from speech_to_spell.game import GameState, apply_spell, format_game_context
from speech_to_spell.sound import load_sound
from speech_to_spell.spell import interpret_spell
from speech_to_spell.voice import transcribe

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

ENABLE_SOUND_EFFECTS = True

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


async def send_game_state(websocket: WebSocket, game: GameState) -> None:
    await websocket.send_text(json.dumps({
        "type": "game_state",
        "left": {"health": game.left.health, "mana": game.left.mana},
        "right": {"health": game.right.health, "mana": game.right.mana},
        "turn_number": game.turn_number,
        "winner": game.winner,
    }))


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket) -> None:
    await websocket.accept()
    logger.info("WebSocket connected")

    game = GameState()
    await send_game_state(websocket=websocket, game=game)

    while True:
        raw = await websocket.receive_text()
        message = json.loads(raw)

        if message["type"] == "audio":
            player = message["player"]
            audio_b64 = message["audio"]
            audio_bytes = base64.b64decode(audio_b64)

            if len(audio_bytes) == 0:
                logger.warning(f"Empty audio from player {player}, skipping")
                continue

            if game.winner:
                logger.info("Game is over, ignoring audio")
                continue

            logger.info(f"Received audio from player {player} ({len(audio_bytes)} bytes)")

            text = await asyncio.to_thread(transcribe, audio_bytes=audio_bytes)
            logger.info(f"Transcription for player {player}: {text}")

            await websocket.send_text(json.dumps({
                "type": "transcription",
                "player": player,
                "text": text,
            }))

            # Ministral spell interpretation with game context
            context = format_game_context(game=game, caster=player)
            spell = await asyncio.to_thread(
                interpret_spell,
                transcription=text,
                game_context=context,
            )
            logger.info(
                f"Spell for player {player}: {spell.spell_name} "
                f"(dmg={spell.damage}, mana={spell.mana_cost}, color={spell.color}, sound={spell.sound_id})"
            )

            # Apply spell to game state
            game = apply_spell(game=game, caster=player, spell=spell)

            opponent = "right" if player == "left" else "left"
            await websocket.send_text(json.dumps({
                "type": "spell_result",
                "caster": player,
                "target": opponent,
                "spell_name": spell.spell_name,
                "color": spell.color,
                "damage": spell.damage,
                "mana_cost": spell.mana_cost,
            }))

            await send_game_state(websocket=websocket, game=game)

            # Play sound effect from pre-generated bank (instant, no API call)
            if ENABLE_SOUND_EFFECTS and spell.sound_id:
                sound_bytes = load_sound(sound_id=spell.sound_id)
                if sound_bytes:
                    await websocket.send_text(json.dumps({
                        "type": "sound_effect",
                        "audio": base64.b64encode(sound_bytes).decode(),
                    }))
