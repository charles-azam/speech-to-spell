# nyuuzyou/stickers — How it works

**Source:** [Hugging Face: nyuuzyou/stickers](https://huggingface.co/datasets/nyuuzyou/stickers)

## What it is

- **Telegram stickers** exported as PNG images for image classification.
- **672,911 images**, **1,276 classes** (each class = one Unicode emoji chosen by the sticker pack author).
- Image size: **512×512** (full) or **128×128** in `dataset_resized/`.
- Filename of each image = **Telegram file ID** (unique per sticker).

## Layout on Hugging Face

| Path | Description | Size |
|------|-------------|------|
| `examples/` | 5 sample PNGs (no labels in filename) | ~1 MB |
| `valid.zip` | Validation set, 512×512 | ~6.6 GB |
| `test.zip` | Test set, 512×512 | ~7 GB |
| `train.zip.001` … `train.zip.006` | Train set (split archive), 512×512 | ~21 GB each |
| `dataset_resized/val.zip` | Validation, 128×128 | ~741 MB |
| `dataset_resized/test.zip` | Test, 128×128 | ~780 MB |
| `dataset_resized/train.zip` | Train, 128×128 | ~13.6 GB |

## Class labels

- Classes are **Unicode code points** of the emoji (e.g. `U+1F917` = 🤗).
- In the zips, images are typically in **one folder per class** (folder name = emoji or codepoint).
- So: one folder = one “emoji” concept; many sticker images per folder.

## Pulling the data

From the repo root:

```bash
# Examples only (~1 MB)
uv run python scripts/pull_stickers_dataset.py

# Examples + 128×128 validation set (~741 MB)
uv run python scripts/pull_stickers_dataset.py --val
```

Output goes to `data/stickers/` by default (override with `-o`).

## Using it for the game

For **semantic particles / spell effects**, you can:

1. **Use emoji as semantic labels** — e.g. map spell concepts to the 1,276 emoji classes and pick a random sticker from the matching class.
2. **Build a small subset** — pull `dataset_resized/val.zip` (or part of train), extract, then select classes that match your spell vocabulary (nature, fire, water, objects, etc.).
3. **RAG-style retrieval** — embed sticker class names (emoji + optional text) with Mistral Embed and retrieve by spell description; then resolve to sticker image paths.

The `examples/` folder is unlabeled; the **zips** contain the class structure (folder = class).
