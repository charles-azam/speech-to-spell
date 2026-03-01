"""Get the nearest GameTileNet tile for a word (semantic search over the embedding index).

Run: uv run python scripts/get_nearest_tile.py <word>
     uv run python scripts/get_nearest_tile.py fire
     uv run python scripts/get_nearest_tile.py "water wall" --top 3

Requires: 2024-GameTileNet/object_embedding_index.jsonl and optional deps (uv sync --extra gametilenet).
"""

import argparse
import sys
from pathlib import Path

_root = Path(__file__).resolve().parents[1]
if str(_root) not in sys.path:
    sys.path.insert(0, str(_root))

from graphics_factory.sticker_gametilenet import query_nearest_tiles


def main() -> None:
    parser = argparse.ArgumentParser(description="Get nearest GameTileNet tile(s) for a word")
    parser.add_argument("word", nargs="*", help="Word or phrase to match (e.g. fire, water wall)")
    parser.add_argument("-n", "--top", type=int, default=1, help="Number of nearest tiles to return (default: 1)")
    parser.add_argument("-v", "--verbose", action="store_true", help="Print detailed_name, score, image_path")
    args = parser.parse_args()
    word = " ".join(args.word).strip() if args.word else "fire"
    if not word:
        print("Provide a word, e.g.: uv run python scripts/get_nearest_tile.py fire", file=sys.stderr)
        sys.exit(1)

    matches = query_nearest_tiles(word, top_k=args.top)
    if not matches:
        print("No tile found. Check that 2024-GameTileNet/object_embedding_index.jsonl exists and optional deps are installed (uv sync --extra gametilenet).", file=sys.stderr)
        sys.exit(1)

    for i, m in enumerate(matches, 1):
        if args.verbose:
            print(f"#{i} score={m['score']} detailed_name={m['detailed_name']!r} image_path={m['image_path']}")
        print(m["url_path"])


if __name__ == "__main__":
    main()
