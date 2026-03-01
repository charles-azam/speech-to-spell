import logging
import os

from dotenv import load_dotenv
from elevenlabs import ElevenLabs

load_dotenv()

logger = logging.getLogger(__name__)

_elevenlabs_client: ElevenLabs | None = None

JUDGE_VOICE_ID = os.environ.get("JUDGE_VOICE_ID", "Cvv0EXhC1Zv7b4a2QfWl")


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
    """Convert text to speech using ElevenLabs TTS. Returns MP3 bytes."""
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
    return b"".join(audio_chunks)
