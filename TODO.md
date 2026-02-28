this was the original prompt: I want you to initialise this project and make the first important features in order to get as fast as possible to a first working version well organised on which we can iterate      

I want you to initialise this project and make the first important features in order to get as fast as possible to a first working version well organised on which we    
  can iterate      

Here is the great plan that came out:
# Speech to Spell — MVP Implementation Plan

## Context

Empty repo (only CLAUDE.md, .env with Mistral key, .gitignore). Goal: get to a playable first version as fast as possible — same-computer turn-based wizard duel where two players take turns casting spells by voice.

Core loop: **speak → transcribe (Voxtral) → interpret (Ministral) → apply damage → show effects → next turn**.

## Architecture

```
/root/hackathon/
├── backend/
│   ├── requirements.txt
│   └── app/
│       ├── __init__.py
│       ├── main.py       # FastAPI + WebSocket handler
│       ├── game.py        # GameState, Player, room management
│       ├── spell.py       # Ministral spell interpretation
│       └── voice.py       # Voxtral transcription
└── frontend/
    ├── package.json
    ├── vite.config.ts
    ├── index.html
    └── src/
        ├── main.tsx
        ├── App.tsx
        ├── hooks/useGame.ts
        ├── screens/LobbyScreen.tsx
        ├── screens/GameScreen.tsx
        ├── components/VoiceCapture.tsx
        ├── components/PlayerPanel.tsx
        ├── components/SpellLog.tsx
        ├── components/Arena.tsx
        ├── effects/SpellEffects.tsx   # all effects in one file
        ├── utils/audio.ts             # encodeWAV helper
        └── styles/game.css
```

Single WebSocket per player: binary messages = audio, JSON text = game commands.

Two browser tabs on the same machine, each joining the same room code. Simpler than single-tab (each tab has its own state, mic only active on your turn).

## Phases

### Phase 1: Project Scaffold (~10 min)
Create both projects so they run independently.

**Backend files:**
- `backend/requirements.txt` — fastapi, uvicorn[standard], mistralai, python-dotenv, python-multipart, websockets
- `backend/app/__init__.py` — empty
- `backend/app/main.py` — FastAPI app with CORS, `/health` endpoint

**Frontend files:**
- `frontend/package.json` — react, react-dom, @ricky0123/vad-react, vite, @vitejs/plugin-react
- `frontend/vite.config.ts` — react plugin + proxy `/ws` to backend:8000
- `frontend/index.html` — Vite entry
- `frontend/src/main.tsx` + `frontend/src/App.tsx` — minimal React app

**Verify:** backend health endpoint returns OK, frontend shows placeholder page.

### Phase 2: WebSocket + Voice Pipeline (~30 min)
Get mic → VAD → Voxtral transcription working end-to-end.

**Backend:**
- `backend/app/voice.py` — `transcribe_audio(audio_bytes) -> str` using Voxtral via mistralai SDK
- `backend/app/main.py` — add WebSocket endpoint `/ws/{room_code}`, handle binary (audio) and JSON messages. On binary: transcribe with Voxtral, return `{ type: "transcription", text }`.

**Frontend:**
- `frontend/src/utils/audio.ts` — `encodeWAV(samples: Float32Array): ArrayBuffer` (44-byte WAV header + Int16 PCM)
- `frontend/src/components/VoiceCapture.tsx` — uses `@ricky0123/vad-react`'s `useMicVAD`, on speech end encodes WAV and sends binary over WebSocket
- `frontend/src/App.tsx` — connect WebSocket, show VoiceCapture, display transcription results

**Verify:** speak into mic → see transcribed text on screen.

### Phase 3: Spell Interpretation (~20 min)
Ministral analyzes transcribed text, returns structured spell effects.

**Backend:**
- `backend/app/spell.py` — `SpellResult` pydantic model (spell_name, element, damage, mana_cost, creativity_score, emojis, description, commentary, screen_shake, color_tint) + `interpret_spell()` using Ministral-8B with JSON response format
- System prompt: judges creativity (1-10), scales damage (5-40), penalizes repetition, picks emojis, writes commentator line
- Fizzled spell fallback on parse errors

**Wire in main.py:** after transcription, call `interpret_spell()`, send full `spell_result` to client.

**Verify:** speak "giant fireball" → get structured JSON with damage, emojis, commentary. Speak "fire" repeatedly → see decreasing creativity scores.

### Phase 4: Game State + Turn System (~30 min)
Full game loop with rooms, turns, HP/mana.

**Backend:**
- `backend/app/game.py` — `Player` (name, hp=100, mana=100), `GameState` (room_code, phase, players, current_turn, spell_history), `apply_spell()`, `create_game()`, `join_game()`
- Room codes: 4 random uppercase letters, stored in-memory dict
- `apply_spell()`: deduct mana, apply damage, +5 mana regen/turn, check win (hp<=0), advance turn
- If mana < spell cost: spell still fires but at reduced power

**Update main.py WebSocket handler:**
- JSON messages: `create_game`, `join_game`
- Binary messages: validate it's sender's turn, transcribe → interpret → apply → broadcast `spell_cast` + `game_state` to both players
- Track which WebSocket = which player via ConnectionManager

**WebSocket protocol:**
- Client→Server: `{ type: "create_game", player_name }`, `{ type: "join_game", room_code, player_name }`, binary audio
- Server→Client: `{ type: "game_created", room_code, game_state }`, `{ type: "player_joined", game_state }`, `{ type: "spell_cast", transcription, spell, game_state }`, `{ type: "error", message }`

**Frontend:**
- `frontend/src/hooks/useGame.ts` — manages WebSocket connection + game state, exposes createGame/joinGame/gameState/myPlayerIndex

**Verify:** two tabs create/join same room, take turns casting, HP decreases, game ends when HP=0.

### Phase 5: Game UI (~40 min)
Full visual interface: lobby, arena, effects.

**Frontend:**
- `frontend/src/screens/LobbyScreen.tsx` — create game (enter name → get room code) or join game (enter code + name). Big "SPEECH TO SPELL" title.
- `frontend/src/screens/GameScreen.tsx` — side-view layout:
  ```
  [P1 HP/Mana bars]              [P2 HP/Mana bars]
  🧙 Player1        ARENA        Player2 🧙
  [Turn indicator / voice capture]
  [Spell log]
  ```
- `frontend/src/components/PlayerPanel.tsx` — name, HP bar (green→yellow→red), mana bar (blue), "your turn" glow
- `frontend/src/components/SpellLog.tsx` — scrolling feed of spells cast with emojis + damage
- `frontend/src/components/Arena.tsx` — central effects area with wizard figures
- `frontend/src/effects/SpellEffects.tsx` — all effects in one component:
  - **Screen shake**: CSS transform with intensity variable
  - **Color tint**: full-screen overlay flash matching spell element
  - **Spell name text**: big dramatic text that slams in (scale 3→1, glow, fade)
  - **Emoji particles**: N positioned divs with emojis, float/rain animations. Count scales with creativity (10-40)
- `frontend/src/styles/game.css` — fantasy theme (parchment bg, gold accents), bar styles, effect animations
- `frontend/src/App.tsx` — routes between LobbyScreen and GameScreen based on game phase
- Game over overlay with winner announcement + play again

**Verify:** full game playable end-to-end with satisfying visual feedback. Creative spells get more spectacular effects than boring ones.

## Key Technical Details

- **Mistral SDK async**: FastAPI handlers are async but mistralai client may be sync. Use `await asyncio.to_thread()` to wrap blocking calls if needed, or use async client methods.
- **VAD assets**: `@ricky0123/vad-react` needs ONNX model files accessible. Configure via `onnxWASMBasePath` or copy to public dir. If issues, fall back to CDN paths.
- **WAV encoding**: Write custom `encodeWAV()` in `utils/audio.ts` — 30 lines, converts Float32Array@16kHz to WAV with proper headers. Don't rely on vad-web utils export which may not exist.
- **Spell repetition tracking**: pass last 6 spells in `spell_history` to Ministral so it can penalize repeats.
- **Mana floor**: if mana < 5, player can still cast but spell power is halved and commentary notes the weakness.

## Verification (End-to-End Test)

1. Start backend: `cd backend && pip install -r requirements.txt && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000`
2. Start frontend: `cd frontend && npm install && npm run dev`
3. Open tab 1: create game as "Gandalf" → get room code
4. Open tab 2: join with room code as "Merlin"
5. Both tabs show arena. Gandalf's turn — speak "tsunami of angry cats"
6. See: transcription → spell interpretation → emoji cats raining → screen shake → HP drops → turn switches
7. Merlin speaks "emotional damage" → 💔 particles → Gandalf takes damage
8. Continue until someone wins
