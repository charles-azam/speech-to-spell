"""Generate a bank of sound effects using ElevenLabs and save them to sounds_cache/.

Each sound gets:
- {id}.mp3 — the audio file
- {id}.json — metadata (prompt, id, description, tags)

Run: uv run python scripts/generate_sounds.py
"""

import json
import os
from pathlib import Path

from dotenv import load_dotenv
from elevenlabs import ElevenLabs

load_dotenv()

client = ElevenLabs(api_key=os.environ["ELEVENLABS_API_KEY"])

CACHE_DIR = Path(__file__).resolve().parent.parent / "sounds_cache"
CACHE_DIR.mkdir(exist_ok=True)

SOUNDS = [
    {
        "id": "fireball",
        "prompt": "Massive fireball explosion with roaring flames",
        "description": "A fiery explosion — fire, lava, heat spells",
        "tags": ["fire", "explosion", "heat", "lava", "flame"],
    },
    {
        "id": "ice",
        "prompt": "Ice cracking and shattering with cold wind",
        "description": "Ice breaking apart — frost, blizzard, cold spells",
        "tags": ["ice", "frost", "cold", "blizzard", "shatter"],
    },
    {
        "id": "thunder",
        "prompt": "Loud thunder strike with electric crackle",
        "description": "A lightning bolt — electric, storm, shock spells",
        "tags": ["lightning", "thunder", "electric", "storm", "shock"],
    },
    {
        "id": "dark",
        "prompt": "Deep ominous dark magic whoosh with reverb",
        "description": "Dark energy surge — shadow, curse, void spells",
        "tags": ["dark", "shadow", "curse", "void", "ominous", "death"],
    },
    {
        "id": "nature",
        "prompt": "Rustling leaves and vines growing rapidly with earthy rumble",
        "description": "Nature burst — earth, plant, wind, healing spells",
        "tags": ["nature", "earth", "plant", "wind", "healing", "water"],
    },
]


def generate_sound(sound: dict) -> None:
    sound_id = sound["id"]
    mp3_path = CACHE_DIR / f"{sound_id}.mp3"
    meta_path = CACHE_DIR / f"{sound_id}.json"

    if mp3_path.exists():
        print(f"  [{sound_id}] already exists, skipping")
        return

    print(f"  [{sound_id}] generating: {sound['prompt']}")
    result = client.text_to_sound_effects.convert(
        text=sound["prompt"],
        duration_seconds=2.0,
        prompt_influence=0.5,
    )
    audio_bytes = b"".join(result)
    mp3_path.write_bytes(audio_bytes)

    meta = {
        "id": sound_id,
        "prompt": sound["prompt"],
        "description": sound["description"],
        "tags": sound["tags"],
        "audio_file": mp3_path.name,
        "audio_size_bytes": len(audio_bytes),
        "duration_seconds": 2.0,
    }
    meta_path.write_text(json.dumps(meta, indent=2, ensure_ascii=False))

    print(f"  [{sound_id}] saved ({len(audio_bytes)} bytes)")


def main() -> None:
    print(f"Generating {len(SOUNDS)} sound effects into {CACHE_DIR}/")
    for sound in SOUNDS:
        generate_sound(sound=sound)
    print("Done!")


if __name__ == "__main__":
    main()
