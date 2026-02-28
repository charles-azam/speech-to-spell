import os
import io
import asyncio
from mistralai import Mistral

client = Mistral(api_key=os.environ["MISTRAL_API_KEY"])


async def transcribe_audio(audio_bytes: bytes) -> str:
    """Transcribe audio bytes (WAV) using Voxtral Mini via Mistral transcription API."""
    response = await asyncio.to_thread(
        client.audio.transcriptions.complete,
        model="voxtral-mini-latest",
        file={
            "content": io.BytesIO(audio_bytes),
            "file_name": "speech.wav",
        },
    )
    return response.text.strip() if response.text else ""
