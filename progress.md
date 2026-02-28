# Speech to Spell — Progress

## Done

### Project scaffolding
- UV project at root with `pyproject.toml`, Python 3.13
- Dependencies: fastapi, uvicorn, websockets, mistralai, python-dotenv
- Frontend: Vite + React + TypeScript + Tailwind CSS
- Vite proxy configured (WebSocket `/ws` → backend port 8000)

### Backend — Voice pipeline (minimal)
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

### Ministral spell interpretation (tool calling)
- `src/speech_to_spell/spell.py`: Ministral 8B with three tools:
  - `name_spell(name)` — gives the spell a dramatic name
  - `change_color(color)` — picks a CSS color matching the spell's element
  - `evaluate_spell(damage, mana_cost)` — judges spell power (1-50 dmg, 5-40 mana)
- LLM receives full game context (HP, mana, recent spells) to make balance decisions
- Pipeline: Voxtral transcription → Ministral tool calls → spell name + color + damage/mana sent to frontend
- Frontend applies color tint (border, glow, background) to the **target** wizard's panel
- Spell name displayed as an overlay on the **caster**'s panel
- Per-player microphone selection (dropdown per player, device enumeration)

### Game state & mechanics
- `src/speech_to_spell/game.py`: GameState with HP/mana per player, turn tracking, win condition
- Mana deducted from caster; if insufficient mana, damage scales down proportionally
- Server tracks state per WebSocket session, sends `game_state` messages after each spell
- Frontend: animated health (red) and mana (blue) bars on each wizard panel
- Winner banner when a player reaches 0 HP

## Not yet implemented
- Room system (multiplayer lobby)
- Visual spell effects (emoji particles, CSS animations, screen shake)
- ElevenLabs commentator
- Sound effects
- VAD (Silero) — currently using push-to-talk which is fine for turn-based

## How to run
```bash
# Backend
uv run uvicorn speech_to_spell.main:app --reload

# Frontend (in another terminal)
cd frontend && npm run dev
```
