# Speech to Spell — Progress

## Done

### Project scaffolding
- UV project at root with `pyproject.toml`, Python 3.13
- Dependencies: fastapi, uvicorn, websockets, mistralai, python-dotenv, elevenlabs
- Frontend: Vite + React + TypeScript + Tailwind CSS
- Vite proxy configured (WebSocket `/ws` → backend port 8000)

### Backend — Voice pipeline
- `src/speech_to_spell/voice.py`: Voxtral transcription via Mistral SDK (`voxtral-mini-latest`)
- ElevenLabs Scribe v2 as alternative STT provider (`STT_PROVIDER` env var)
- Retry logic for transient network errors

### Backend — Emoji hand system
- `src/speech_to_spell/game.py`: ~200 emoji bank (animals, nature, food, objects, fantasy, symbols, space)
- `deal_hand()`: deals 10 random emojis per player
- `consume_and_refill()`: removes used emojis, instantly refills to 10 — no scarcity, emojis are a creative tool
- `create_game()`: factory function that deals hands on creation
- `PlayerState` now has `emoji_hand: list[str]`, no more mana
- `GameState` tracks game state (no turn enforcement — free-form casting)

### Backend — Judge system (YES/NO/EXPLAIN)
- `src/speech_to_spell/spell.py`: complete rewrite with `judge_spell` tool
- Three verdicts: YES (spell accepted, effects applied), NO (spell rejected), EXPLAIN (second chance)
- `JudgeVerdict` return type with verdict, comment, spell_name, damage, sound_id, visual_effect
- French theatrical judge personality with varied, funny comments
- Evaluates coherence between selected emojis and spoken incantation
- Rewards creativity, punishes spam/repetition
- `interpret_spell()` now accepts `selected_emojis`, `target`, `transcription`, `game_context`, `explanation`

### Backend — New message protocol + EXPLAIN flow
- `src/speech_to_spell/main.py`: complete rewrite
- New `cast_spell` message: player sends selected emojis + target + audio/text
- New `explain_spell` message: player sends explanation after EXPLAIN verdict
- New `judge_verdict` server message: verdict + French comment + spell effects
- Emoji validation: checks emojis are in player's hand, minimum 2 selected
- Turn validation: only the active player can cast
- EXPLAIN flow: stores pending spell context, waits for explanation, re-evaluates (YES/NO only, no infinite loop)
- Emojis consumed regardless of verdict
- `game_state` now includes `emoji_hand` per player and `current_turn`
- `apply_spell()` supports both attack (damage opponent) and heal (heal self, capped at MAX_HEALTH)
- Mana system completely removed — only HP bars

### Frontend — Free-form casting (no turns)
- `App.tsx`: rewritten for simultaneous free-form play — no turn enforcement
- Both players see their emoji hand, target selector, and text input at all times
- Per-player independent state: each player has their own selected emojis, target, and explain phase
- Push-to-talk Q/P keys: hold Q (left player) or P (right player) to record, release to send
- Mic selector dropdown per player for same-computer play (only shown when >1 device)
- Per-player EXPLAIN flow: only the player who got EXPLAIN needs to respond
- Emojis cleared after verdict (4s delay), other player unaffected
- Screen shake on big damage (≥20)
- `WizardPanel.tsx`: always full opacity, no dimming, shows push-to-talk key indicator
- `game.py`: `current_turn` removed from `GameState`, no turn switching in `apply_spell()`
- `main.py`: turn guards removed — any player can cast anytime
- Attack/heal buttons removed — the LLM judge decides from the incantation whether it's an attack or heal
- `spell.py`: `target` field added to judge tool; judge infers attack vs heal from emojis + incantation
- Fixed HP bug: old code had `target == "self"` vs `target == "heal"` mismatch, heals never registered correctly

### Frontend — New components
- **`EmojiHand.tsx`**: flex-wrap grid of clickable emoji cards with glow + scale on selection, "X selected (min 2)" counter
- **`TargetSelector.tsx`**: attack (red sword) / heal (green heart) toggle buttons
- **`JudgePanel.tsx`**: center panel with judge character (⚖️), speech bubble with typewriter effect, verdict stamp animation (scale overshoot + slam), three distinct animations per verdict (nod/shake/eyebrow raise), thinking animation when waiting
- **`AmbientSparkles.tsx`**: 20 floating purple sparkle particles with CSS animations (decorative background)

### Frontend — Wizard school theme
- Dark purple gradient background with subtle radial spots
- Cinzel fantasy font for headings (Google Fonts)
- Magic wand SVG cursor (`frontend/public/wand-cursor.svg`)
- Page title: "Speech to Spell"
- Judge animations: idle bob, thinking sway, nod (YES), head shake (NO), eyebrow raise (EXPLAIN)
- Verdict stamp: scale overshoot + slam CSS animation
- Turn glow: pulsing purple shadow on active player panel
- Record button pulse animation

### Sound effects — pre-generated bank
- 25 sounds: fireball, ice, thunder, dark, nature, water_splash, wind_howl, earthquake, healing, poison, ghost, metal_clash, explosion_big, arcane, animal_roar, teleport, freeze, fire_crackle, choir, swarm, laughter, cosmic, shield, blood, time
- Generated offline via `scripts/generate_sounds.py` (ElevenLabs API)
- Instant lookup at runtime

### Visual spell effects — template-based animation system
- `SpellEffect.tsx`: 9 templates (explosion, swirl, rain, wave_left, wave_right, shatter, pulse, spiral, rise)
- CSS keyframe animations with parameterized colors/scale/duration
- Auto-cleanup after animation duration

### Configurable STT provider
- Voxtral (default) or ElevenLabs Scribe v2 via `STT_PROVIDER` env var

### Text spell input (testing bypass)
- `TextSpellInput.tsx`: type spells directly, bypasses audio capture + STT
- Now works with the new emoji hand system (requires emoji selection first)

### Room system — multiplayer over network
- `src/speech_to_spell/room.py`: room models (Room, PlayerInfo, PendingExplanation) + module-level registry
  - `generate_room_code()`: unique 4-letter uppercase codes
  - `create_room()` / `join_room()` / `fill_both_sides()`: room lifecycle
  - `register_ws()` / `unregister_ws()` / `get_room_websockets()`: WebSocket tracking per room
  - `cleanup_stale_rooms()`: removes rooms older than 1h
- `main.py` refactored:
  - REST endpoints: `POST /api/rooms` (create), `POST /api/rooms/{code}/join`, `GET /api/rooms/{code}`
  - WebSocket endpoint changed from `/ws` to `/ws/{room_code}?side=left|right|both`
  - Game state moved from local variable to `Room` model
  - All `send_*` functions replaced with `broadcast_*` — sends to every WS in the room
  - `side=both` for same-computer (1 tab, both panels, Q/P push-to-talk)
  - `side=left|right` for multi-computer (1 tab per player, spacebar PTT)
  - Hand filtering: remote players don't see opponent's emoji hand
  - `player_joined` / `player_disconnected` messages for connection awareness
  - Background task: periodic room cleanup every 5 minutes
  - CORS configurable via `ALLOWED_ORIGINS` env var

### Frontend — Lobby + Room Router
- `GameRouter.tsx`: state machine (lobby → waiting → game) replaces direct `App` render
  - Polls for opponent joining in waiting phase
  - Routes to `App` (same-computer) or `RemoteGameView` (multi-computer)
- `Lobby.tsx`: wizard name input, game mode toggle (same/different computer), create room, join room with code
- `WaitingRoom.tsx`: shows room code (big, clickable to copy), waiting animation, cancel button
- `RemoteGameView.tsx`: single-player view for multi-computer mode
  - Shows own wizard (full: emoji hand, controls, transcription) + opponent (health bar only, no emoji hand)
  - Spacebar push-to-talk (instead of Q/P)
  - Handles `player_joined` / `player_disconnected` messages
- `config.ts`: `API_BASE` from `VITE_API_URL` env var (empty in dev, set in production)
- `useWebSocket.ts` updated: accepts `roomCode` + `side` params, builds URL accordingly
- `App.tsx` updated: accepts `roomCode` prop for same-computer mode
- `types.ts` updated: `PlayerJoinedMessage`, `PlayerDisconnectedMessage` added to `ServerMessage` union

### Deployment-ready
- Backend: configurable CORS via `ALLOWED_ORIGINS` env var
- Frontend: `VITE_API_URL` env var for pointing at production backend
- Ready for: Cloudflare Pages (frontend) + Hetzner VPS with systemd + nginx (backend)

### Bug fixes & polish pass (post-room-system)

#### Bugs fixed
- **Duplicate emojis in hand**: removed duplicate `🧿` from EMOJI_BANK; `consume_and_refill()` now filters out emojis already in remaining hand before sampling
- **pending_explanation race condition**: changed from single `pending_explanation` slot to `pending_explanations: dict[str, PendingExplanation]` keyed by player side — both players can have pending explanations simultaneously
- **Eager LLM client init**: `spell.py` and `voice.py` now use lazy singleton getters (`_get_mistral_client()`, etc.) — modules import without API keys, clients created on first use
- **broadcast_to_room crash propagation**: each `ws.send_text()` wrapped in error handling, dead sockets are logged and unregistered without affecting other clients
- **Spell fizzle not broadcast**: all spell fizzle messages now broadcast to room (both players see when a spell fails), not just unicast to caster
- **broadcast_game_state robustness**: same error handling pattern as broadcast_to_room

#### Game balance
- **Damage range reduced**: 1-50 → 1-30 (creative=15-30, classic=5-15, mediocre=1-5), games now last 4-8 turns instead of 2
- **Screen shake threshold**: lowered from ≥20 to ≥15 to match new range
- **Visual params rescaled**: particle count, scale, duration use 30 as divisor

#### Code quality — Frontend refactor
- **`useGameState.ts` hook**: centralized game state via `useReducer` — handles all `ServerMessage` types, side-effect timeouts for screen shake/visual/spell cleanup
- **`PlayerControls.tsx`**: extracted reusable component (EmojiHand + MicSelector + TextSpellInput + explain prompt)
- **`SpellHistory.tsx`**: scrollable list of cast spell names (most recent first, fading opacity)
- **`App.tsx` rewritten**: uses `useGameState` + `PlayerControls` + `SpellHistory`, ~170 lines (was ~420)
- **`RemoteGameView.tsx` rewritten**: same hooks, ~210 lines (was ~390)
- **Total duplication eliminated**: ~800 lines → ~380 lines with shared hooks/components

#### New features
- **Spell history UI**: server now includes `spells_cast` in game_state broadcast; `SpellHistory` component shows cast spells below health bar
- **WebSocket reconnection**: exponential backoff (1s→2s→4s→...→30s cap), max 20 retries, auto-reset on success
- **Sound bank expanded**: 5 → 25 sounds (water_splash, wind_howl, earthquake, healing, poison, ghost, metal_clash, explosion_big, arcane, animal_roar, teleport, freeze, fire_crackle, choir, swarm, laughter, cosmic, shield, blood, time)
- **ExplainSpellMessage now includes `player` field**: frontend sends which player is explaining, fixing the per-player EXPLAIN flow

### Deployment — Docker + nginx + Cloudflare
- `Dockerfile`: installs uv, syncs deps from lockfile, copies source + sounds_cache, runs uvicorn on 0.0.0.0:8000
- `docker-compose.yml`: backend service (Dockerfile + .env) + nginx:alpine reverse proxy (port 80)
- `deploy/nginx.conf`: proxies `/ws/` with WebSocket upgrade headers (86400s timeout), `/api/` and `/health` to backend
- `deploy/setup.sh`: one-time VPS setup script (installs Docker, clones repo)
- `.dockerignore`: excludes .venv, frontend, .git, node_modules, .env
- `main.py`: added `load_dotenv()` so .env is loaded in production
- **Architecture**: Cloudflare Pages (frontend) + Hetzner VPS (backend via Docker) + Cloudflare DNS proxy (SSL termination)
- **Backend redeploy**: `git pull && docker compose up -d --build`

## Not yet implemented
- **RAG asset retrieval** — Mistral Embed + Qdrant for sound/image/animation lookup
- **ElevenLabs judge voice** — TTS the French comment
- **Commentator** — separate LLM-generated play-by-play with different voice
- **VAD (Silero)** — not needed for turn-based

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
