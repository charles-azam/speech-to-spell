import hashlib
import json
import logging
import os
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv
from elevenlabs import ElevenLabs

load_dotenv()

logger = logging.getLogger(__name__)

_client = ElevenLabs(api_key=os.environ["ELEVENLABS_API_KEY"])

CACHE_DIR = Path(__file__).resolve().parent.parent.parent / "sounds_cache"
CACHE_DIR.mkdir(exist_ok=True)


def _cache_key(prompt: str) -> str:
    return hashlib.sha256(prompt.lower().strip().encode()).hexdigest()[:16]


def generate_sound_effect(
    prompt: str,
    metadata: dict | None = None,
) -> bytes:
    """Generate a sound effect from a text prompt. Uses disk cache to avoid repeated API calls.
    Saves a .json metadata file alongside each sound for future RAG."""
    key = _cache_key(prompt=prompt)
    cache_path = CACHE_DIR / f"{key}.mp3"
    meta_path = CACHE_DIR / f"{key}.json"

    if cache_path.exists():
        logger.info(f"Sound cache hit: '{prompt}' → {cache_path.name}")
        return cache_path.read_bytes()

    logger.info(f"Sound cache miss: '{prompt}', calling ElevenLabs API")
    result = _client.text_to_sound_effects.convert(
        text=prompt,
        duration_seconds=2.0,
        prompt_influence=0.5,
    )

    # result is a generator of bytes chunks
    audio_bytes = b"".join(result)

    cache_path.write_bytes(audio_bytes)

    # Save metadata for RAG
    meta = {
        "prompt": prompt,
        "cache_key": key,
        "audio_file": cache_path.name,
        "audio_size_bytes": len(audio_bytes),
        "duration_seconds": 2.0,
        "created_at": datetime.now(tz=timezone.utc).isoformat(),
        **(metadata or {}),
    }
    meta_path.write_text(json.dumps(meta, indent=2, ensure_ascii=False))

    logger.info(f"Sound cached: {cache_path.name} ({len(audio_bytes)} bytes) + metadata")

    return audio_bytes
