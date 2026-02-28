import os
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '..', '.env'))

import json
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from app.voice import transcribe_audio
from app.spell import interpret_spell
from app.game import (
    create_game, join_game, apply_spell, get_game,
    game_state_dict, room_connections, games,
)

app = FastAPI(title="Speech to Spell")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"status": "ok"}


async def broadcast(room_code: str, message: dict):
    """Send a JSON message to all connected players in a room."""
    conns = room_connections.get(room_code, [])
    data = json.dumps(message)
    for ws in conns:
        if ws is not None:
            try:
                await ws.send_text(data)
            except Exception:
                pass


async def send_json(ws: WebSocket, message: dict):
    await ws.send_text(json.dumps(message))


@app.websocket("/ws/{room_code}")
async def websocket_endpoint(ws: WebSocket, room_code: str):
    await ws.accept()

    player_index: int | None = None
    actual_room: str | None = None

    try:
        while True:
            message = await ws.receive()

            if "text" in message:
                data = json.loads(message["text"])
                msg_type = data.get("type")

                if msg_type == "create_game":
                    game = create_game(data["player_name"])
                    actual_room = game.room_code
                    player_index = 0
                    room_connections[actual_room][0] = ws
                    await send_json(ws, {
                        "type": "game_created",
                        "room_code": game.room_code,
                        "game_state": game_state_dict(game),
                    })

                elif msg_type == "join_game":
                    code = data["room_code"].upper()
                    result = join_game(code, data["player_name"])
                    if isinstance(result, str):
                        await send_json(ws, {"type": "error", "message": result})
                    else:
                        actual_room = code
                        player_index = 1
                        room_connections[code][1] = ws
                        await broadcast(code, {
                            "type": "player_joined",
                            "game_state": game_state_dict(result),
                        })

            elif "bytes" in message:
                audio_bytes = message["bytes"]

                if actual_room is None or player_index is None:
                    await send_json(ws, {"type": "error", "message": "Not in a game"})
                    continue

                game = get_game(actual_room)
                if game is None:
                    await send_json(ws, {"type": "error", "message": "Game not found"})
                    continue

                if game.phase != "playing":
                    await send_json(ws, {"type": "error", "message": "Game is not active"})
                    continue

                if game.current_turn != player_index:
                    await send_json(ws, {"type": "error", "message": "Not your turn"})
                    continue

                # Notify both players that we're processing
                await broadcast(actual_room, {
                    "type": "processing",
                    "player": game.players[player_index].name,
                })

                # Transcribe audio
                try:
                    transcription = await transcribe_audio(audio_bytes)
                except Exception as e:
                    print(f"Transcription error: {e}")
                    await send_json(ws, {"type": "error", "message": "Transcription failed"})
                    continue

                # Notify transcription result
                await broadcast(actual_room, {
                    "type": "transcription",
                    "text": transcription,
                    "player": game.players[player_index].name,
                })

                # Interpret spell
                spell = await interpret_spell(transcription, game.spell_history)

                # Apply spell to game
                game = apply_spell(game, player_index, spell)

                # Broadcast full result
                await broadcast(actual_room, {
                    "type": "spell_cast",
                    "transcription": transcription,
                    "spell": spell.model_dump(),
                    "game_state": game_state_dict(game),
                })

                # Check game over
                if game.phase == "finished":
                    await broadcast(actual_room, {
                        "type": "game_over",
                        "winner": game.winner,
                        "game_state": game_state_dict(game),
                    })

    except WebSocketDisconnect:
        if actual_room and player_index is not None:
            conns = room_connections.get(actual_room, [])
            if player_index < len(conns):
                conns[player_index] = None
            # Notify other player
            await broadcast(actual_room, {
                "type": "player_disconnected",
                "player_index": player_index,
            })
