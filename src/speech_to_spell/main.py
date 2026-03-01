import asyncio
import base64
import json
import logging
import os
import time

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
    append_event,
    cleanup_stale_rooms,
    create_room,
    fill_both_sides,
    get_room,
    get_room_websockets,
    join_room,
    register_ws,
    unregister_ws,
)
from speech_to_spell.commentator import generate_commentary, generate_idle_commentary
from speech_to_spell.sound import load_sound
from speech_to_spell.spell import JudgeVerdict, infer_emojis, interpret_spell
from speech_to_spell.tts import text_to_speech
from speech_to_spell.voice import transcribe

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

ENABLE_SOUND_EFFECTS = True

COMMENTATOR_MALE_VOICE_ID = os.environ.get("COMMENTATOR_MALE_VOICE_ID", "TX3LPaxmHKxFdv7VOQHJ")
COMMENTATOR_FEMALE_VOICE_ID = os.environ.get("COMMENTATOR_FEMALE_VOICE_ID", "XB0fDUnXU5powFXDhCwa")


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
    lang: str = "en"  # "fr" or "en"
    wizard_name_right: str | None = None


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
    room = create_room(wizard_name=body.wizard_name, lang=body.lang)

    if body.mode == "same_computer":
        right_name = body.wizard_name_right or f"{body.wizard_name} 2"
        fill_both_sides(code=room.code, left_name=body.wizard_name, right_name=right_name)
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
                    "wizard_name": room.players["left"].wizard_name if "left" in room.players else "",
                },
                "right": {
                    "health": game.right.health,
                    "emoji_hand": game.right.emoji_hand,
                    "spells_cast": game.right.spells_cast,
                    "wizard_name": room.players["right"].wizard_name if "right" in room.players else "",
                },
                "turn_number": game.turn_number,
                "winner": game.winner,
            }
        else:
            # Remote player: hide opponent's hand
            opponent = "right" if side == "left" else "left"
            own_state = game.left if side == "left" else game.right
            opp_state = game.left if opponent == "left" else game.right
            own_side_key = "left" if side == "left" else "right"
            msg = {
                "type": "game_state",
                own_side_key: {
                    "health": own_state.health,
                    "emoji_hand": own_state.emoji_hand,
                    "spells_cast": own_state.spells_cast,
                    "wizard_name": room.players[side].wizard_name if side in room.players else "",
                },
                opponent: {
                    "health": opp_state.health,
                    "emoji_hand": [],  # Hidden
                    "spells_cast": opp_state.spells_cast,
                    "wizard_name": room.players[opponent].wizard_name if opponent in room.players else "",
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
    # Estimate judge voice duration: ~0.08s per character + 1s buffer
    estimated_duration = len(comment) * 0.08 + 1.0
    room = get_room(code=room_code)
    if room is not None:
        room.judge_busy_until = time.time() + estimated_duration
    await broadcast_to_room(
        room_code=room_code,
        message={
            "type": "judge_voice",
            "audio": base64.b64encode(audio_bytes).decode(),
        },
    )


# --- Commentary system ---

# Track idle commentary tasks per room so we can cancel them
_commentary_tasks: dict[str, asyncio.Task] = {}  # room_code → background idle loop task

IDLE_COMMENTARY_INTERVAL_S = 20  # how often idle commentary fires
IDLE_THRESHOLD_S = 12  # seconds of silence before commentators fill the gap


async def _broadcast_commentary_lines(room: Room, lines: list) -> None:
    """Broadcast commentary lines as TTS audio, sequentially."""
    for line in lines:
        # Wait for judge to finish before speaking
        now = time.time()
        wait = room.judge_busy_until - now
        if wait > 0:
            await asyncio.sleep(wait)
        voice_id = COMMENTATOR_MALE_VOICE_ID if line.speaker == "marc" else COMMENTATOR_FEMALE_VOICE_ID
        audio = await asyncio.to_thread(text_to_speech, text=line.text, voice_id=voice_id)
        await broadcast_to_room(
            room_code=room.code,
            message={
                "type": "commentator_voice",
                "speaker": line.speaker,
                "audio": base64.b64encode(audio).decode(),
            },
        )


async def run_commentary(room: Room) -> None:
    """Fire-and-forget: wait for judge voice to finish, then generate and broadcast commentary."""
    # Wait for judge voice to finish
    now = time.time()
    wait = room.judge_busy_until - now
    if wait > 0:
        await asyncio.sleep(wait)

    # Guard: game over or room gone
    if room.game is None or room.game.winner:
        return
    events = room.event_log[-5:]
    if not events:
        return
    left_name = room.players["left"].wizard_name
    right_name = room.players["right"].wizard_name
    lines = await asyncio.to_thread(
        generate_commentary,
        events=events,
        left_name=left_name,
        right_name=right_name,
        lang=room.lang,
    )
    await _broadcast_commentary_lines(room=room, lines=lines)


async def idle_commentary_loop(room: Room) -> None:
    """Background loop: periodically fill silence with commentator chatter."""
    # Give the game a moment to get going
    await asyncio.sleep(IDLE_COMMENTARY_INTERVAL_S)

    while True:
        # Check if game is still active
        if room.game is None or room.game.winner:
            break
        if get_room(code=room.code) is None:
            break

        now = time.time()
        idle_for = now - room.last_spell_at if room.last_spell_at > 0 else now - room.created_at

        if idle_for >= IDLE_THRESHOLD_S:
            # Wait for judge to finish
            wait = room.judge_busy_until - now
            if wait > 0:
                await asyncio.sleep(wait)

            if "left" not in room.players or "right" not in room.players:
                break

            left_name = room.players["left"].wizard_name
            right_name = room.players["right"].wizard_name
            lines = await asyncio.to_thread(
                generate_idle_commentary,
                events=room.event_log[-3:],
                left_name=left_name,
                right_name=right_name,
                idle_seconds=int(idle_for),
                lang=room.lang,
            )
            await _broadcast_commentary_lines(room=room, lines=lines)

        await asyncio.sleep(IDLE_COMMENTARY_INTERVAL_S)

    # Clean up
    _commentary_tasks.pop(room.code, None)


def start_idle_commentary(room: Room) -> None:
    """Start the idle commentary loop for a room if not already running."""
    if room.code in _commentary_tasks:
        task = _commentary_tasks[room.code]
        if not task.done():
            return
    _commentary_tasks[room.code] = asyncio.create_task(idle_commentary_loop(room=room))


# --- Game logic ---


async def broadcast_emoji_inference(room_code: str, player: str, inferred_emojis: list[str]) -> None:
    """Send inferred emojis to all clients in the room."""
    await broadcast_to_room(
        room_code=room_code,
        message={
            "type": "emoji_inference",
            "player": player,
            "inferred_emojis": inferred_emojis,
        },
    )


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

    room.last_spell_at = time.time()

    opponent_side = "right" if player == "left" else "left"
    caster_name = room.players[player].wizard_name
    opponent_name = room.players[opponent_side].wizard_name

    context = format_game_context(
        game=game,
        caster=player,
        caster_name=caster_name,
        opponent_name=opponent_name,
    )

    verdict = await asyncio.to_thread(
        interpret_spell,
        selected_emojis=selected_emojis,
        transcription=transcription,
        game_context=context,
        explanation=explanation,
        lang=room.lang,
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
        wizard_name = room.players[player].wizard_name
        emoji_str = " ".join(selected_emojis)
        append_event(
            code=room.code,
            event=f"{wizard_name} confused the judge with '{emoji_str}'. Judge: '{verdict.comment}'",
        )
        # Still broadcast judge voice for EXPLAIN verdicts
        await broadcast_judge_voice(room_code=room.code, comment=verdict.comment)
        return

    wizard_name = room.players[player].wizard_name
    emoji_str = " ".join(selected_emojis)

    if verdict.verdict == "YES":
        target_name = room.players[target_side].wizard_name
        append_event(
            code=room.code,
            event=f"{wizard_name} cast '{verdict.spell_name}' ({emoji_str}) → {verdict.damage} dmg to {target_name}. Judge: '{verdict.comment}'",
        )

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
        # NO verdict
        append_event(
            code=room.code,
            event=f"{wizard_name} tried '{emoji_str}' → REJECTED. Judge: '{verdict.comment}'",
        )
        await broadcast_judge_voice(room_code=room.code, comment=verdict.comment)

    # Consume emojis regardless of verdict (YES, NO, or EXPLAIN->final)
    room.game = consume_and_refill(game=room.game, player=player, used_emojis=selected_emojis)

    # Send updated game state
    await broadcast_game_state(room=room)

    # Fire-and-forget commentary (runs after a delay to let judge voice finish)
    asyncio.create_task(run_commentary(room=room))

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
        start_idle_commentary(room=room)

    try:
        while True:
            raw = await websocket.receive_text()
            message = json.loads(raw)
            msg_type = message["type"]

            if msg_type == "cast_spell":
                player = message["player"]

                if room.game is None or room.game.winner:
                    continue

                player_state = room.game.left if player == "left" else room.game.right

                # Get transcription from audio or text
                if "audio" in message:
                    audio_bytes = base64.b64decode(message["audio"])
                    if len(audio_bytes) < 1000:
                        reason = "Speak louder, wizard!" if room.lang == "en" else "Parle plus fort, sorcier !"
                        await broadcast_to_room(
                            room_code=room_code,
                            message={"type": "spell_fizzle", "player": player, "reason": reason},
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
                        reason = "The judge heard nothing..." if room.lang == "en" else "Le juge n'a rien entendu..."
                        await broadcast_to_room(
                            room_code=room_code,
                            message={"type": "spell_fizzle", "player": player, "reason": reason},
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

                # Infer emojis from hand based on transcription
                selected_emojis = await asyncio.to_thread(
                    infer_emojis,
                    hand=player_state.emoji_hand,
                    transcription=text,
                    lang=room.lang,
                )
                await broadcast_emoji_inference(
                    room_code=room_code,
                    player=player,
                    inferred_emojis=selected_emojis,
                )

                logger.info(f"Spell from {player}: inferred_emojis={selected_emojis}, text={text!r}")

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
                # Text spell — infer emojis from text
                player = message["player"]
                text = message.get("text", "").strip()

                if not text or room.game is None or room.game.winner:
                    continue

                player_state = room.game.left if player == "left" else room.game.right

                await broadcast_to_room(
                    room_code=room_code,
                    message={
                        "type": "transcription",
                        "player": player,
                        "text": text,
                    },
                )

                # Infer emojis from hand based on text
                selected_emojis = await asyncio.to_thread(
                    infer_emojis,
                    hand=player_state.emoji_hand,
                    transcription=text,
                    lang=room.lang,
                )
                await broadcast_emoji_inference(
                    room_code=room_code,
                    player=player,
                    inferred_emojis=selected_emojis,
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
