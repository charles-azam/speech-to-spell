import json
import logging
import os

from dotenv import load_dotenv
from mistralai import Mistral
from openai import OpenAI
from pydantic import BaseModel

from speech_to_spell.sound import SOUND_IDS, get_sound_descriptions

load_dotenv()

logger = logging.getLogger(__name__)

# --- Model switching via env var ---
SPELL_MODEL = os.environ.get("SPELL_MODEL", "gpt-oss")

# Mistral client (always initialized — used for Ministral fallback and other features)
_mistral_client = Mistral(api_key=os.environ["MISTRAL_API_KEY"])
MINISTRAL_MODEL = "ministral-8b-latest"

# HuggingFace/OpenAI-compatible client for GPT-OSS 120B via Cerebras
_hf_client = OpenAI(
    base_url="https://router.huggingface.co/v1",
    api_key=os.environ.get("HUGGINGFACE_API_KEY", ""),
)
GPT_OSS_MODEL = "openai/gpt-oss-120b:cerebras"

# --- Single tool definition ---

VALID_TEMPLATES = {
    "explosion", "swirl", "rain", "wave_left", "wave_right",
    "shatter", "pulse", "spiral", "rise",
}

CAST_SPELL_TOOL = {
    "type": "function",
    "function": {
        "name": "cast_spell",
        "description": "Judge the spell and produce all effects in a single call.",
        "parameters": {
            "type": "object",
            "properties": {
                "spell_name": {
                    "type": "string",
                    "description": "Dramatic spell name. E.g. 'Infernal Blaze', 'Rain of Cats'.",
                },
                "damage": {
                    "type": "integer",
                    "description": "Damage dealt (1-50). Creative=high, boring=low.",
                },
                "mana_cost": {
                    "type": "integer",
                    "description": "Mana cost (5-40). Creative=cheap, spam=expensive.",
                },
                "sound_id": {
                    "type": "string",
                    "enum": SOUND_IDS,
                    "description": "Sound effect to play.",
                },
                "emojis": {
                    "type": "array",
                    "items": {"type": "string"},
                    "minItems": 1,
                    "maxItems": 3,
                    "description": "1-3 emojis for the particle burst.",
                },
                "template": {
                    "type": "string",
                    "enum": sorted(VALID_TEMPLATES),
                    "description": "Animation pattern for the emoji particles.",
                },
                "primary_color": {
                    "type": "string",
                    "description": "Main CSS color (e.g. '#ff4500').",
                },
                "secondary_color": {
                    "type": "string",
                    "description": "Accent CSS color (e.g. '#ff8c00').",
                },
            },
            "required": [
                "spell_name", "damage", "mana_cost", "sound_id",
                "emojis", "template", "primary_color", "secondary_color",
            ],
        },
    },
}

TOOLS = [CAST_SPELL_TOOL]

_sound_descriptions = get_sound_descriptions()

SYSTEM_PROMPT = f"""You are the judge of a wizard duel game. A wizard just cast a spell by speaking out loud.
You will receive the transcription of what they said and the current game state.

You MUST call the `cast_spell` tool exactly once with your judgment.

Available sounds:
{_sound_descriptions}

Animation templates:
- explosion: particles burst outward from center (fire, bombs, impacts)
- swirl: particles orbit around center (wind, vortex, magic)
- rain: particles fall from top (rain, snow, debris)
- wave_left: sweep left to right (push, blast, charge)
- wave_right: sweep right to left (push, blast, charge)
- shatter: pieces fly apart from center (breaking, destruction)
- pulse: central glow throbs (healing, aura, power-up)
- spiral: particles follow spiral paths outward (cosmic, mystic)
- rise: particles float upward (fire, spirits, levitation)

Balance rules:
- Originality is rewarded: creative spells deal more damage and cost less mana
- Repetition is penalized: if a wizard keeps casting similar spells, reduce damage and increase mana cost
- Overpowered spam is punished: saying "I destroy everything" should cost tons of mana and deal little damage
- Funny/weird spells get a bonus: "emotional damage" or "rain of cats" should be surprisingly effective
- Consider the game state: if a wizard is low on mana, they can still cast weak spells
- Pick emojis that match the spell's theme (e.g. fire=🔥, ice=❄️, cats=🐱)
"""


class VisualEffect(BaseModel):
    template: str = "explosion"
    primary_color: str = "#ff4500"
    secondary_color: str = "#ff8c00"
    particle_count: int = 25
    scale: float = 1.0
    duration_s: float = 2.0
    emojis: list[str] = []


class SpellResult(BaseModel):
    spell_name: str | None = None
    color: str | None = None
    damage: int = 0
    mana_cost: int = 0
    sound_id: str | None = None
    visual_effect: VisualEffect | None = None


def _parse_cast_spell(args: dict) -> SpellResult:
    """Parse the single cast_spell tool call into a SpellResult."""
    damage = max(0, min(50, args.get("damage", 0)))

    # Derive visual params from damage — the LLM doesn't need to think about these
    particle_count = 15 + int(damage * 0.7)  # 15-50
    scale = 0.6 + damage / 50 * 1.4          # 0.6-2.0
    duration_s = 1.5 + damage / 50 * 1.5     # 1.5-3.0

    template = args.get("template", "explosion")
    if template not in VALID_TEMPLATES:
        template = "explosion"

    sound_id = args.get("sound_id")
    if sound_id not in SOUND_IDS:
        sound_id = None

    return SpellResult(
        spell_name=args.get("spell_name"),
        color=args.get("primary_color", "#ff4500"),
        damage=damage,
        mana_cost=max(0, min(40, args.get("mana_cost", 0))),
        sound_id=sound_id,
        visual_effect=VisualEffect(
            template=template,
            primary_color=args.get("primary_color", "#ff4500"),
            secondary_color=args.get("secondary_color", "#ff8c00"),
            particle_count=particle_count,
            scale=round(scale, 2),
            duration_s=round(duration_s, 2),
            emojis=args.get("emojis", ["✨"])[:3],
        ),
    )


def _parse_tool_calls_mistral(tool_calls: list) -> SpellResult:
    """Parse tool calls from Mistral SDK response."""
    for tool_call in tool_calls:
        name = tool_call.function.name
        args = json.loads(tool_call.function.arguments)
        logger.info(f"Tool call: {name}({args})")
        if name == "cast_spell":
            return _parse_cast_spell(args=args)
    return SpellResult()


def _parse_tool_calls_openai(tool_calls: list) -> SpellResult:
    """Parse tool calls from OpenAI SDK response."""
    for tool_call in tool_calls:
        name = tool_call.function.name
        args = json.loads(tool_call.function.arguments)
        logger.info(f"Tool call: {name}({args})")
        if name == "cast_spell":
            return _parse_cast_spell(args=args)
    return SpellResult()


def _interpret_mistral(transcription: str, game_context: str) -> SpellResult:
    """Interpret spell via Mistral SDK (Ministral 8B)."""
    user_content = f'The wizard shouted: "{transcription}"'
    if game_context:
        user_content += f"\n\nCurrent game state:\n{game_context}"

    response = _mistral_client.chat.complete(
        model=MINISTRAL_MODEL,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_content},
        ],
        tools=TOOLS,
        tool_choice="any",
    )

    tool_calls = response.choices[0].message.tool_calls or []
    return _parse_tool_calls_mistral(tool_calls=tool_calls)


def _interpret_gpt_oss(transcription: str, game_context: str) -> SpellResult:
    """Interpret spell via GPT-OSS 120B on HuggingFace (OpenAI SDK)."""
    user_content = f'The wizard shouted: "{transcription}"'
    if game_context:
        user_content += f"\n\nCurrent game state:\n{game_context}"

    response = _hf_client.chat.completions.create(
        model=GPT_OSS_MODEL,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_content},
        ],
        tools=TOOLS,
        tool_choice="auto",
    )

    tool_calls = response.choices[0].message.tool_calls or []
    return _parse_tool_calls_openai(tool_calls=tool_calls)


def interpret_spell(transcription: str, game_context: str = "") -> SpellResult:
    """Send transcription to LLM, parse tool calls, return spell result.

    Routes to GPT-OSS 120B (default) or Ministral 8B based on SPELL_MODEL env var.
    """
    if SPELL_MODEL == "ministral-8b":
        logger.info(f"Using Ministral 8B for spell: {transcription!r}")
        return _interpret_mistral(transcription=transcription, game_context=game_context)

    logger.info(f"Using GPT-OSS 120B for spell: {transcription!r}")
    return _interpret_gpt_oss(transcription=transcription, game_context=game_context)
