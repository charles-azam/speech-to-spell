import json
import logging
import os

from dotenv import load_dotenv
from mistralai import Mistral
from pydantic import BaseModel

from speech_to_spell.sound import SOUND_IDS, get_sound_descriptions

load_dotenv()

logger = logging.getLogger(__name__)

_client = Mistral(api_key=os.environ["MISTRAL_API_KEY"])

MINISTRAL_MODEL = "ministral-8b-latest"

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "name_spell",
            "description": "Give the spell a dramatic name based on what the wizard said.",
            "parameters": {
                "type": "object",
                "properties": {
                    "name": {
                        "type": "string",
                        "description": "The name of the spell, short and dramatic. E.g. 'Infernal Blaze', 'Frozen Hurricane', 'Rain of Cats'.",
                    },
                },
                "required": ["name"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "change_color",
            "description": "Change the color of the opponent's panel to reflect the spell's nature. Use any valid CSS color.",
            "parameters": {
                "type": "object",
                "properties": {
                    "color": {
                        "type": "string",
                        "description": "A CSS color value that matches the spell's element/mood. E.g. '#ff4500' for fire, '#00bfff' for ice, '#7cfc00' for nature, '#8b00ff' for dark magic.",
                    },
                },
                "required": ["color"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "evaluate_spell",
            "description": "Judge the spell's power and mana cost. More creative/original spells deal more damage and cost less mana. Boring or repeated spells are weak and expensive.",
            "parameters": {
                "type": "object",
                "properties": {
                    "damage": {
                        "type": "integer",
                        "description": "Damage dealt to the opponent (1-50). Weak/boring spells: 1-10. Average: 10-25. Creative/powerful: 25-40. Exceptional: 40-50.",
                    },
                    "mana_cost": {
                        "type": "integer",
                        "description": "Mana consumed by the caster (5-40). Creative spells are efficient (5-15). Generic spells cost more (20-40). Spam costs maximum mana.",
                    },
                },
                "required": ["damage", "mana_cost"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "pick_sound",
            "description": "Pick the most fitting sound effect for this spell from the available bank.",
            "parameters": {
                "type": "object",
                "properties": {
                    "sound_id": {
                        "type": "string",
                        "enum": SOUND_IDS,
                        "description": "The ID of the sound effect to play.",
                    },
                },
                "required": ["sound_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "pick_emojis",
            "description": "Pick 1-3 emojis that represent this spell for a particle burst effect. E.g. 🔥 for fire, ❄️ for ice, 🐱 for cats, 💔 for emotional damage, 💀 for death, ⚡ for lightning, 🌊 for water, 🌿 for nature, 🎆 for explosions.",
            "parameters": {
                "type": "object",
                "properties": {
                    "emojis": {
                        "type": "array",
                        "items": {"type": "string"},
                        "minItems": 1,
                        "maxItems": 3,
                        "description": "1 to 3 emoji characters that visually represent the spell.",
                    },
                },
                "required": ["emojis"],
            },
        },
    },
]

_sound_descriptions = get_sound_descriptions()

SYSTEM_PROMPT = f"""You are the judge of a wizard duel game. A wizard just cast a spell by speaking out loud.
You will receive the transcription of what they said and the current game state.

You have 5 tools available. Call only the ones that are relevant — not every spell needs all tools:
- `name_spell` — give the spell a dramatic, fun name. Call this for every real spell.
- `change_color` — set a CSS color matching the spell's element/mood. Call this for every real spell.
- `evaluate_spell` — judge the damage and mana cost. Call this for every real spell.
- `pick_sound` — pick a sound effect from the available bank. Call this for every real spell.
- `pick_emojis` — pick 1-3 emojis for a particle burst on screen. Call this for every real spell.

Available sounds:
{_sound_descriptions}

If the wizard said something that isn't really a spell (gibberish, silence, just talking), you can call fewer tools or skip some.

Balance rules:
- Originality is rewarded: creative spells deal more damage and cost less mana
- Repetition is penalized: if a wizard keeps casting similar spells, reduce damage and increase mana cost
- Overpowered spam is punished: saying "I destroy everything" should cost tons of mana and deal little damage
- Funny/weird spells get a bonus: "emotional damage" or "rain of cats" should be surprisingly effective
- Consider the game state: if a wizard is low on mana, they can still cast weak spells
"""


class SpellResult(BaseModel):
    spell_name: str | None = None
    color: str | None = None
    damage: int = 0
    mana_cost: int = 0
    sound_id: str | None = None
    emojis: list[str] = []


def interpret_spell(transcription: str, game_context: str = "") -> SpellResult:
    """Send transcription to Ministral, parse tool calls, return spell result."""
    user_content = f'The wizard shouted: "{transcription}"'
    if game_context:
        user_content += f"\n\nCurrent game state:\n{game_context}"

    response = _client.chat.complete(
        model=MINISTRAL_MODEL,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_content},
        ],
        tools=TOOLS,
        tool_choice="any",
    )

    result = SpellResult()
    tool_calls = response.choices[0].message.tool_calls or []

    for tool_call in tool_calls:
        args = json.loads(tool_call.function.arguments)
        logger.info(f"Tool call: {tool_call.function.name}({args})")

        if tool_call.function.name == "name_spell":
            result.spell_name = args["name"]
        elif tool_call.function.name == "change_color":
            result.color = args["color"]
        elif tool_call.function.name == "evaluate_spell":
            result.damage = max(0, min(50, args.get("damage", 0)))
            result.mana_cost = max(0, min(40, args.get("mana_cost", 0)))
        elif tool_call.function.name == "pick_sound":
            sound_id = args.get("sound_id")
            if sound_id in SOUND_IDS:
                result.sound_id = sound_id
        elif tool_call.function.name == "pick_emojis":
            emojis = args.get("emojis", [])
            result.emojis = emojis[:3]

    return result
