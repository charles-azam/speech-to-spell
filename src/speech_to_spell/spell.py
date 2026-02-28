import os
import json
import asyncio
from pydantic import BaseModel
from mistralai import Mistral

client = Mistral(api_key=os.environ["MISTRAL_API_KEY"])

SPELL_SYSTEM_PROMPT = """\
You are the spell judge in a comedic wizard duel game called "Speech to Spell".
Players cast spells by speaking them out loud. Spells can be anything — elemental magic, absurd inventions, emotional attacks, pop culture references, meta-game tricks.

Your job: interpret the spoken spell and return a structured JSON result.

RULES:
- Creativity is KING. A boring "fireball" scores low (2-3). A "volcanic sneeze from the earth's nostril" scores 8-10.
- Damage scales with creativity: boring spells do 5-15 damage, creative spells do 20-40.
- Mana cost scales with power: 10-30 mana typically.
- If a player repeats a spell or concept from spell_history, PENALIZE heavily (creativity=1, damage=5, commentary should mock them).
- Pick 1-3 emojis that best represent the spell visually.
- Write a short funny commentator line (1-2 sentences) as if you're a sports commentator for wizard duels.
- screen_shake: 0.0 to 1.0 intensity
- color_tint: a hex color for the screen flash (match the spell's element/theme)
- If the transcription is empty, gibberish, or clearly not a spell, return a fizzled spell.

Return ONLY valid JSON matching this schema:
{
  "spell_name": "string - dramatic name for the spell",
  "element": "string - fire/water/ice/lightning/earth/dark/light/chaos/emotional/meta/physical/cosmic",
  "damage": "int 5-40",
  "mana_cost": "int 10-30",
  "creativity_score": "int 1-10",
  "emojis": ["array of 1-3 emoji strings"],
  "description": "string - what the spell does in 1 sentence",
  "commentary": "string - funny commentator line",
  "screen_shake": "float 0.0-1.0",
  "color_tint": "string - hex color like #FF4400"
}
"""


class SpellResult(BaseModel):
    spell_name: str
    element: str
    damage: int
    mana_cost: int
    creativity_score: int
    emojis: list[str]
    description: str
    commentary: str
    screen_shake: float
    color_tint: str


FIZZLED_SPELL = SpellResult(
    spell_name="Fizzled Spell",
    element="chaos",
    damage=0,
    mana_cost=5,
    creativity_score=0,
    emojis=["💨", "😶"],
    description="The spell fizzles into nothing.",
    commentary="That was... something. The crowd is confused. So is the wizard.",
    screen_shake=0.1,
    color_tint="#888888",
)


async def interpret_spell(transcription: str, spell_history: list[str]) -> SpellResult:
    """Use Ministral to interpret a spoken spell and return structured result."""
    if not transcription or len(transcription.strip()) < 2:
        return FIZZLED_SPELL

    history_text = ""
    if spell_history:
        history_text = f"\n\nRecent spell history (penalize repeats): {', '.join(spell_history[-6:])}"

    try:
        response = await asyncio.to_thread(
            client.chat.complete,
            model="mistral-small-latest",
            messages=[
                {"role": "system", "content": SPELL_SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": f'The player cast: "{transcription}"{history_text}',
                },
            ],
            response_format={"type": "json_object"},
        )

        raw = response.choices[0].message.content
        data = json.loads(raw)
        return SpellResult(**data)
    except Exception as e:
        print(f"Spell interpretation error: {e}")
        return SpellResult(
            spell_name=transcription.title() or "Mystery Spell",
            element="chaos",
            damage=10,
            mana_cost=15,
            creativity_score=3,
            emojis=["✨"],
            description=f"A mysterious spell: {transcription}",
            commentary="The spell judge seems confused... but it still counts!",
            screen_shake=0.3,
            color_tint="#AA44FF",
        )
