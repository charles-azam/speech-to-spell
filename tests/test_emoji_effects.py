"""Unit tests for emoji effects tool (list_effects, get_emoji_effect_config)."""
import os
import sys
from pathlib import Path

import pytest
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

_root = Path(__file__).resolve().parents[1]
if str(_root) not in sys.path:
    sys.path.insert(0, str(_root))

from graphics_factory.emoji_effects.tool import get_emoji_effect_config, list_effects


def test_list_effects_returns_non_empty_strings():
    """list_effects() returns a non-empty list of effect id strings."""
    effects = list_effects()
    assert isinstance(effects, list)
    assert len(effects) > 0
    for e in effects:
        assert isinstance(e, str)
        assert len(e) > 0


def test_get_emoji_effect_config_returns_required_keys():
    """get_emoji_effect_config returns a dict with emoji, effect, count, duration_ms, size_min, size_max."""
    cfg = get_emoji_effect_config("🔥", "rain")
    assert isinstance(cfg, dict)
    assert cfg.get("emoji") == "🔥"
    assert cfg.get("effect") == "rain"
    assert "count" in cfg
    assert "duration_ms" in cfg
    assert "size_min" in cfg
    assert "size_max" in cfg
    assert isinstance(cfg["count"], int)
    assert isinstance(cfg["duration_ms"], (int, float))
    assert cfg["count"] >= 4
    assert cfg["duration_ms"] >= 500


def test_get_emoji_effect_config_invalid_effect_uses_safe_default():
    """Invalid effect does not crash; falls back to rain (or first valid effect)."""
    cfg = get_emoji_effect_config("✨", "nonexistent_effect_xyz")
    assert isinstance(cfg, dict)
    assert cfg.get("emoji") == "✨"
    assert cfg.get("effect") in list_effects()
    assert "count" in cfg and "duration_ms" in cfg


def test_get_emoji_effect_config_with_llm_returns_valid_config():
    """When MISTRAL_API_KEY is set and use_llm=True, returned config is still valid."""
    if not os.environ.get("MISTRAL_API_KEY"):
        pytest.skip("MISTRAL_API_KEY not set")
    cfg = get_emoji_effect_config("🐱", "burst", use_llm=True)
    assert isinstance(cfg, dict)
    assert cfg.get("emoji") == "🐱"
    assert cfg.get("effect") == "burst"
    assert 4 <= cfg.get("count", 0) <= 24
    assert 500 <= cfg.get("duration_ms", 0) <= 4000
