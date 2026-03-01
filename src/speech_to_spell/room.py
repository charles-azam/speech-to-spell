import random
import string
import time

from fastapi import WebSocket
from pydantic import BaseModel

from speech_to_spell.game import GameState


class PendingExplanation(BaseModel):
    """Stored context when judge asks for EXPLAIN."""

    player: str
    selected_emojis: list[str]
    transcription: str


class PlayerInfo(BaseModel):
    wizard_name: str
    side: str  # "left" or "right"


class Room(BaseModel):
    model_config = {"arbitrary_types_allowed": True}

    code: str
    players: dict[str, PlayerInfo]  # side -> PlayerInfo
    game: GameState | None = None
    pending_explanations: dict[str, PendingExplanation] = {}
    created_at: float
    lang: str = "en"  # "fr" or "en"


# Module-level state
_rooms: dict[str, Room] = {}
_room_websockets: dict[str, dict[str, WebSocket]] = {}  # code -> side -> WSocket


def generate_room_code() -> str:
    """Generate a unique 4-letter uppercase room code."""
    while True:
        code = "".join(random.choices(string.ascii_uppercase, k=4))
        if code not in _rooms:
            return code


def create_room(wizard_name: str, lang: str = "en") -> Room:
    """Create a new room. Creator gets 'left' side."""
    code = generate_room_code()
    room = Room(
        code=code,
        players={"left": PlayerInfo(wizard_name=wizard_name, side="left")},
        created_at=time.time(),
        lang=lang if lang in ("fr", "en") else "en",
    )
    _rooms[code] = room
    _room_websockets[code] = {}
    return room


def join_room(code: str, wizard_name: str) -> tuple[Room, str]:
    """Join an existing room. Joiner gets 'right' side.
    Returns (room, side). Raises ValueError if room not found or full.
    """
    room = _rooms.get(code)
    if room is None:
        raise ValueError(f"Room {code} not found")
    if "right" in room.players:
        raise ValueError(f"Room {code} is full")
    room.players["right"] = PlayerInfo(wizard_name=wizard_name, side="right")
    return room, "right"


def fill_both_sides(code: str, wizard_name: str) -> Room:
    """Fill both sides for same-computer mode. Returns the room."""
    room = _rooms.get(code)
    if room is None:
        raise ValueError(f"Room {code} not found")
    room.players["right"] = PlayerInfo(wizard_name=f"{wizard_name} 2", side="right")
    return room


def get_room(code: str) -> Room | None:
    return _rooms.get(code)


def register_ws(code: str, side: str, ws: WebSocket) -> None:
    if code not in _room_websockets:
        _room_websockets[code] = {}
    _room_websockets[code][side] = ws


def unregister_ws(code: str, side: str) -> None:
    if code in _room_websockets:
        _room_websockets[code].pop(side, None)


def get_room_websockets(code: str) -> dict[str, WebSocket]:
    return _room_websockets.get(code, {})


def cleanup_stale_rooms(max_age_s: float = 3600.0) -> int:
    """Delete rooms older than max_age_s. Returns count of removed rooms."""
    now = time.time()
    stale_codes = [
        code for code, room in _rooms.items() if now - room.created_at > max_age_s
    ]
    for code in stale_codes:
        _rooms.pop(code, None)
        _room_websockets.pop(code, None)
    return len(stale_codes)
