"""
Generate spell CSS on the fly using Mistral/Ministral.

Output is meant to be injected into a <style> tag (e.g. @keyframes only).
Safe to use for creative spells; broken CSS can be caught and shown as "fizzled".
"""
import os
from mistralai import Mistral

_CSS_SYSTEM_PROMPT = """You are a CSS animation expert for a wizard duel game.
Given a spell name and optional element (fire, ice, lightning, earth, etc.), output ONLY valid CSS.

Rules:
- Output a single @keyframes block. Name it using the spell theme (e.g. firePulse, frostBlur). Use only letters and numbers in the name.
- No HTML, no script, no external URLs. Only @keyframes and valid CSS inside.
- Prefer transform, opacity, filter (e.g. drop-shadow, blur). Keep it short (under 15 lines).
- Match the element: fire = warm glow/scale, ice = cool blur, lightning = quick flash, etc.
- Return nothing else — no markdown, no explanation, no backticks."""


def _client():
    return Mistral(api_key=os.environ["MISTRAL_API_KEY"])


def generate_spell_css(spell_name: str, element: str = "chaos") -> str:
    """
    Ask Ministral to generate a @keyframes CSS animation for the given spell.
    Returns the raw CSS string to inject, or empty string on failure.
    """
    if not spell_name or not spell_name.strip():
        return ""
    client = _client()
    user_content = f"Spell: {spell_name.strip()}. Element: {element}. Generate the @keyframes CSS only."
    try:
        response = client.chat.complete(
            model="mistral-small-latest",
            messages=[
                {"role": "system", "content": _CSS_SYSTEM_PROMPT},
                {"role": "user", "content": user_content},
            ],
        )
        raw = response.choices[0].message.content or ""
        # Strip markdown code fence if present
        if raw.startswith("```"):
            lines = raw.split("\n")
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].strip() == "```":
                lines = lines[:-1]
            raw = "\n".join(lines)
        return raw.strip()
    except Exception:
        return ""
