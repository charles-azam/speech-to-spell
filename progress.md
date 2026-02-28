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

### Spell interpretation (single tool call)
- `src/speech_to_spell/spell.py`: single `cast_spell` tool replaces the previous 5 separate tools
  - Previous approach (5 tools: `name_spell`, `change_color`, `evaluate_spell`, `pick_sound`, `visual_effect`) was unreliable — GPT-OSS 120B often skipped `visual_effect`, resulting in no animations
  - Now one mandatory `cast_spell` tool with all fields flattened: `spell_name`, `damage`, `mana_cost`, `sound_id`, `emojis`, `template`, `primary_color`, `secondary_color`
  - Visual params (`particle_count`, `scale`, `duration_s`) derived from damage automatically — LLM doesn't need to think about them
  - `tool_choice="any"` (Mistral) / `tool_choice="auto"` (GPT-OSS) forces the LLM to always call it
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

### Configurable STT provider
- `voice.py` now supports two speech-to-text backends: **Voxtral** (Mistral) and **ElevenLabs Scribe v2**
- Controlled by `STT_PROVIDER` env var in `.env` — set to `"voxtral"` (default) or `"elevenlabs"`
- Public `transcribe()` API unchanged — `main.py` needs no modifications
- Voxtral keeps its existing retry logic for transient network errors
- ElevenLabs uses the `elevenlabs` SDK (already a dependency) with `scribe_v2` model

### Visual spell effects — template-based animation system
- `SpellEffect.tsx`: template-based particle animations with 9 templates (explosion, swirl, rain, wave_left, wave_right, shatter, pulse, spiral, rise)
- Each template generates positioned emoji particles with unique motion patterns
- CSS keyframe animations with parameterized colors/scale/duration
- Auto-cleanup after animation duration
- `WizardPanel.tsx` renders `SpellEffect`, `App.tsx` tracks `visualEffect` state per player

### Text spell input (testing bypass)
- `TextSpellInput.tsx`: text input below each wizard panel for typing spells directly
- Sends `text_spell` WebSocket message (bypasses audio capture + Voxtral STT)
- Backend handler in `main.py`: routes typed text straight to `interpret_spell()`
- **Temporary** — for rapid testing without microphone, will be removed later
- Keyboard events stopped from propagating (typing doesn't trigger push-to-talk keys)

## Not yet implemented
- **RAG asset retrieval** — Mistral Embed + Qdrant for sound/image/animation lookup (replacing enum-based pick)
- Room system (multiplayer lobby)
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

### URLs
- Game: http://localhost:5173
