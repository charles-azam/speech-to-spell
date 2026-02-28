"""Unit and integration tests for Klipy sticker (and GIF) API."""

import os
from pathlib import Path
from unittest.mock import patch

import pytest
import requests

from graphics_factory.gif_fetch.tool import get_best_sticker, get_sticker_list

TEST_ROOT = Path(__file__).resolve().parents[1]
OUTPUT_TEST_DIR = TEST_ROOT / "output_test"


def _klipy_sticker_response(*urls: str) -> dict:
    items = [
        {"file": {"md": {"gif": {"url": u}, "png": {"url": u}}}}
        for u in urls
    ]
    return {"data": {"data": items, "current_page": 1, "per_page": len(items), "has_next": False}}


class TestGetStickerList:
    @patch("graphics_factory.gif_fetch.tool.requests.get")
    def test_returns_list_when_api_returns_results(self, mock_get):
        mock_get.return_value.status_code = 200
        mock_get.return_value.raise_for_status = lambda: None
        mock_get.return_value.json.return_value = _klipy_sticker_response(
            "https://static.klipy.com/sticker1.gif",
            "https://static.klipy.com/sticker2.gif",
        )
        with patch.dict(os.environ, {"KLIPY_API_KEY": "test-key"}, clear=False):
            result = get_sticker_list("fireball", limit=2)
        assert result == [
            "https://static.klipy.com/sticker1.gif",
            "https://static.klipy.com/sticker2.gif",
        ]
        mock_get.assert_called_once()
        assert "stickers/search" in mock_get.call_args[0][0]
        assert mock_get.call_args[1]["params"]["q"] == "fireball"

    @patch("graphics_factory.gif_fetch.tool.requests.get")
    def test_returns_empty_list_when_no_api_key(self, mock_get):
        with patch.dict(os.environ, {"KLIPY_API_KEY": ""}, clear=False):
            result = get_sticker_list("fireball")
        assert result == []
        mock_get.assert_not_called()

    def test_returns_empty_list_for_empty_prompt(self):
        assert get_sticker_list("") == []
        assert get_sticker_list("   ") == []


class TestGetBestSticker:
    @patch("graphics_factory.gif_fetch.tool.requests.get")
    def test_returns_first_url(self, mock_get):
        mock_get.return_value.status_code = 200
        mock_get.return_value.raise_for_status = lambda: None
        mock_get.return_value.json.return_value = _klipy_sticker_response(
            "https://static.klipy.com/first.gif",
            "https://static.klipy.com/second.gif",
        )
        with patch.dict(os.environ, {"KLIPY_API_KEY": "test-key"}, clear=False):
            result = get_best_sticker("magic", limit=2)
        assert result == "https://static.klipy.com/first.gif"

    @patch("graphics_factory.gif_fetch.tool.requests.get")
    def test_returns_none_when_no_results(self, mock_get):
        mock_get.return_value.status_code = 200
        mock_get.return_value.raise_for_status = lambda: None
        mock_get.return_value.json.return_value = {"data": {"data": []}}
        with patch.dict(os.environ, {"KLIPY_API_KEY": "test-key"}, clear=False):
            result = get_best_sticker("xyznonexistent")
        assert result is None

    def test_returns_none_for_empty_prompt(self):
        assert get_best_sticker("") is None
        assert get_best_sticker("   ") is None


@pytest.mark.skipif(
    not os.environ.get("KLIPY_API_KEY", "").strip(),
    reason="KLIPY_API_KEY not set",
)
def test_integration_download_first_sticker():
    """Fetch one sticker from Klipy and save to output_test/ (requires API key)."""
    urls = get_sticker_list("fireball", limit=1)
    assert urls
    OUTPUT_TEST_DIR.mkdir(parents=True, exist_ok=True)
    r = requests.get(urls[0], timeout=10)
    r.raise_for_status()
    ext = "gif" if ".gif" in urls[0].split("?")[0].lower() else "png"
    path = OUTPUT_TEST_DIR / f"first_sticker_fireball.{ext}"
    path.write_bytes(r.content)
    assert path.exists() and path.stat().st_size > 0
