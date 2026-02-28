"""Unit tests for LLM-generated spell CSS (graphics_factory/css_generation)."""
import os
import sys
from pathlib import Path

import pytest
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

# Ensure repo root is on path so graphics_factory is importable
_root = Path(__file__).resolve().parents[1]
if str(_root) not in sys.path:
    sys.path.insert(0, str(_root))

MISTRAL_API_KEY = os.environ.get("MISTRAL_API_KEY")
pytestmark = pytest.mark.skipif(
    not MISTRAL_API_KEY,
    reason="MISTRAL_API_KEY not set; skip CSS generation test",
)


def test_generate_spell_css_returns_keyframes():
    """Ministral generates valid-looking @keyframes CSS for a spell."""
    from graphics_factory.css_generation.generate import generate_spell_css
    from graphics_factory.css_generation.display import write_preview_html

    css = generate_spell_css("Fireball", "fire")
    assert css is not None
    assert isinstance(css, str)
    assert "@keyframes" in css
    assert "%" in css
    # Should look like keyframes (has braces)
    assert "{" in css and "}" in css

    if os.environ.get("DISPLAY_CSS_PREVIEW") == "1":
        preview_path = write_preview_html(css, "Fireball")
        print(f"\nPreview written to: {preview_path}")


def test_generate_spell_css_empty_spell_returns_empty():
    """Empty spell name returns empty string."""
    from graphics_factory.css_generation.generate import generate_spell_css

    assert generate_spell_css("") == ""
    assert generate_spell_css("   ") == ""
