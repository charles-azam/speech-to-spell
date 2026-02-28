#!/usr/bin/env python3
"""Pull the nyuuzyou/stickers dataset from Hugging Face.

Dataset: https://huggingface.co/datasets/nyuuzyou/stickers
- Telegram stickers as 512×512 (or 128×128 in dataset_resized) PNGs.
- Classes = 1276 emoji (Unicode); each image filename = Telegram file ID.

Usage:
  # Pull only the small examples folder (~1 MB)
  uv run python scripts/pull_stickers_dataset.py

  # Pull only dataset_resized/val.zip (128×128, ~741 MB); checks disk space first
  uv run python scripts/pull_stickers_dataset.py --val

  # Custom output dir
  uv run python scripts/pull_stickers_dataset.py -o data/stickers --val
"""

import argparse
import shutil
import sys
from pathlib import Path

from huggingface_hub import snapshot_download


REPO_ID = "nyuuzyou/stickers"
DEFAULT_CACHE = Path(__file__).resolve().parents[1] / "data" / "stickers"

# dataset_resized/val.zip is ~741 MB; require a bit more for extraction buffer
VAL_ZIP_REQUIRED_BYTES = 800 * 1024 * 1024  # 800 MiB


def check_disk_space(path: Path, required: int) -> bool:
    """Print disk usage for the volume containing path; return True if enough free space."""
    usage = shutil.disk_usage(path)
    free_mb = usage.free / (1024 * 1024)
    required_mb = required / (1024 * 1024)
    print(f"Disk: {usage.free / (1024**3):.1f} GB free on {path}")
    print(f"Required for val.zip: {required_mb:.0f} MB")
    if usage.free < required:
        print(f"Not enough space (need {required_mb:.0f} MB more).", file=sys.stderr)
        return False
    return True


def main() -> None:
    ap = argparse.ArgumentParser(description="Pull nyuuzyou/stickers from Hugging Face")
    ap.add_argument(
        "-o",
        "--output",
        type=Path,
        default=DEFAULT_CACHE,
        help="Directory to download into (default: data/stickers)",
    )
    ap.add_argument(
        "--val",
        action="store_true",
        help="Download only dataset_resized/val.zip (128×128, ~741 MB). Checks disk space first.",
    )
    args = ap.parse_args()

    out = args.output.resolve()
    out.mkdir(parents=True, exist_ok=True)

    if args.val:
        if not check_disk_space(out, VAL_ZIP_REQUIRED_BYTES):
            sys.exit(1)
        allow = ["dataset_resized/val.zip"]
    else:
        allow = ["examples/*"]

    print(f"Downloading to {out}")
    print("Allowed patterns:", allow)
    path = snapshot_download(
        repo_id=REPO_ID,
        repo_type="dataset",
        local_dir=str(out),
        allow_patterns=allow,
    )
    print(f"Done. Dataset at: {path}")
    if args.val and (Path(path) / "dataset_resized").exists():
        val_zip = Path(path) / "dataset_resized" / "val.zip"
        print(f"Val zip: {val_zip} ({val_zip.stat().st_size / (1024**2):.0f} MB)" if val_zip.exists() else "val.zip not found")
    elif (Path(path) / "examples").exists():
        ex = list((Path(path) / "examples").glob("*.png"))
        print(f"Examples: {len(ex)} PNGs — {[p.name for p in ex]}")


if __name__ == "__main__":
    main()
