"""
Display emoji×effect combinations in a single HTML preview (all effects on screen).
"""
import os
import random
import sys
from pathlib import Path

from graphics_factory.emoji_effects.tool import get_emoji_effect_config, list_effects

_PREVIEW_HTML_PATH = Path(__file__).resolve().parent / "preview.html"

_EFFECT_KEYFRAMES = """
@keyframes emojiRain {
  0% { transform: translateY(0) rotate(0deg) scale(1); opacity: 1; }
  100% { transform: translateY(120%) rotate(360deg) scale(0.6); opacity: 0; }
}
@keyframes emojiBurst {
  0% { transform: translate(-50%,-50%) scale(0); opacity: 1; }
  70% { opacity: 1; }
  100% { transform: translate(-50%,-50%) scale(2); opacity: 0; }
}
@keyframes emojiSpiral {
  0% { transform: translate(-50%,-50%) rotate(0deg) translateY(0) scale(1); opacity: 1; }
  100% { transform: translate(-50%,-50%) rotate(720deg) translateY(-80%) scale(0.4); opacity: 0; }
}
@keyframes emojiPulse {
  0%, 100% { transform: translate(-50%,-50%) scale(1); opacity: 0.9; }
  50% { transform: translate(-50%,-50%) scale(1.4); opacity: 1; }
}
@keyframes emojiWave {
  0%, 100% { transform: translateY(0) translateX(0); opacity: 1; }
  25% { transform: translateY(-15%) translateX(10%); opacity: 0.9; }
  75% { transform: translateY(-15%) translateX(-10%); opacity: 0.9; }
}
@keyframes emojiExplode {
  0% { transform: translate(-50%,-50%) scale(1); opacity: 1; }
  100% { transform: translate(-50%,-50%) translate(var(--ex-x), var(--ex-y)) scale(0.3); opacity: 0; }
}
"""

_DEFAULT_EMOJIS = ["🔥", "❄️", "💥", "✨", "🐱", "💔"]


def _effect_animation_class(effect: str) -> str:
    name = effect.strip().lower()
    map_name = {
        "rain": "emojiRain",
        "burst": "emojiBurst",
        "spiral": "emojiSpiral",
        "pulse": "emojiPulse",
        "wave": "emojiWave",
        "explode": "emojiExplode",
    }
    return map_name.get(name, "emojiRain")


def write_preview_html_all(
    emoji_list: list[str] | None = None,
    effect_list: list[str] | None = None,
    output_path: Path | None = None,
    use_llm: bool = False,
) -> Path:
    """
    Write one HTML file that displays every (emoji, effect) combination in a grid.
    Each cell shows particles with the corresponding effect animation.
    """
    path = output_path or _PREVIEW_HTML_PATH
    path = path.resolve()
    path.parent.mkdir(parents=True, exist_ok=True)

    emojis = emoji_list or _DEFAULT_EMOJIS
    effects = effect_list or list_effects()

    cells: list[str] = []
    for emoji in emojis:
        for effect in effects:
            cfg = get_emoji_effect_config(emoji, effect, use_llm=use_llm)
            count = max(4, min(24, cfg["count"]))
            duration_s = cfg["duration_ms"] / 1000.0
            size_min = cfg["size_min"]
            size_max = cfg["size_max"]
            anim_class = _effect_animation_class(effect)

            particles_html: list[str] = []
            for i in range(count):
                if effect == "burst" or effect == "explode":
                    left, top = 50, 50
                else:
                    left = 10 + random.random() * 80
                    top = 10 + random.random() * 40
                delay = random.random() * 0.4
                size = size_min + random.random() * (size_max - size_min)
                ex_x = (random.random() - 0.5) * 120
                ex_y = (random.random() - 0.5) * 120
                style = f"left:{left}%;top:{top}%;font-size:{size}rem;animation:{anim_class} {duration_s}s ease-out {delay}s forwards;"
                if effect == "explode":
                    style += f"--ex-x:{ex_x}%;--ex-y:{ex_y}%;"
                esc_emoji = emoji.replace("&", "&amp;").replace("<", "&lt;")
                particles_html.append(
                    f'<div class="particle effect-{effect}" style="{style}">{esc_emoji}</div>'
                )

            cell_content = "".join(particles_html)
            label = f"{emoji} {effect}"
            cells.append(
                f'<div class="cell"><div class="cell-label">{label}</div><div class="particles-container">{cell_content}</div></div>'
            )

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Emoji effects — all</title>
  <style>
    * {{ box-sizing: border-box; }}
    body {{ margin: 0; min-height: 100vh; background: #1a1a2e; color: #eee; font-family: system-ui, sans-serif; padding: 1rem; }}
    h1 {{ text-align: center; margin-bottom: 1rem; }}
    .grid {{ display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1rem; max-width: 1200px; margin: 0 auto; }}
    .cell {{ background: rgba(0,0,0,0.3); border-radius: 12px; padding: 0.5rem; position: relative; height: 160px; overflow: hidden; }}
    .cell-label {{ font-size: 0.8rem; text-align: center; margin-bottom: 0.25rem; }}
    .particles-container {{ position: absolute; inset: 0.25rem; overflow: hidden; pointer-events: none; }}
    .particle {{ position: absolute; will-change: transform; }}
    .particle.effect-burst {{ left: 50%% !important; top: 50%% !important; }}
    .particle.effect-spiral {{ left: 50%% !important; top: 50%% !important; }}
    .particle.effect-pulse {{ left: 50%% !important; top: 50%% !important; }}
    .particle.effect-explode {{ left: 50%% !important; top: 50%% !important; }}
    {_EFFECT_KEYFRAMES}
    .particle.effect-rain {{ animation-name: emojiRain; }}
    .particle.effect-burst {{ animation-name: emojiBurst; }}
    .particle.effect-spiral {{ animation-name: emojiSpiral; }}
    .particle.effect-pulse {{ animation-name: emojiPulse; animation-iteration-count: infinite; }}
    .particle.effect-wave {{ animation-name: emojiWave; animation-iteration-count: infinite; }}
    .particle.effect-explode {{ animation-name: emojiExplode; }}
  </style>
</head>
<body>
  <h1>Emoji effects — all</h1>
  <div class="grid">
    {"".join(cells)}
  </div>
</body>
</html>
"""
    path.write_text(html, encoding="utf-8")
    return path


def main() -> None:
    """CLI: write preview HTML for all emoji×effect combinations and open in browser."""
    from dotenv import load_dotenv

    load_dotenv(Path(__file__).resolve().parents[2] / ".env")
    use_llm = os.environ.get("EMOJI_EFFECTS_USE_LLM") == "1"

    path = write_preview_html_all(use_llm=use_llm)
    print(path)
    try:
        import webbrowser
        webbrowser.open(f"file://{path}")
    except Exception:
        pass


if __name__ == "__main__":
    main()
