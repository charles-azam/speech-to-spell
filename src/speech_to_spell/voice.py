import logging
import os
import time

from dotenv import load_dotenv
from httpx import ConnectError, RemoteProtocolError
from mistralai import Mistral

load_dotenv()

logger = logging.getLogger(__name__)

_client = Mistral(api_key=os.environ["MISTRAL_API_KEY"])

VOXTRAL_MODEL = "voxtral-mini-latest"

MAX_RETRIES = 2


def transcribe(audio_bytes: bytes, file_name: str = "recording.webm") -> str:
    """Transcribe audio bytes using Voxtral. Retries once on transient network errors."""
    for attempt in range(MAX_RETRIES + 1):
        try:
            response = _client.audio.transcriptions.complete(
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
