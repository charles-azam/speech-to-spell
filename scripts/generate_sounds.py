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
    {
        "id": "water_splash",
        "prompt": "Large water splash with dripping and wave crash",
        "description": "Water impact — tsunami, rain, aquatic spells",
        "tags": ["water", "splash", "wave", "ocean", "rain", "tsunami"],
    },
    {
        "id": "wind_howl",
        "prompt": "Howling wind with gusts and eerie whistling",
        "description": "Fierce wind — tornado, gust, air spells",
        "tags": ["wind", "gust", "tornado", "air", "howl"],
    },
    {
        "id": "earthquake",
        "prompt": "Deep rumbling earthquake with rocks crumbling",
        "description": "Ground shaking — seismic, rock, tremor spells",
        "tags": ["earthquake", "rock", "ground", "tremor", "seismic"],
    },
    {
        "id": "healing",
        "prompt": "Gentle shimmering chime with warm magical glow sound",
        "description": "Warm restoration — heal, cure, blessing spells",
        "tags": ["heal", "cure", "blessing", "restoration", "light"],
    },
    {
        "id": "poison",
        "prompt": "Bubbling toxic liquid with hissing acid drip",
        "description": "Toxic brew — poison, acid, venom spells",
        "tags": ["poison", "acid", "toxic", "venom", "corrosion"],
    },
    {
        "id": "ghost",
        "prompt": "Eerie ghostly wail fading into silence with reverb",
        "description": "Spectral presence — ghost, spirit, haunt spells",
        "tags": ["ghost", "spirit", "haunt", "ethereal", "undead"],
    },
    {
        "id": "metal_clash",
        "prompt": "Heavy metal sword clash with ringing steel impact",
        "description": "Steel impact — sword, armor, metal spells",
        "tags": ["metal", "sword", "clash", "steel", "blade"],
    },
    {
        "id": "explosion_big",
        "prompt": "Massive bomb explosion with deep bass shockwave",
        "description": "Devastating blast — bomb, nuke, destruction spells",
        "tags": ["bomb", "explosion", "blast", "shockwave", "destruction"],
    },
    {
        "id": "arcane",
        "prompt": "Mystical arcane energy hum with crystalline chime buildup",
        "description": "Pure arcane energy — magic, enchantment, rune spells",
        "tags": ["arcane", "magic", "enchantment", "rune", "mystic"],
    },
    {
        "id": "animal_roar",
        "prompt": "Ferocious animal roar like a lion or dragon growl",
        "description": "Beast roar — summon, animal, dragon spells",
        "tags": ["animal", "roar", "beast", "dragon", "summon"],
    },
    {
        "id": "teleport",
        "prompt": "Quick magical teleport whoosh with spatial distortion",
        "description": "Spatial shift — teleport, blink, warp spells",
        "tags": ["teleport", "warp", "blink", "space", "portal"],
    },
    {
        "id": "freeze",
        "prompt": "Sharp crystallization freeze sound with cracking ice",
        "description": "Instant freeze — ice prison, petrify, stasis spells",
        "tags": ["freeze", "crystal", "stasis", "petrify", "immobilize"],
    },
    {
        "id": "fire_crackle",
        "prompt": "Sustained crackling campfire with embers popping",
        "description": "Burning flames — sustained fire, ember, burn spells",
        "tags": ["fire", "crackle", "ember", "burn", "smolder"],
    },
    {
        "id": "choir",
        "prompt": "Angelic choir singing a powerful sustained note",
        "description": "Heavenly choir — divine, holy, celestial spells",
        "tags": ["choir", "angel", "divine", "holy", "celestial"],
    },
    {
        "id": "swarm",
        "prompt": "Buzzing insect swarm with thousands of tiny wings",
        "description": "Insect swarm — bugs, plague, infestation spells",
        "tags": ["swarm", "insects", "bugs", "plague", "infestation"],
    },
    {
        "id": "laughter",
        "prompt": "Creepy evil laughter echoing in a dark hall",
        "description": "Sinister laughter — curse, madness, trickster spells",
        "tags": ["laughter", "evil", "curse", "madness", "trickster"],
    },
    {
        "id": "cosmic",
        "prompt": "Deep space ambient drone with distant star pulses",
        "description": "Cosmic energy — star, galaxy, void, space spells",
        "tags": ["cosmic", "space", "star", "galaxy", "void"],
    },
    {
        "id": "shield",
        "prompt": "Energy barrier activation with resonant force field hum",
        "description": "Protective barrier — shield, ward, defense spells",
        "tags": ["shield", "barrier", "ward", "defense", "protect"],
    },
    {
        "id": "blood",
        "prompt": "Wet visceral flesh ripping with dripping blood",
        "description": "Blood magic — sacrifice, drain, gore spells",
        "tags": ["blood", "sacrifice", "drain", "flesh", "gore"],
    },
    {
        "id": "time",
        "prompt": "Clock ticking slowing down then reversing with warped echoes",
        "description": "Time manipulation — slow, reverse, chrono spells",
        "tags": ["time", "clock", "chrono", "slow", "reverse"],
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
