import logging
import os
import time
from typing import Literal

from dotenv import load_dotenv
from elevenlabs import ElevenLabs
from httpx import ConnectError, RemoteProtocolError
from mistralai import Mistral

load_dotenv()

logger = logging.getLogger(__name__)

_mistral_client: Mistral | None = None
_elevenlabs_client: ElevenLabs | None = None


def _get_mistral_client() -> Mistral:
    global _mistral_client
    if _mistral_client is None:
        _mistral_client = Mistral(api_key=os.environ["MISTRAL_API_KEY"])
    return _mistral_client


def _get_elevenlabs_client() -> ElevenLabs:
    global _elevenlabs_client
    if _elevenlabs_client is None:
        _elevenlabs_client = ElevenLabs(api_key=os.environ["ELEVENLABS_API_KEY"])
    return _elevenlabs_client

VOXTRAL_MODEL = "voxtral-mini-latest"
MAX_RETRIES = 2

STT_PROVIDER: Literal["voxtral", "elevenlabs"] = os.environ.get("STT_PROVIDER", "voxtral")  # type: ignore[assignment]


def _transcribe_voxtral(audio_bytes: bytes, file_name: str) -> str:
    """Transcribe audio bytes using Voxtral. Retries on transient network errors."""
    for attempt in range(MAX_RETRIES + 1):
        try:
            response = _get_mistral_client().audio.transcriptions.complete(
                model=VOXTRAL_MODEL,
                file={
                    "content": audio_bytes,
                    "file_name": file_name,
                },
            )
            return response.text or ""
        except (ConnectError, RemoteProtocolError, ConnectionError) as e:
            if attempt < MAX_RETRIES:
                logger.warning(f"Transcription network error (attempt {attempt + 1}), retrying: {e}")
                time.sleep(0.5)
            else:
                logger.error(f"Transcription failed after {MAX_RETRIES + 1} attempts: {e}")
                return ""
    return ""


def _transcribe_elevenlabs(audio_bytes: bytes, file_name: str) -> str:
    """Transcribe audio bytes using ElevenLabs Scribe v2."""
    response = _get_elevenlabs_client().speech_to_text.convert(
        file=(file_name, audio_bytes),
        model_id="scribe_v2",
    )
    return response.text or ""


def transcribe(audio_bytes: bytes, file_name: str = "recording.webm") -> str:
    """Transcribe audio bytes using the configured STT provider."""
    if STT_PROVIDER == "elevenlabs":
        return _transcribe_elevenlabs(audio_bytes=audio_bytes, file_name=file_name)
    return _transcribe_voxtral(audio_bytes=audio_bytes, file_name=file_name)
