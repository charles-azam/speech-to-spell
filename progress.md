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
- `src/speech_to_spell/spell.py`: Ministral 8B with four tools:
  - `name_spell(name)` — gives the spell a dramatic name
  - `change_color(color)` — picks a CSS color matching the spell's element
  - `evaluate_spell(damage, mana_cost)` — judges spell power (1-50 dmg, 5-40 mana)
  - `pick_sound(sound_id)` — picks a sound from the pre-generated bank
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

## Not yet implemented
- **RAG asset retrieval** — Mistral Embed + Qdrant for sound/image/animation lookup (replacing enum-based pick)
- Room system (multiplayer lobby)
- Visual spell effects (emoji particles, CSS animations, screen shake)
- ElevenLabs commentator (TTS narration)
- VAD (Silero) — currently using push-to-talk which is fine for turn-based

## How to run
```bash
# Generate sound bank (one-time, needs ELEVENLABS_API_KEY in .env)
uv run python scripts/generate_sounds.py

# Backend
uv run uvicorn speech_to_spell.main:app --reload

# Frontend (in another terminal)
cd frontend && npm run dev
```
