import hashlib
import logging
import os

from dotenv import load_dotenv
from elevenlabs import ElevenLabs

load_dotenv()

logger = logging.getLogger(__name__)

_elevenlabs_client: ElevenLabs | None = None

JUDGE_VOICE_ID = os.environ.get("JUDGE_VOICE_ID", "Cvv0EXhC1Zv7b4a2QfWl")

# In-memory TTS cache: hash(text + voice_id) → audio bytes
_tts_cache: dict[str, bytes] = {}
_TTS_CACHE_MAX_SIZE = 500


def _cache_key(text: str, voice_id: str) -> str:
    return hashlib.md5(f"{voice_id}:{text}".encode()).hexdigest()


def _get_elevenlabs_client() -> ElevenLabs:
    global _elevenlabs_client
    if _elevenlabs_client is None:
        _elevenlabs_client = ElevenLabs(api_key=os.environ["ELEVENLABS_API_KEY"])
    return _elevenlabs_client


def text_to_speech(
    text: str,
    voice_id: str = JUDGE_VOICE_ID,
    model_id: str = "eleven_multilingual_v2",
) -> bytes:
    """Convert text to speech using ElevenLabs TTS. Returns MP3 bytes. Cached."""
    key = _cache_key(text=text, voice_id=voice_id)
    cached = _tts_cache.get(key)
    if cached is not None:
        logger.info(f"TTS cache hit: {text[:40]!r}")
        return cached

    client = _get_elevenlabs_client()
    response = client.text_to_speech.convert(
        text=text,
        voice_id=voice_id,
        model_id=model_id,
    )
    # response is a generator of bytes chunks
    audio_chunks: list[bytes] = []
    for chunk in response:
        audio_chunks.append(chunk)
    audio = b"".join(audio_chunks)

    # Evict oldest entries if cache is full
    if len(_tts_cache) >= _TTS_CACHE_MAX_SIZE:
        oldest_key = next(iter(_tts_cache))
        del _tts_cache[oldest_key]
    _tts_cache[key] = audio

    return audio
