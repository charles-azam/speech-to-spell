import os

from dotenv import load_dotenv
from mistralai import Mistral

load_dotenv()

_client = Mistral(api_key=os.environ["MISTRAL_API_KEY"])

VOXTRAL_MODEL = "voxtral-mini-latest"


def transcribe(audio_bytes: bytes, file_name: str = "recording.webm") -> str:
    """Transcribe audio bytes using Voxtral. Returns the transcription text."""
    response = _client.audio.transcriptions.complete(
        model=VOXTRAL_MODEL,
        file={
            "content": audio_bytes,
            "file_name": file_name,
        },
    )
    return response.text or ""
