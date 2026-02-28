import asyncio
import base64
import json
import logging

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from speech_to_spell.game import (
    GameState,
    apply_spell,
    consume_and_refill,
    create_game,
    format_game_context,
)
from speech_to_spell.sound import load_sound
from speech_to_spell.spell import JudgeVerdict, interpret_spell
from speech_to_spell.voice import transcribe

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

ENABLE_SOUND_EFFECTS = True
MIN_EMOJIS = 2

app = FastAPI(title="Speech to Spell")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class PendingExplanation(BaseModel):
    """Stored context when judge asks for EXPLAIN."""
    player: str
    selected_emojis: list[str]
    transcription: str


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


async def send_game_state(websocket: WebSocket, game: GameState) -> None:
    await websocket.send_text(json.dumps({
        "type": "game_state",
        "left": {
            "health": game.left.health,
            "emoji_hand": game.left.emoji_hand,
        },
        "right": {
            "health": game.right.health,
            "emoji_hand": game.right.emoji_hand,
        },
        "turn_number": game.turn_number,
        "winner": game.winner,
    }))


async def send_judge_verdict(
    websocket: WebSocket,
    verdict: JudgeVerdict,
    caster: str,
    target: str,
) -> None:
    """Send the judge's verdict to the client."""
    await websocket.send_text(json.dumps({
        "type": "judge_verdict",
        "verdict": verdict.verdict,
        "comment": verdict.comment,
        "caster": caster,
        "target": target,
        "spell_name": verdict.spell_name,
        "damage": verdict.damage,
        "visual_effect": verdict.visual_effect.model_dump() if verdict.visual_effect else None,
    }))


async def send_sound_effect(websocket: WebSocket, sound_id: str | None) -> None:
    if ENABLE_SOUND_EFFECTS and sound_id:
        sound_bytes = load_sound(sound_id=sound_id)
        if sound_bytes:
            await websocket.send_text(json.dumps({
                "type": "sound_effect",
                "audio": base64.b64encode(sound_bytes).decode(),
            }))


def validate_emojis(selected_emojis: list[str], player_hand: list[str]) -> str | None:
    """Validate that selected emojis are in the player's hand. Returns error message or None."""
    if len(selected_emojis) < MIN_EMOJIS:
        return f"Tu dois choisir au moins {MIN_EMOJIS} emojis."

    for emoji in selected_emojis:
        if emoji not in player_hand:
            return f"L'emoji {emoji} n'est pas dans ta main !"

    return None


async def process_spell(
    websocket: WebSocket,
    game: GameState,
    player: str,
    selected_emojis: list[str],
    transcription: str,
    explanation: str | None = None,
) -> tuple[GameState, PendingExplanation | None]:
    """Process a spell through the judge and apply results. Returns updated game + pending explanation if EXPLAIN."""
    context = format_game_context(game=game, caster=player)

    verdict = await asyncio.to_thread(
        interpret_spell,
        selected_emojis=selected_emojis,
        transcription=transcription,
        game_context=context,
        explanation=explanation,
    )

    # The judge decides attack vs heal
    if verdict.target == "heal":
        target_side = player
    else:
        target_side = "right" if player == "left" else "left"

    logger.info(
        f"Judge verdict for {player}: {verdict.verdict} — {verdict.comment} "
        f"(spell={verdict.spell_name}, target={verdict.target}, dmg={verdict.damage})"
    )

    # Send verdict to client
    await send_judge_verdict(
        websocket=websocket,
        verdict=verdict,
        caster=player,
        target=target_side,
    )

    if verdict.verdict == "EXPLAIN" and explanation is None:
        # First EXPLAIN — store context, wait for player's explanation
        return game, PendingExplanation(
            player=player,
            selected_emojis=selected_emojis,
            transcription=transcription,
        )

    if verdict.verdict == "YES":
        # Apply spell effects
        game = apply_spell(
            game=game,
            caster=player,
            target=target_side,
            damage=verdict.damage,
            spell_name=verdict.spell_name,
        )

        # Send sound
        await send_sound_effect(websocket=websocket, sound_id=verdict.sound_id)

    # Consume emojis regardless of verdict (YES, NO, or EXPLAIN→final)
    game = consume_and_refill(game=game, player=player, used_emojis=selected_emojis)

    # Send updated game state
    await send_game_state(websocket=websocket, game=game)

    return game, None


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket) -> None:
    await websocket.accept()
    logger.info("WebSocket connected")

    game = create_game()
    pending_explanation: PendingExplanation | None = None

    await send_game_state(websocket=websocket, game=game)

    while True:
        raw = await websocket.receive_text()
        message = json.loads(raw)
        msg_type = message["type"]

        if msg_type == "cast_spell":
            player = message["player"]
            selected_emojis = message["selected_emojis"]

            if game.winner:
                continue

            # Validate emojis
            player_state = game.left if player == "left" else game.right
            error = validate_emojis(selected_emojis=selected_emojis, player_hand=player_state.emoji_hand)
            if error:
                await websocket.send_text(json.dumps({
                    "type": "spell_fizzle",
                    "player": player,
                    "reason": error,
                }))
                continue

            # Get transcription from audio or text
            if "audio" in message:
                audio_bytes = base64.b64decode(message["audio"])
                if len(audio_bytes) < 1000:
                    await websocket.send_text(json.dumps({
                        "type": "spell_fizzle",
                        "player": player,
                        "reason": "Parle plus fort, sorcier !",
                    }))
                    continue
                text = await asyncio.to_thread(transcribe, audio_bytes=audio_bytes)
                await websocket.send_text(json.dumps({
                    "type": "transcription",
                    "player": player,
                    "text": text,
                }))
                if not text.strip():
                    await websocket.send_text(json.dumps({
                        "type": "spell_fizzle",
                        "player": player,
                        "reason": "Le juge n'a rien entendu...",
                    }))
                    continue
            elif "text" in message:
                text = message["text"]
                if not text.strip():
                    continue
                await websocket.send_text(json.dumps({
                    "type": "transcription",
                    "player": player,
                    "text": text,
                }))
            else:
                continue

            logger.info(f"Spell from {player}: emojis={selected_emojis}, text={text!r}")

            game, pending_explanation = await process_spell(
                websocket=websocket,
                game=game,
                player=player,
                selected_emojis=selected_emojis,
                transcription=text,
            )

        elif msg_type == "explain_spell":
            if pending_explanation is None:
                logger.warning("Received explain_spell but no pending explanation")
                continue

            player = pending_explanation.player

            # Get explanation from audio or text
            if "audio" in message:
                audio_bytes = base64.b64decode(message["audio"])
                explanation_text = await asyncio.to_thread(transcribe, audio_bytes=audio_bytes)
                await websocket.send_text(json.dumps({
                    "type": "transcription",
                    "player": player,
                    "text": explanation_text,
                }))
            elif "text" in message:
                explanation_text = message["text"]
            else:
                explanation_text = ""

            logger.info(f"Explanation from {player}: {explanation_text!r}")

            # Re-evaluate with explanation — only YES or NO this time
            game, _ = await process_spell(
                websocket=websocket,
                game=game,
                player=pending_explanation.player,
                selected_emojis=pending_explanation.selected_emojis,
                transcription=pending_explanation.transcription,
                explanation=explanation_text,
            )
            pending_explanation = None

        elif msg_type == "text_spell":
            # Text spell bypass for testing — same as cast_spell but with text
            player = message["player"]
            text = message.get("text", "").strip()
            selected_emojis = message.get("selected_emojis", [])

            if not text or game.winner:
                continue

            player_state = game.left if player == "left" else game.right
            error = validate_emojis(selected_emojis=selected_emojis, player_hand=player_state.emoji_hand)
            if error:
                await websocket.send_text(json.dumps({
                    "type": "spell_fizzle",
                    "player": player,
                    "reason": error,
                }))
                continue

            await websocket.send_text(json.dumps({
                "type": "transcription",
                "player": player,
                "text": text,
            }))

            game, pending_explanation = await process_spell(
                websocket=websocket,
                game=game,
                player=player,
                selected_emojis=selected_emojis,
                transcription=text,
            )
