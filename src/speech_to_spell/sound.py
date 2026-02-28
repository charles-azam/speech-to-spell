import json
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

CACHE_DIR = Path(__file__).resolve().parent.parent.parent / "sounds_cache"

# Available sound IDs — must match what scripts/generate_sounds.py produces
SOUND_IDS = [
    "fireball", "ice", "thunder", "dark", "nature",
    "water_splash", "wind_howl", "earthquake", "healing", "poison",
    "ghost", "metal_clash", "explosion_big", "arcane", "animal_roar",
    "teleport", "freeze", "fire_crackle", "choir", "swarm",
    "laughter", "cosmic", "shield", "blood", "time",
]


def load_sound(sound_id: str) -> bytes | None:
    """Load a pre-generated sound effect by ID. Returns None if not found."""
    if sound_id not in SOUND_IDS:
        logger.warning(f"Unknown sound ID: {sound_id}")
        return None

    mp3_path = CACHE_DIR / f"{sound_id}.mp3"
    if not mp3_path.exists():
        logger.warning(f"Sound file missing: {mp3_path}")
        return None

    return mp3_path.read_bytes()


def get_sound_descriptions() -> str:
    """Build a description string of available sounds for the LLM prompt."""
    lines = []
    for sound_id in SOUND_IDS:
        meta_path = CACHE_DIR / f"{sound_id}.json"
        if meta_path.exists():
            meta = json.loads(meta_path.read_text())
            lines.append(f'- "{sound_id}": {meta["description"]}')
        else:
            lines.append(f'- "{sound_id}"')
    return "\n".join(lines)
