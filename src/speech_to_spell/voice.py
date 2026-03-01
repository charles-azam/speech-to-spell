import io
import logging
import os
import time
from typing import Literal

from dotenv import load_dotenv
from elevenlabs import ElevenLabs
from httpx import ConnectError, RemoteProtocolError
from mistralai import Mistral
from openai import OpenAI

load_dotenv()

logger = logging.getLogger(__name__)

_mistral_client: Mistral | None = None
_elevenlabs_client: ElevenLabs | None = None
_local_audio_client: OpenAI | None = None


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
# Model ID for local vLLM Voxtral (must match the model served in docker-compose)
LOCAL_VOXTRAL_MODEL = "mistralai/Voxtral-Mini-3B-2507"
MAX_RETRIES = 2

STT_PROVIDER: Literal["voxtral", "elevenlabs"] = os.environ.get("STT_PROVIDER", "voxtral")  # type: ignore[assignment]


def _get_local_audio_client() -> OpenAI:
    """OpenAI-compatible client for local vLLM (Voxtral). Used when MISTRAL_AUDIO_BASE_URL is set."""
    global _local_audio_client
    if _local_audio_client is None:
        base_url = os.environ["MISTRAL_AUDIO_BASE_URL"].rstrip("/")
        if not base_url.endswith("/v1"):
            base_url = f"{base_url}/v1"
        _local_audio_client = OpenAI(
            base_url=base_url,
            api_key=os.environ.get("MISTRAL_API_KEY", "dummy"),
        )
    return _local_audio_client


def _transcribe_local_voxtral(audio_bytes: bytes, file_name: str) -> str:
    """Transcribe using local vLLM Voxtral (OpenAI-compatible /v1/audio/transcriptions)."""
    try:
        # OpenAI client expects a file-like; use BytesIO with name for content-type
        file_like = io.BytesIO(audio_bytes)
        file_like.name = file_name
        response = _get_local_audio_client().audio.transcriptions.create(
            model=LOCAL_VOXTRAL_MODEL,
            file=file_like,
        )
        return response.text or ""
    except (ConnectError, RemoteProtocolError, ConnectionError) as e:
        logger.error(f"Local Voxtral transcription failed: {e}")
        return ""


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
    # Local vLLM Voxtral (opt-in): when MISTRAL_AUDIO_BASE_URL is set, use it
    if os.environ.get("MISTRAL_AUDIO_BASE_URL"):
        return _transcribe_local_voxtral(audio_bytes=audio_bytes, file_name=file_name)
    if STT_PROVIDER == "elevenlabs":
        return _transcribe_elevenlabs(audio_bytes=audio_bytes, file_name=file_name)
    return _transcribe_voxtral(audio_bytes=audio_bytes, file_name=file_name)
