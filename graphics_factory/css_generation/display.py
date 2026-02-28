"""
Display Ministral-generated spell CSS in a viewable HTML preview.
"""
import os
import re
import sys
from pathlib import Path

from graphics_factory.css_generation.generate import generate_spell_css

_PREVIEW_HTML_PATH = Path(__file__).resolve().parent / "preview.html"
_SPELL_BIB_PATH = Path(__file__).resolve().parents[1] / "spell_bib.md"


def load_spell_bib(bib_path: Path | None = None) -> list[tuple[str, str]]:
    """
    Parse spell_bib.md and return a list of (spell_name, element) tuples.
    Sections like "## Fire" define the element; list items "- **Name** — desc" define spells.
    """
    path = bib_path or _SPELL_BIB_PATH
    if not path.exists():
        return []
    text = path.read_text(encoding="utf-8")
    entries: list[tuple[str, str]] = []
    current_element = "chaos"
    for line in text.splitlines():
        line = line.strip()
        if line.startswith("## ") and not line.startswith("## Spell"):
            current_element = line[2:].strip().split("/")[0].strip().lower().replace(" ", "_")
        if line.startswith("- **") and "** —" in line:
            match = re.match(r"-\s*\*\*(.+?)\*\*\s*—", line)
            if match:
                entries.append((match.group(1).strip(), current_element))
    return entries


def parse_keyframes_name(css: str) -> str | None:
    """Extract the first @keyframes animation name from CSS, or None."""
    if not css or "@keyframes" not in css:
        return None
    m = re.search(r"@keyframes\s+(\w+)\s*\{", css)
    return m.group(1) if m else None


def write_preview_html(css: str, spell_name: str, output_path: Path | None = None) -> Path:
    """
    Write a self-contained HTML file that renders the given CSS animation.
    Parses the first @keyframes name to apply it to a visible div; if parsing fails,
    shows the raw CSS in a <pre> and a message.
    Returns the path to the written file.
    """
    path = output_path or _PREVIEW_HTML_PATH
    path = path.resolve()
    path.parent.mkdir(parents=True, exist_ok=True)

    keyframes_name = parse_keyframes_name(css) if css else None
    escaped_css = (css or "").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

    if keyframes_name:
        preview_block = f"""
      <div class="preview-box" style="animation: {keyframes_name} 2s ease-in-out infinite;">
        <span class="spell-label">{spell_name}</span>
      </div>"""
        fallback_msg = ""
    else:
        preview_block = """
      <p class="no-animation-msg">Could not parse animation name from CSS. Raw output below.</p>"""
        fallback_msg = f'<pre class="raw-css">{escaped_css}</pre>' if css else ""

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Spell preview: {spell_name}</title>
  <style>
    * {{ box-sizing: border-box; }}
    body {{ margin: 0; min-height: 100vh; background: #1a1a2e; color: #eee; font-family: system-ui, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 1rem; }}
    .preview-box {{ width: 280px; height: 280px; border-radius: 50%; background: radial-gradient(circle, #333 0%%, #111 100%%); display: flex; align-items: center; justify-content: center; box-shadow: 0 0 40px rgba(0,0,0,0.5); }}
    .spell-label {{ font-size: 1.25rem; font-weight: bold; text-transform: uppercase; letter-spacing: 0.1em; opacity: 0.9; }}
    .no-animation-msg {{ color: #f88; margin-bottom: 1rem; }}
    .raw-css {{ background: #0d0d12; padding: 1rem; border-radius: 8px; overflow: auto; max-width: 90%%; font-size: 0.85rem; text-align: left; }}
    details {{ margin-top: 2rem; max-width: 90%%; }}
    summary {{ cursor: pointer; color: #888; }}
  </style>
  <style>
{css or "/* no CSS */"}
  </style>
</head>
<body>
  <h1 style="margin-bottom: 0.5rem;">{spell_name}</h1>
  {preview_block}
  {fallback_msg}
  <details>
    <summary>Raw CSS</summary>
    <pre class="raw-css">{escaped_css or "(empty)"}</pre>
  </details>
</body>
</html>
"""
    path.write_text(html, encoding="utf-8")
    return path


def _sanitize_animation_id(name: str) -> str:
    """Turn spell name into a valid CSS identifier (no spaces, safe chars)."""
    return re.sub(r"[^a-zA-Z0-9_-]", "_", name).strip("_") or "spell"


def write_preview_html_all(
    entries: list[tuple[str, str, str]],
    output_path: Path | None = None,
) -> Path:
    """
    Write a single HTML file that displays all spells. Each entry is (spell_name, element, css).
    Keyframes names are prefixed per spell to avoid collisions.
    """
    path = output_path or _PREVIEW_HTML_PATH
    path = path.resolve()
    path.parent.mkdir(parents=True, exist_ok=True)

    combined_css: list[str] = []
    sections_html: list[str] = []

    for spell_name, _element, css in entries:
        sid = _sanitize_animation_id(spell_name)
        keyframes_name = parse_keyframes_name(css) if css else None
        if keyframes_name and css:
            unique_name = f"anim_{sid}"
            scoped_css = re.sub(
                r"@keyframes\s+" + re.escape(keyframes_name) + r"\s*\{",
                f"@keyframes {unique_name} {{",
                css,
                count=1,
            )
            combined_css.append(scoped_css)
            escaped_name = spell_name.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
            sections_html.append(f"""
      <section class="spell-card">
        <h2 class="spell-title">{escaped_name}</h2>
        <div class="preview-box" style="animation: {unique_name} 2s ease-in-out infinite;">
          <span class="spell-label">{escaped_name}</span>
        </div>
      </section>""")
        else:
            escaped_css = (css or "").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
            escaped_name = spell_name.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
            sections_html.append(f"""
      <section class="spell-card">
        <h2 class="spell-title">{escaped_name}</h2>
        <p class="no-animation-msg">Could not parse animation name.</p>
        <pre class="raw-css">{escaped_css or "(empty)"}</pre>
      </section>""")

    full_css = "\n".join(combined_css)
    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Spell preview — all spells</title>
  <style>
    * {{ box-sizing: border-box; }}
    body {{ margin: 0; min-height: 100vh; background: #1a1a2e; color: #eee; font-family: system-ui, sans-serif; padding: 1.5rem; }}
    h1 {{ text-align: center; margin-bottom: 1.5rem; }}
    .spells-grid {{ display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 2rem; justify-items: center; max-width: 1200px; margin: 0 auto; }}
    .spell-card {{ display: flex; flex-direction: column; align-items: center; gap: 0.5rem; }}
    .spell-title {{ font-size: 1rem; margin: 0; text-align: center; }}
    .preview-box {{ width: 200px; height: 200px; border-radius: 50%; background: radial-gradient(circle, #333 0%%, #111 100%%); display: flex; align-items: center; justify-content: center; box-shadow: 0 0 30px rgba(0,0,0,0.5); }}
    .spell-label {{ font-size: 0.9rem; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em; opacity: 0.9; }}
    .no-animation-msg {{ color: #f88; font-size: 0.9rem; }}
    .raw-css {{ background: #0d0d12; padding: 0.5rem; border-radius: 6px; font-size: 0.75rem; max-width: 100%; overflow: auto; }}
  </style>
  <style>
{full_css}
  </style>
</head>
<body>
  <h1>Spell preview — all spells</h1>
  <div class="spells-grid">
{"".join(sections_html)}
  </div>
</body>
</html>
"""
    path.write_text(html, encoding="utf-8")
    return path


def main() -> None:
    """CLI: generate CSS and write preview HTML. Use 'all' to generate for every spell in spell_bib.md."""
    from dotenv import load_dotenv

    load_dotenv(Path(__file__).resolve().parents[2] / ".env")

    if not os.environ.get("MISTRAL_API_KEY"):
        print("MISTRAL_API_KEY not set. Set it in .env at repo root.", file=sys.stderr)
        sys.exit(1)

    first_arg = (sys.argv[1] or "").strip().lower()
    if first_arg == "all":
        spells = load_spell_bib()
        if not spells:
            print("No spells found in spell_bib.md.", file=sys.stderr)
            sys.exit(1)
        entries: list[tuple[str, str, str]] = []
        for i, (spell_name, element) in enumerate(spells):
            print(f"  [{i+1}/{len(spells)}] {spell_name} ({element})", file=sys.stderr)
            css = generate_spell_css(spell_name, element)
            entries.append((spell_name, element, css))
        path = write_preview_html_all(entries)
        print(path)
        try:
            import webbrowser
            webbrowser.open(f"file://{path}")
        except Exception:
            pass
        return

    spell_name = (sys.argv[1] or "Fireball").strip()
    element = (sys.argv[2] if len(sys.argv) > 2 else "chaos").strip() or "chaos"
    css = generate_spell_css(spell_name, element)
    path = write_preview_html(css, spell_name)
    print(path)
    try:
        import webbrowser
        webbrowser.open(f"file://{path}")
    except Exception:
        pass


if __name__ == "__main__":
    main()
