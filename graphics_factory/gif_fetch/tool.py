"""
Klipy API: stickers and GIFs by prompt.

Requires KLIPY_API_KEY in .env (load_dotenv). See https://docs.klipy.com.
"""

import os
from typing import List

import requests

try:
    from dotenv import load_dotenv
    load_dotenv()
except Exception:
    pass

KLIPY_GIF_SEARCH = "https://api.klipy.com/api/v1/{key}/gifs/search"
KLIPY_STICKER_SEARCH = "https://api.klipy.com/api/v1/{key}/stickers/search"


def get_sticker_list(prompt: str, limit: int = 10) -> List[str]:
    """
    Return a list of sticker image URLs for the given prompt (first = best match).

    Args:
        prompt: Search query (e.g. "fireball spell", "wizard").
        limit: Max results (per_page).

    Returns:
        List of sticker URLs; empty if no key, no results, or error.
    """
    if not (prompt or "").strip():
        return []
    return _klipy_sticker_search((prompt or "").strip(), limit)


def get_best_sticker(prompt: str, limit: int = 1) -> str | None:
    """Return the best sticker URL for the prompt (first of the search list)."""
    urls = get_sticker_list(prompt, limit=max(1, limit))
    return urls[0] if urls else None


def get_gif_list(prompt: str, limit: int = 10) -> List[str]:
    """
    Return a list of GIF URLs for the given prompt (Klipy; first = best match).

    Args:
        prompt: Search query.
        limit: Max results (per_page).

    Returns:
        List of GIF URLs; empty if no key, no results, or error.
    """
    if not (prompt or "").strip():
        return []
    return _klipy_gif_search((prompt or "").strip(), limit)


def get_best_gif(prompt: str, limit: int = 1) -> str | None:
    """Return the best GIF URL for the prompt (first of the search list)."""
    urls = get_gif_list(prompt, limit=max(1, limit))
    return urls[0] if urls else None


def _klipy_sticker_search(q: str, limit: int) -> List[str]:
    key = os.environ.get("KLIPY_API_KEY", "").strip()
    if not key:
        return []
    url = KLIPY_STICKER_SEARCH.format(key=key)
    params = {"q": q, "per_page": max(1, min(50, limit))}
    try:
        r = requests.get(url, params=params, timeout=10)
        r.raise_for_status()
        data = r.json()
    except Exception:
        return []
    inner = data.get("data") or {}
    results = inner.get("data") if isinstance(inner, dict) else []
    if not results or not isinstance(results, list):
        return []
    return _parse_klipy_media_items(results, limit)[:limit]


def _klipy_gif_search(q: str, limit: int) -> List[str]:
    key = os.environ.get("KLIPY_API_KEY", "").strip()
    if not key:
        return []
    url = KLIPY_GIF_SEARCH.format(key=key)
    params = {"q": q, "per_page": max(1, min(50, limit))}
    try:
        r = requests.get(url, params=params, timeout=10)
        r.raise_for_status()
        data = r.json()
    except Exception:
        return []
    inner = data.get("data") or {}
    results = inner.get("data") if isinstance(inner, dict) else []
    if not results or not isinstance(results, list):
        return []
    return _parse_klipy_media_items(results, limit, prefer_formats=("gif",))[:limit]


def _parse_klipy_media_items(
    results: list, limit: int, prefer_formats: tuple = ("gif", "png", "webp")
) -> List[str]:
    """Parse Klipy items: item['file'] = { 'md': { 'gif': { 'url': ... } }, ... }."""
    out: List[str] = []
    for item in results:
        if not isinstance(item, dict):
            continue
        url = None
        file_obj = item.get("file") or item.get("files") or {}
        if isinstance(file_obj, dict):
            for size_key in ("md", "hd", "sm", "xs"):
                size = file_obj.get(size_key)
                if not isinstance(size, dict):
                    continue
                for fmt in prefer_formats:
                    fmt_obj = size.get(fmt)
                    if isinstance(fmt_obj, dict) and (fmt_obj.get("url") or "").strip():
                        url = (fmt_obj["url"] or "").strip()
                        break
                if url:
                    break
        if not url:
            url = (item.get("url") or "").strip()
        if url and url.startswith("http"):
            out.append(url)
    return out[:limit]
