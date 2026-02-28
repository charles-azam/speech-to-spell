"""
Tool: (emoji, effect) -> config for rendering emojis on screen.
"""
import json
import os
import re
from pathlib import Path

_EFFECTS_BIB_PATH = Path(__file__).resolve().parent / "effects_bib.md"

# Default config per effect when not using Ministral
_DEFAULTS: dict[str, dict] = {
    "rain": {"count": 14, "duration_ms": 2500, "size_min": 1.0, "size_max": 1.6},
    "burst": {"count": 12, "duration_ms": 1200, "size_min": 1.2, "size_max": 1.8},
    "spiral": {"count": 10, "duration_ms": 2000, "size_min": 1.0, "size_max": 1.4},
    "pulse": {"count": 6, "duration_ms": 1500, "size_min": 1.2, "size_max": 1.8},
    "wave": {"count": 10, "duration_ms": 1800, "size_min": 1.0, "size_max": 1.5},
    "explode": {"count": 16, "duration_ms": 1000, "size_min": 1.0, "size_max": 1.4},
}


def list_effects(bib_path: Path | None = None) -> list[str]:
    """Return effect ids from effects_bib.md. Uses _DEFAULTS keys if bib missing."""
    path = bib_path or _EFFECTS_BIB_PATH
    if path.exists():
        text = path.read_text(encoding="utf-8")
        ids: list[str] = []
        for line in text.splitlines():
            line = line.strip()
            if line.startswith("- **") and "** —" in line:
                m = re.match(r"-\s*\*\*(.+?)\*\*\s*—", line)
                if m:
                    ids.append(m.group(1).strip().lower())
        if ids:
            return ids
    return list(_DEFAULTS)


def get_emoji_effect_config(emoji: str, effect: str, use_llm: bool = False) -> dict:
    """
    Return config dict for rendering this emoji with this effect.
    Keys: emoji, effect, count, duration_ms, size_min, size_max.
    Invalid effect falls back to 'rain' with default params.
    """
    effect = effect.strip().lower()
    effects = list_effects()
    if effect not in effects:
        effect = "rain"

    base = {
        "emoji": (emoji or "✨").strip() or "✨",
        "effect": effect,
        "count": _DEFAULTS.get(effect, _DEFAULTS["rain"])["count"],
        "duration_ms": _DEFAULTS.get(effect, _DEFAULTS["rain"])["duration_ms"],
        "size_min": _DEFAULTS.get(effect, _DEFAULTS["rain"])["size_min"],
        "size_max": _DEFAULTS.get(effect, _DEFAULTS["rain"])["size_max"],
    }

    if use_llm and os.environ.get("MISTRAL_API_KEY"):
        try:
            from mistralai import Mistral
            client = Mistral(api_key=os.environ["MISTRAL_API_KEY"])
            response = client.chat.complete(
                model="mistral-small-latest",
                messages=[
                    {"role": "system", "content": "You suggest particle effect parameters for a wizard game. Reply with JSON only: {\"count\": number 6-20, \"duration_ms\": number 800-3000, \"size_min\": number 0.8-1.2, \"size_max\": number 1.2-2.0}. Keep it short."},
                    {"role": "user", "content": f"Emoji: {base['emoji']}. Effect: {effect}. Return JSON only."},
                ],
                response_format={"type": "json_object"},
            )
            raw = response.choices[0].message.content
            data = json.loads(raw or "{}")
            if isinstance(data.get("count"), (int, float)):
                base["count"] = max(4, min(24, int(data["count"])))
            if isinstance(data.get("duration_ms"), (int, float)):
                base["duration_ms"] = max(500, min(4000, int(data["duration_ms"])))
            if isinstance(data.get("size_min"), (int, float)):
                base["size_min"] = max(0.5, min(2.0, float(data["size_min"])))
            if isinstance(data.get("size_max"), (int, float)):
                base["size_max"] = max(0.8, min(2.5, float(data["size_max"])))
        except Exception:
            pass
    return base
