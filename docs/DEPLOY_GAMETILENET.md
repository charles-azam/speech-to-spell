# Deploy GameTileNet sticker fallback (machine with PyTorch)

Use this on a machine where PyTorch/torch installs (e.g. ARM Mac, Linux, Windows, or Python 3.11). **Not supported on macOS Intel (x86_64) + Python 3.13** — no PyTorch wheels for that combo.

## Intent

- **GameTileNet sticker fallback**: when Klipy is missing or returns no sticker, the backend finds the nearest pixel-art tile from the 2024-GameTileNet embedding index by spell name and serves it at `/stickers/gametilenet/...`.
- **Nearest tile from a word**: you can get the nearest tile for any word via code (`query_nearest_tiles(word, top_k)`) or CLI (`scripts/get_nearest_tile.py <word>`).

## Steps on the target machine

1. **Repo and data**
   - Clone/copy the repo so the project root contains:
     - `2024-GameTileNet/object_embedding_index.jsonl` (embedding index)
     - `2024-GameTileNet/DataAndAnnotations/Assets/` (tile images; subdirs like `004_001_complete/`, `tiles/`, etc.)
   - If you only have the repo without GameTileNet, add/copy the `2024-GameTileNet` tree (index + Assets) into the repo root.

2. **Install optional dependency (needs torch)**
   ```bash
   uv sync --extra gametilenet
   ```
   Or with pip:
   ```bash
   pip install sentence-transformers
   ```
   (Project already has `scipy` in main deps.)

3. **Verify**
   - **CLI** — nearest tile for a word:
     ```bash
     uv run python scripts/get_nearest_tile.py fire -v
     ```
     Should print a URL path and optionally `detailed_name`, `score`, `image_path`. If you see "No tile found" or "GameTileNet sticker fallback disabled", check that `2024-GameTileNet/object_embedding_index.jsonl` exists and that `sentence_transformers` (and torch) are installed.
   - **Backend** — start the app and cast a spell (no Klipy or with Klipy returning nothing); `spell_result` should include `sticker_url` like `/stickers/gametilenet/004_001_complete/combined_11_15.png`, and `GET /stickers/gametilenet/<path>` should serve the image.

4. **Paths (no config needed)**
   - Index: `2024-GameTileNet/object_embedding_index.jsonl`
   - Assets: `2024-GameTileNet/DataAndAnnotations/Assets`
   - Both are resolved from the project root (directory that contains `graphics_factory/` and `2024-GameTileNet/`).

## Summary

- **Install**: `uv sync --extra gametilenet` (on a platform where torch has wheels).
- **Requires**: repo root with `2024-GameTileNet/object_embedding_index.jsonl` and `2024-GameTileNet/DataAndAnnotations/Assets/`.
- **Check**: `uv run python scripts/get_nearest_tile.py fire -v` prints a URL path and metadata.
