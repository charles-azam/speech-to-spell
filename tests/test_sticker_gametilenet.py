"""Unit tests for GameTileNet sticker retrieval (semantic fallback)."""

from pathlib import Path
from unittest.mock import MagicMock, patch

# all-MiniLM-L6-v2 embedding dimension (used in index entries)
DIM = 384


def _make_embedding(value: float = 0.1) -> list[float]:
    return [value] * DIM


def _make_index_entry(image_path: str) -> dict:
    vec = _make_embedding(0.1)
    return {
        "image_path": image_path,
        "detailed_name": "fire",
        "group": ["fire"],
        "supercategory": ["environment"],
        "affordance": ["Environmental Object"],
        "embedding": {
            "detailed_name": vec,
            "group": vec,
            "supercategory": _make_embedding(0.2),
            "affordance": _make_embedding(0.2),
        },
    }


class TestGetBestStickerGameTileNet:
    def test_returns_none_for_empty_prompt(self):
        from graphics_factory.sticker_gametilenet import get_best_sticker_gametilenet

        assert get_best_sticker_gametilenet("") is None
        assert get_best_sticker_gametilenet("   ") is None

    def test_returns_none_when_index_missing(self):
        with patch("graphics_factory.sticker_gametilenet.INDEX_PATH", Path("/nonexistent/index.jsonl")), \
             patch("graphics_factory.sticker_gametilenet.ASSETS_DIR", Path("/nonexistent/Assets")):
            import graphics_factory.sticker_gametilenet as m
            m._index = None
            m._model = None
            m._warned_missing = False
            from graphics_factory.sticker_gametilenet import get_best_sticker_gametilenet
            assert get_best_sticker_gametilenet("fire") is None

    def test_returns_url_path_when_index_has_match(self):
        entry = _make_index_entry("004_001_complete/combined_11_15.png")
        query_vec = _make_embedding(0.1)
        mock_encode = MagicMock(return_value=query_vec)
        mock_model = MagicMock(encode=mock_encode)

        with patch("graphics_factory.sticker_gametilenet._ensure_loaded") as mock_loaded:
            def set_index_and_return_true():
                import graphics_factory.sticker_gametilenet as m
                m._index = [entry]
                m._model = mock_model
                return True
            mock_loaded.side_effect = set_index_and_return_true

            import graphics_factory.sticker_gametilenet as m
            m._index = None
            m._model = None
            from graphics_factory.sticker_gametilenet import get_best_sticker_gametilenet
            result = get_best_sticker_gametilenet("fire", limit=1)

        assert result == "/stickers/gametilenet/004_001_complete/combined_11_15.png"

    def test_returns_none_when_index_empty(self):
        with patch("graphics_factory.sticker_gametilenet._ensure_loaded") as mock_loaded:
            def set_empty_and_return_true():
                import graphics_factory.sticker_gametilenet as m
                m._index = []
                m._model = MagicMock()
                return True
            mock_loaded.side_effect = set_empty_and_return_true

            import graphics_factory.sticker_gametilenet as m
            m._index = None
            m._model = None
            from graphics_factory.sticker_gametilenet import get_best_sticker_gametilenet
            result = get_best_sticker_gametilenet("fire")
        assert result is None
