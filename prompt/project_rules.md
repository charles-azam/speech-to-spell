# Project rules — preprompt for dev (vibe)

**Used by Cursor/vibe:** This file is mirrored in `.cursor/rules/project-rules.mdc` so Cursor always applies it. Keep both in sync when editing. To push to vibe-rules store: `vibe-rules save speech-to-spell-dev -f prompt/project_rules.md -d "Env and dev rules"` then `vibe-rules load speech-to-spell-dev cursor`.

## Environment (dev)

- **Env file**: Create a `.env` at the **repository root** (same level as `pyproject.toml`). Do not commit it; it is in `.gitignore`.
- **Required variable**:
  - `MISTRAL_API_KEY` — Mistral API key for Voxtral (speech-to-text) and Ministral (spell interpretation). Used in `src/speech_to_spell/spell.py`, `src/speech_to_spell/voice.py`, and tests. Get a key from [Mistral Console](https://console.mistral.ai/).
- **Loading**: Backend loads via `python-dotenv` from repo root in `src/speech_to_spell/main.py`; scripts/tests under repo root should use `load_dotenv(Path(__file__).resolve().parent / ".env")` or the repo root path so `.env` is found.
- **Conventions**:
  - Never hardcode API keys; always read from `os.environ` (or a thin config layer).
  - For new services (e.g. ElevenLabs), add the env var name and a one-line description here and to any `.env.example` if we add one.

## Quick dev checklist

1. Copy or create `.env` at repo root with `MISTRAL_API_KEY=...`.
2. Backend: `uv run speech-to-spell` or `uv run uvicorn speech_to_spell.main:app --reload`.
3. Frontend: run from `frontend/` (e.g. `npm run dev`).
