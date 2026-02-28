"""Fetch the first/best sticker URL for a prompt using Klipy.

Uses KLIPY_API_KEY from .env. Returns the first result from the sticker search list.

Run: .venv/bin/python scripts/get_sticker.py [prompt]
Example: .venv/bin/python scripts/get_sticker.py fireball spell
"""

import sys
from pathlib import Path

_root = Path(__file__).resolve().parents[1]
if str(_root) not in sys.path:
    sys.path.insert(0, str(_root))

from dotenv import load_dotenv

load_dotenv(_root / ".env")

from graphics_factory.gif_fetch import get_best_sticker


def main() -> None:
    prompt = " ".join(sys.argv[1:]).strip() if len(sys.argv) > 1 else "magic spell"
    url = get_best_sticker(prompt, limit=1)
    if url:
        print(url)
    else:
        print("No sticker found.", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
