"""
GameTileNet sticker retrieval: semantic search over object_embedding_index.jsonl.

Returns a URL path for the best-matching pixel-art asset (e.g. /stickers/gametilenet/...).
Used as fallback when Klipy is unavailable or returns no result.
"""

import json
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

# Paths relative to project root
PROJECT_ROOT = Path(__file__).resolve().parents[1]
INDEX_PATH = PROJECT_ROOT / "2024-GameTileNet" / "object_embedding_index.jsonl"
ASSETS_DIR = PROJECT_ROOT / "2024-GameTileNet" / "DataAndAnnotations" / "Assets"

# Lazy-loaded state
_model = None
_index: list[dict] | None = None
_warned_missing = False

URL_PREFIX = "/stickers/gametilenet"


def _ensure_loaded() -> bool:
    """Load model and index on first use. Return True if ready to query."""
    global _model, _index, _warned_missing

    if not INDEX_PATH.exists():
        if not _warned_missing:
            logger.info("GameTileNet index not found at %s, sticker fallback disabled", INDEX_PATH)
            _warned_missing = True
        return False

    if not ASSETS_DIR.is_dir():
        if not _warned_missing:
            logger.info("GameTileNet Assets dir not found at %s, sticker fallback disabled", ASSETS_DIR)
            _warned_missing = True
        return False

    if _index is not None:
        return True

    try:
        from sentence_transformers import SentenceTransformer
        from scipy.spatial.distance import cosine
    except ImportError as e:
        if not _warned_missing:
            logger.warning("GameTileNet sticker fallback disabled: %s", e)
            _warned_missing = True
        return False

    try:
        _model = SentenceTransformer("all-MiniLM-L6-v2")
        with open(INDEX_PATH, "r", encoding="utf-8") as f:
            _index = [json.loads(line) for line in f if line.strip()]
    except Exception as e:
        logger.warning("Failed to load GameTileNet index: %s", e)
        _index = []
        _warned_missing = True
        return False

    if not _index:
        logger.info("GameTileNet index is empty, sticker fallback disabled")
        return False

    return True


def _cosine_sim(a: list[float], b: list[float]) -> float:
    from scipy.spatial.distance import cosine
    return float(1 - cosine(a, b))


def query_nearest_tiles(word: str, top_k: int = 1) -> list[dict]:
    """
    Return the nearest GameTileNet tile(s) for a word, with metadata.

    Each result dict has: url_path, image_path, detailed_name, group, supercategory,
    affordance, score. Returns [] if word is empty, index/assets missing, or no entries.
    """
    if not (word or "").strip():
        return []

    if not _ensure_loaded() or not _index:
        return []

    query_vec = _model.encode((word or "").strip(), show_progress_bar=False)
    if hasattr(query_vec, "tolist"):
        query_vec = query_vec.tolist()

    results = []
    for obj in _index:
        emb = obj.get("embedding") or {}
        sim_name = _cosine_sim(query_vec, emb.get("detailed_name") or [])
        sim_group = _cosine_sim(query_vec, emb.get("group") or []) if emb.get("group") else 0.0
        sim_super = _cosine_sim(query_vec, emb.get("supercategory") or []) if emb.get("supercategory") else 0.0
        sim_afford = _cosine_sim(query_vec, emb.get("affordance") or []) if emb.get("affordance") else 0.0
        total = 0.4 * sim_name + 0.3 * sim_group + 0.2 * sim_super + 0.1 * sim_afford
        results.append((total, obj))

    results.sort(reverse=True, key=lambda x: x[0])
    out = []
    for score, obj in results[: max(1, top_k)]:
        image_path = (obj.get("image_path") or "").strip()
        if not image_path:
            continue
        path = image_path.lstrip("/")
        out.append({
            "url_path": f"{URL_PREFIX}/{path}",
            "image_path": image_path,
            "detailed_name": obj.get("detailed_name") or "",
            "group": obj.get("group") or [],
            "supercategory": obj.get("supercategory") or [],
            "affordance": obj.get("affordance") or [],
            "score": round(score, 4),
        })
    return out


def get_best_sticker_gametilenet(prompt: str, limit: int = 1) -> str | None:
    """
    Return the best-matching GameTileNet sticker URL path for the prompt.

    Uses weighted cosine similarity over detailed_name, group, supercategory, affordance
    (same weights as Generation_3_query_for_match.py). Returns None if prompt is empty,
    index/assets missing, or no entries.
    """
    matches = query_nearest_tiles(prompt, top_k=max(1, limit))
    return matches[0]["url_path"] if matches else None
