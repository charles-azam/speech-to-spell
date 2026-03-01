# Speech to Spell — Progress

## Done

### Project scaffolding
- UV project at root with `pyproject.toml`, Python 3.13
- Dependencies: fastapi, uvicorn, websockets, mistralai, python-dotenv, elevenlabs
- Frontend: Vite + React + TypeScript + Tailwind CSS
- Vite proxy configured (WebSocket `/ws` → backend port 8000)

### Backend — Voice pipeline
- `src/speech_to_spell/voice.py`: Voxtral transcription via Mistral SDK (`voxtral-mini-latest`)
- `src/speech_to_spell/main.py`: FastAPI app with WebSocket endpoint
  - Receives base64 audio from client
  - Sends to Voxtral for transcription
  - Returns transcription text via WebSocket

### Frontend — Push-to-talk UI
- Two wizard panels (left/right) with push-to-talk keys (Q / P)
- `useMicrophone` hook: captures audio via MediaRecorder (webm/opus)
- `useWebSocket` hook: connects to backend, sends audio, receives transcriptions
- Visual feedback: recording indicator (animated dots), "Transcribing..." state, transcription display
- Dark wizard-duel aesthetic with Tailwind
- Per-player microphone selection (dropdown per player, device enumeration)

### Ministral spell interpretation (tool calling)
- `src/speech_to_spell/spell.py`: Ministral 8B with five tools:
  - `name_spell(name)` — gives the spell a dramatic name
  - `change_color(color)` — picks a CSS color matching the spell's element
  - `evaluate_spell(damage, mana_cost)` — judges spell power (1-50 dmg, 5-40 mana)
  - `pick_sound(sound_id)` — picks a sound from the pre-generated bank
  - `pick_emojis(emojis)` — picks 1-3 emojis for particle burst effect
- Tools are **not mandatory** — LLM decides which are relevant per spell
- LLM receives full game context (HP, mana, recent spells) to make balance decisions

### Sound effects — pre-generated bank
- **Approach changed**: real-time ElevenLabs generation was too slow (3-5s). Now using a **pre-generated sound bank** with instant lookup.
- `scripts/generate_sounds.py`: generates sounds via ElevenLabs API and saves `.mp3` + `.json` metadata
- 5 sounds generated: fireball, ice, thunder, dark, nature
- `src/speech_to_spell/sound.py`: loads sounds by ID from `sounds_cache/`, provides descriptions for LLM prompt
- LLM picks the closest sound via `pick_sound` tool (enum of available IDs)
- Toggle `ENABLE_SOUND_EFFECTS` in `main.py` to disable
- **Future**: scale to ~200 sounds, embed with Mistral Embed, store in Qdrant, RAG retrieval instead of enum

### Game state & mechanics
- `src/speech_to_spell/game.py`: GameState with HP/mana per player, turn tracking, win condition
- Mana deducted from caster; if insufficient mana, damage scales down proportionally
- Server tracks state per WebSocket session, sends `game_state` messages after each spell
- Frontend: animated health (red) and mana (blue) bars on each wizard panel
- Winner banner when a player reaches 0 HP

### Emoji particle burst (visual spell effects)
- `frontend/src/components/EmojiParticles.tsx`: particle burst component
  - LLM picks 1-3 emojis per spell via `pick_emojis` tool (free-form, no enum)
  - 30 particles spawn on the target's panel with random positions, sizes, delays, drift, and rotation
  - CSS `@keyframes` animation: fall from top to bottom over 2s, fade out at end
  - Glow tint from spell color via `drop-shadow` filter
  - Auto-cleans up after 2.5s
- Emojis sent in `spell_result` WebSocket message and rendered on the target side

### Configurable STT provider
- `voice.py` now supports two speech-to-text backends: **Voxtral** (Mistral) and **ElevenLabs Scribe v2**
- Controlled by `STT_PROVIDER` env var in `.env` — set to `"voxtral"` (default) or `"elevenlabs"`
- Public `transcribe()` API unchanged — `main.py` needs no modifications
- Voxtral keeps its existing retry logic for transient network errors
- ElevenLabs uses the `elevenlabs` SDK (already a dependency) with `scribe_v2` model

### Klipy API (stickers and GIFs by prompt)
- **graphics_factory/gif_fetch/tool.py**: Klipy only; `load_dotenv()`, `KLIPY_API_KEY` in .env
  - **Stickers**: `get_sticker_list(prompt, limit)`, `get_best_sticker(prompt, limit)`
  - **GIFs**: `get_gif_list(prompt, limit)`, `get_best_gif(prompt, limit)`
- **scripts/get_sticker.py**: CLI — `.venv/bin/python scripts/get_sticker.py [prompt]` prints first sticker URL
- **Backend**: `main.py` sends `sticker_url` in `spell_result` (from `get_best_sticker`)
- **Tests**: `tests/test_sticker_fetch.py` — unit tests (mocked) + one integration test (downloads one sticker to `output_test/` when `KLIPY_API_KEY` is set)

### GameTileNet sticker fallback
- When Klipy is not configured or returns no result, **GameTileNet** is used as a local semantic sticker source.
- **graphics_factory/sticker_gametilenet.py**: loads `2024-GameTileNet/object_embedding_index.jsonl`, embeds the spell name with `all-MiniLM-L6-v2` (via optional dep `sentence-transformers`), and returns the best-matching asset as a URL path (e.g. `/stickers/gametilenet/004_001_complete/combined_11_15.png`). Weighted cosine similarity over detailed_name, group, supercategory, affordance (same as GameTileNet’s Narrative2Scene query script).
- **Backend**: `main.py` mounts `2024-GameTileNet/DataAndAnnotations/Assets` at `/stickers/gametilenet` (only if that directory exists). Sticker resolution: try Klipy first; if no URL, call `get_best_sticker_gametilenet(spell.spell_name)`.
- **Optional dependency**: install with `uv sync --extra gametilenet` to enable the GameTileNet fallback (pulls `sentence-transformers`). **Not installable on macOS Intel (x86_64) with Python 3.13**: PyTorch does not ship wheels for that platform; use an ARM Mac, Linux, Windows, or Python 3.11 to use the gametilenet extra.
- **Tests**: `tests/test_sticker_gametilenet.py` — unit tests (mocked index/model) for empty prompt, missing index, successful match, empty index.
- **Frontend**: `SpellResultMessage` in `frontend/src/types.ts` includes optional `sticker_url` for displaying the sticker when present.
- **Nearest tile from a word**: `graphics_factory/sticker_gametilenet.py` exposes `query_nearest_tiles(word, top_k=1)` returning a list of dicts with `url_path`, `image_path`, `detailed_name`, `group`, `supercategory`, `affordance`, `score`. CLI: `uv run python scripts/get_nearest_tile.py <word>` (optional `-n/--top` and `-v/--verbose`).

### nyuuzyou/stickers dataset (Hugging Face)
- **scripts/pull_stickers_dataset.py**: pulls [nyuuzyou/stickers](https://huggingface.co/datasets/nyuuzyou/stickers) via `huggingface_hub`
  - Default: `examples/` only (~1 MB). Optional `--val` adds `dataset_resized/val.zip` (128×128, ~741 MB)
  - Output: `data/stickers/` (gitignored)
- **docs/STICKERS_DATASET.md**: dataset layout (zips, splits, class = emoji Unicode), pull commands, and ideas for game use (subset by semantic class, RAG over class names)

## Not yet implemented
- **RAG asset retrieval** — Mistral Embed + Qdrant for sound/image/animation lookup (replacing enum-based pick)
- Room system (multiplayer lobby)
- Visual spell effects (CSS animations, screen shake)
- ElevenLabs commentator (TTS narration)
- VAD (Silero) — currently using push-to-talk which is fine for turn-based

## How to run

Use the project’s `.venv` (create/sync with `uv sync`, then use its binaries):

```bash
# Create/update .venv and install dependencies
uv sync

# Generate sound bank (one-time, needs ELEVENLABS_API_KEY in .env)
.venv/bin/python scripts/generate_sounds.py

# Optional: get first sticker URL for a prompt (needs KLIPY_API_KEY in .env)
.venv/bin/python scripts/get_sticker.py "fireball spell"

# Backend
.venv/bin/uvicorn speech_to_spell.main:app --reload

# Frontend (in another terminal)
cd frontend && npm run dev
```

Alternatively, use `uv run`: `uv run python scripts/get_sticker.py "fireball spell"` and `uv run uvicorn speech_to_spell.main:app --reload`.
