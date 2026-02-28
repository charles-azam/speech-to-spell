import json
import logging
import os

from dotenv import load_dotenv
from mistralai import Mistral
from pydantic import BaseModel

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
]

SYSTEM_PROMPT = """You are the judge of a wizard duel game. A wizard just cast a spell by speaking out loud.
You will receive the transcription of what they said. Your job is to:

1. Call `name_spell` to give the spell a dramatic, fun name based on what the wizard said.
2. Call `change_color` to set a CSS color that matches the spell's element or mood — this color will tint the opponent's side of the arena.

Always call BOTH tools. Be creative and have fun with the names. Match colors to the spell's nature:
- Fire/explosion → reds, oranges (#ff4500, #ff6600)
- Ice/cold → blues, cyans (#00bfff, #87ceeb)
- Lightning/electric → yellows (#ffd700, #ffff00)
- Nature/earth → greens (#228b22, #7cfc00)
- Dark/shadow → purples, dark (#4b0082, #8b00ff)
- Water → blues (#1e90ff, #4169e1)
- Weird/funny/chaotic → pick something unexpected
"""


class SpellResult(BaseModel):
    spell_name: str | None = None
    color: str | None = None


def interpret_spell(transcription: str) -> SpellResult:
    """Send transcription to Ministral, parse tool calls, return spell name + color."""
    response = _client.chat.complete(
        model=MINISTRAL_MODEL,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f'The wizard shouted: "{transcription}"'},
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

    return result
