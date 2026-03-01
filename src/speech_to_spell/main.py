import asyncio
import base64
import json
import logging
import os

from contextlib import asynccontextmanager

from dotenv import load_dotenv

load_dotenv()
from typing import Any

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from speech_to_spell.game import (
    GameState,
    apply_spell,
    consume_and_refill,
    create_game,
    format_game_context,
)
from speech_to_spell.room import (
    PendingExplanation,
    Room,
    cleanup_stale_rooms,
    create_room,
    fill_both_sides,
    get_room,
    get_room_websockets,
    join_room,
    register_ws,
    unregister_ws,
)
from speech_to_spell.sound import load_sound
from speech_to_spell.spell import JudgeVerdict, interpret_spell
from speech_to_spell.tts import text_to_speech
from speech_to_spell.voice import transcribe

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

ENABLE_SOUND_EFFECTS = True
MIN_EMOJIS = 2


async def periodic_cleanup() -> None:
    """Background task: remove stale rooms every 5 minutes."""
    while True:
        await asyncio.sleep(300)
        removed = cleanup_stale_rooms(max_age_s=3600)
        if removed:
            logger.info(f"Cleaned up {removed} stale rooms")


@asynccontextmanager
async def lifespan(app: FastAPI):  # noqa: ARG001
    task = asyncio.create_task(periodic_cleanup())
    yield
    task.cancel()


app = FastAPI(title="Speech to Spell", lifespan=lifespan)

allowed_origins = os.environ.get("ALLOWED_ORIGINS", "*").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- REST endpoints ---


class CreateRoomRequest(BaseModel):
    wizard_name: str
    mode: str  # "same_computer" or "multi_computer"


class CreateRoomResponse(BaseModel):
    room_code: str
    side: str


class JoinRoomRequest(BaseModel):
    wizard_name: str


class JoinRoomResponse(BaseModel):
    room_code: str
    side: str


class RoomStatusResponse(BaseModel):
    room_code: str
    players: dict[str, Any]
    game_started: bool


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/rooms")
def api_create_room(body: CreateRoomRequest) -> CreateRoomResponse:
    room = create_room(wizard_name=body.wizard_name)

    if body.mode == "same_computer":
        fill_both_sides(code=room.code, wizard_name=body.wizard_name)
        # Create game immediately for same-computer
        room.game = create_game()

    return CreateRoomResponse(room_code=room.code, side="left")


@app.post("/api/rooms/{code}/join")
def api_join_room(code: str, body: JoinRoomRequest) -> JoinRoomResponse:
    room = get_room(code=code.upper())
    if room is None:
        raise HTTPException(status_code=404, detail="Room not found")
    if "right" in room.players:
        raise HTTPException(status_code=409, detail="Room is full")
    room, side = join_room(code=code.upper(), wizard_name=body.wizard_name)
    return JoinRoomResponse(room_code=room.code, side=side)


@app.get("/api/rooms/{code}")
def api_room_status(code: str) -> RoomStatusResponse:
    room = get_room(code=code.upper())
    if room is None:
        raise HTTPException(status_code=404, detail="Room not found")
    return RoomStatusResponse(
        room_code=room.code,
        players={side: info.model_dump() for side, info in room.players.items()},
        game_started=room.game is not None,
    )


# --- Broadcasting helpers ---


async def broadcast_to_room(room_code: str, message: dict[str, Any]) -> None:
    """Send a message to all WebSocket connections in a room."""
    websockets = get_room_websockets(code=room_code)
    raw = json.dumps(message)
    dead_sides: list[str] = []
    for side_key, ws in websockets.items():
        try:
            await ws.send_text(raw)
        except Exception:
            logger.warning(f"Dead WebSocket in room {room_code} side={side_key}, unregistering")
            dead_sides.append(side_key)
    for side_key in dead_sides:
        unregister_ws(code=room_code, side=side_key)


async def broadcast_game_state(room: Room) -> None:
    """Send game state to all connections, filtering hands for remote players."""
    if room.game is None:
        return

    game = room.game
    websockets = get_room_websockets(code=room.code)
    dead_sides: list[str] = []

    for side, ws in websockets.items():
        if side == "both":
            # Same-computer: send everything
            msg = {
                "type": "game_state",
                "left": {
                    "health": game.left.health,
                    "emoji_hand": game.left.emoji_hand,
                    "spells_cast": game.left.spells_cast,
                },
                "right": {
                    "health": game.right.health,
                    "emoji_hand": game.right.emoji_hand,
                    "spells_cast": game.right.spells_cast,
                },
                "turn_number": game.turn_number,
                "winner": game.winner,
            }
        else:
            # Remote player: hide opponent's hand
            opponent = "right" if side == "left" else "left"
            own_state = game.left if side == "left" else game.right
            opp_state = game.left if opponent == "left" else game.right
            msg = {
                "type": "game_state",
                "left" if side == "left" else "right": {
                    "health": own_state.health,
                    "emoji_hand": own_state.emoji_hand,
                    "spells_cast": own_state.spells_cast,
                },
                opponent: {
                    "health": opp_state.health,
                    "emoji_hand": [],  # Hidden
                    "spells_cast": opp_state.spells_cast,
                },
                "turn_number": game.turn_number,
                "winner": game.winner,
            }
        try:
            await ws.send_text(json.dumps(msg))
        except Exception:
            logger.warning(f"Dead WebSocket in room {room.code} side={side}, unregistering")
            dead_sides.append(side)

    for side_key in dead_sides:
        unregister_ws(code=room.code, side=side_key)


async def broadcast_judge_verdict(
    room_code: str,
    verdict: JudgeVerdict,
    caster: str,
    target: str,
) -> None:
    """Send the judge's verdict to all clients in the room."""
    await broadcast_to_room(
        room_code=room_code,
        message={
            "type": "judge_verdict",
            "verdict": verdict.verdict,
            "comment": verdict.comment,
            "caster": caster,
            "target": target,
            "spell_name": verdict.spell_name,
            "damage": verdict.damage,
            "visual_effect": verdict.visual_effect.model_dump() if verdict.visual_effect else None,
        },
    )


async def broadcast_sound_effect(room_code: str, sound_id: str | None) -> None:
    if ENABLE_SOUND_EFFECTS and sound_id:
        sound_bytes = load_sound(sound_id=sound_id)
        if sound_bytes:
            await broadcast_to_room(
                room_code=room_code,
                message={
                    "type": "sound_effect",
                    "audio": base64.b64encode(sound_bytes).decode(),
                },
            )


async def broadcast_judge_voice(room_code: str, comment: str) -> None:
    """Generate TTS for the judge's comment and broadcast to room."""
    audio_bytes = await asyncio.to_thread(text_to_speech, text=comment)
    await broadcast_to_room(
        room_code=room_code,
        message={
            "type": "judge_voice",
            "audio": base64.b64encode(audio_bytes).decode(),
        },
    )


# --- Game logic ---


def validate_emojis(selected_emojis: list[str], player_hand: list[str]) -> str | None:
    """Validate that selected emojis are in the player's hand. Returns error message or None."""
    if len(selected_emojis) < MIN_EMOJIS:
        return f"Tu dois choisir au moins {MIN_EMOJIS} emojis."

    for emoji in selected_emojis:
        if emoji not in player_hand:
            return f"L'emoji {emoji} n'est pas dans ta main !"

    return None


async def process_spell(
    room: Room,
    player: str,
    selected_emojis: list[str],
    transcription: str,
    explanation: str | None = None,
) -> None:
    """Process a spell through the judge and apply results. Updates room in-place."""
    game = room.game
    assert game is not None

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

    # Send verdict to all clients in room
    await broadcast_judge_verdict(
        room_code=room.code,
        verdict=verdict,
        caster=player,
        target=target_side,
    )

    if verdict.verdict == "EXPLAIN" and explanation is None:
        # First EXPLAIN — store context per player, wait for player's explanation
        room.pending_explanations[player] = PendingExplanation(
            player=player,
            selected_emojis=selected_emojis,
            transcription=transcription,
        )
        # Still broadcast judge voice for EXPLAIN verdicts
        await broadcast_judge_voice(room_code=room.code, comment=verdict.comment)
        return

    if verdict.verdict == "YES":
        # Apply spell effects
        room.game = apply_spell(
            game=game,
            caster=player,
            target=target_side,
            damage=verdict.damage,
            spell_name=verdict.spell_name,
        )

        # Send sound effect + judge voice in parallel
        await asyncio.gather(
            broadcast_sound_effect(room_code=room.code, sound_id=verdict.sound_id),
            broadcast_judge_voice(room_code=room.code, comment=verdict.comment),
        )
    else:
        # NO verdict — just broadcast judge voice
        await broadcast_judge_voice(room_code=room.code, comment=verdict.comment)

    # Consume emojis regardless of verdict (YES, NO, or EXPLAIN->final)
    room.game = consume_and_refill(game=room.game, player=player, used_emojis=selected_emojis)

    # Send updated game state
    await broadcast_game_state(room=room)

    # Clear pending explanation for this player
    room.pending_explanations.pop(player, None)


# --- WebSocket endpoint ---


@app.websocket("/ws/{room_code}")
async def websocket_endpoint(
    websocket: WebSocket,
    room_code: str,
    side: str = Query(default="both"),
) -> None:
    room_code = room_code.upper()
    room = get_room(code=room_code)

    if room is None:
        await websocket.close(code=4004, reason="Room not found")
        return

    await websocket.accept()
    logger.info(f"WebSocket connected: room={room_code}, side={side}")

    # Register this connection
    if side == "both":
        register_ws(code=room_code, side="both", ws=websocket)
    else:
        register_ws(code=room_code, side=side, ws=websocket)

    # Start game if both players are connected (multi-computer)
    if room.game is None:
        websockets = get_room_websockets(code=room_code)
        if "left" in websockets and "right" in websockets:
            room.game = create_game()
            logger.info(f"Game started in room {room_code}")

    # Notify other players that someone joined
    if side != "both":
        player_info = room.players.get(side)
        wizard_name = player_info.wizard_name if player_info else "Unknown"
        await broadcast_to_room(
            room_code=room_code,
            message={
                "type": "player_joined",
                "side": side,
                "wizard_name": wizard_name,
            },
        )

    # Send current game state if game has started
    if room.game is not None:
        await broadcast_game_state(room=room)

    try:
        while True:
            raw = await websocket.receive_text()
            message = json.loads(raw)
            msg_type = message["type"]

            if msg_type == "cast_spell":
                player = message["player"]
                selected_emojis = message["selected_emojis"]

                if room.game is None or room.game.winner:
                    continue

                # Validate emojis
                player_state = room.game.left if player == "left" else room.game.right
                error = validate_emojis(
                    selected_emojis=selected_emojis,
                    player_hand=player_state.emoji_hand,
                )
                if error:
                    await broadcast_to_room(
                        room_code=room_code,
                        message={"type": "spell_fizzle", "player": player, "reason": error},
                    )
                    continue

                # Get transcription from audio or text
                if "audio" in message:
                    audio_bytes = base64.b64decode(message["audio"])
                    if len(audio_bytes) < 1000:
                        await broadcast_to_room(
                            room_code=room_code,
                            message={"type": "spell_fizzle", "player": player, "reason": "Parle plus fort, sorcier !"},
                        )
                        continue
                    text = await asyncio.to_thread(transcribe, audio_bytes=audio_bytes)
                    await broadcast_to_room(
                        room_code=room_code,
                        message={
                            "type": "transcription",
                            "player": player,
                            "text": text,
                        },
                    )
                    if not text.strip():
                        await broadcast_to_room(
                            room_code=room_code,
                            message={"type": "spell_fizzle", "player": player, "reason": "Le juge n'a rien entendu..."},
                        )
                        continue
                elif "text" in message:
                    text = message["text"]
                    if not text.strip():
                        continue
                    await broadcast_to_room(
                        room_code=room_code,
                        message={
                            "type": "transcription",
                            "player": player,
                            "text": text,
                        },
                    )
                else:
                    continue

                logger.info(f"Spell from {player}: emojis={selected_emojis}, text={text!r}")

                await process_spell(
                    room=room,
                    player=player,
                    selected_emojis=selected_emojis,
                    transcription=text,
                )

            elif msg_type == "explain_spell":
                player = message.get("player", side if side != "both" else "left")
                pending = room.pending_explanations.get(player)
                if pending is None:
                    logger.warning(f"Received explain_spell for {player} but no pending explanation")
                    continue

                # Get explanation from audio or text
                if "audio" in message:
                    audio_bytes = base64.b64decode(message["audio"])
                    explanation_text = await asyncio.to_thread(transcribe, audio_bytes=audio_bytes)
                    await broadcast_to_room(
                        room_code=room_code,
                        message={
                            "type": "transcription",
                            "player": player,
                            "text": explanation_text,
                        },
                    )
                elif "text" in message:
                    explanation_text = message["text"]
                else:
                    explanation_text = ""

                logger.info(f"Explanation from {player}: {explanation_text!r}")

                await process_spell(
                    room=room,
                    player=pending.player,
                    selected_emojis=pending.selected_emojis,
                    transcription=pending.transcription,
                    explanation=explanation_text,
                )

            elif msg_type == "text_spell":
                # Text spell bypass for testing — same as cast_spell but with text
                player = message["player"]
                text = message.get("text", "").strip()
                selected_emojis = message.get("selected_emojis", [])

                if not text or room.game is None or room.game.winner:
                    continue

                player_state = room.game.left if player == "left" else room.game.right
                error = validate_emojis(
                    selected_emojis=selected_emojis,
                    player_hand=player_state.emoji_hand,
                )
                if error:
                    await broadcast_to_room(
                        room_code=room_code,
                        message={"type": "spell_fizzle", "player": player, "reason": error},
                    )
                    continue

                await broadcast_to_room(
                    room_code=room_code,
                    message={
                        "type": "transcription",
                        "player": player,
                        "text": text,
                    },
                )

                await process_spell(
                    room=room,
                    player=player,
                    selected_emojis=selected_emojis,
                    transcription=text,
                )

    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected: room={room_code}, side={side}")
        if side == "both":
            unregister_ws(code=room_code, side="both")
        else:
            unregister_ws(code=room_code, side=side)
            # Notify remaining players
            await broadcast_to_room(
                room_code=room_code,
                message={
                    "type": "player_disconnected",
                    "side": side,
                },
            )
