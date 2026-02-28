"""Unit tests for Mistral/Ministral inference (chat completion and spell interpretation)."""
import os
from pathlib import Path

import pytest
from dotenv import load_dotenv
from mistralai import Mistral

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

MISTRAL_API_KEY = os.environ.get("MISTRAL_API_KEY")
pytestmark = pytest.mark.skipif(
    not MISTRAL_API_KEY,
    reason="MISTRAL_API_KEY not set; skip to avoid API call",
)


def test_mistral_chat_completion():
    """Verify the API key works and the model returns a non-empty completion."""
    client = Mistral(api_key=MISTRAL_API_KEY)
    response = client.chat.complete(
        model="mistral-small-latest",
        messages=[{"role": "user", "content": "Reply with only the word OK."}],
    )
    content = response.choices[0].message.content
    assert content is not None
    assert len(content.strip()) > 0
    assert "ok" in content.strip().lower()


async def test_interpret_spell_returns_structured_result():
    """Verify interpret_spell returns a valid SpellResult with expected fields."""
    from speech_to_spell.spell import SpellResult, interpret_spell

    result = await interpret_spell("fireball", [])
    assert isinstance(result, SpellResult)
    assert result.spell_name
    assert 0 <= result.damage <= 40
    assert result.mana_cost >= 0
    assert result.creativity_score >= 0
    assert len(result.emojis) >= 1
