# Speech to Spell — Progress

## Done

### Project scaffolding
- UV project at root with `pyproject.toml`, Python 3.13
- Dependencies: fastapi, uvicorn, websockets, mistralai, python-dotenv, elevenlabs (TTS only)
- Frontend: Vite + React + TypeScript + Tailwind CSS
- Vite proxy configured (WebSocket `/ws` → backend port 8000)

### Backend — Voice pipeline
- `src/speech_to_spell/voice.py`: Voxtral transcription via Mistral SDK (`voxtral-mini-latest`)
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
- Ready for: Cloudflare Pages (frontend) + EC2 VPS with systemd + nginx (backend)

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
- **Architecture**: Cloudflare Pages (frontend) + EC2 VPS (backend via Docker) + Cloudflare DNS proxy (SSL termination)
- **Backend redeploy**: `git pull && docker compose up -d --build`

### ElevenLabs Judge Voice (TTS)
- `src/speech_to_spell/tts.py`: `text_to_speech()` using ElevenLabs `eleven_multilingual_v2` model
  - Lazy singleton client (same pattern as `voice.py`)
  - `JUDGE_VOICE_ID` env var (default: Daniel — deep dramatic voice)
- `main.py`: `broadcast_judge_voice()` generates TTS + broadcasts base64 MP3
  - On YES verdict: sound effect + judge voice broadcast in parallel via `asyncio.gather`
  - On NO verdict: judge voice only
  - On EXPLAIN verdict: judge voice broadcast before returning (player still needs to explain)
- Frontend: `JudgeVoiceMessage` type added, handled same as `sound_effect` in `useWebSocket.ts`
- Judge speaks aloud every verdict comment — French roasts are now audible

### Sports Commentator Duo (Marc & Sophie)
- `src/speech_to_spell/commentator.py`: Marc (excitable male) & Sophie (sarcastic female) commentator duo
  - LLM-driven via `ministral-8b-latest` with two tools: `marc_says` and `sophie_says`
  - System prompt defines personalities: Marc hypes big moments (French/English mix), Sophie roasts bad plays (deadpan)
  - `generate_commentary(events, left_name, right_name)` → reacts to spells
  - `generate_idle_commentary(events, left_name, right_name, idle_seconds)` → fills silence when nobody is casting
  - 1-3 lines per commentary burst, max 15 words each
- `room.py`: `event_log: list[str]`, `last_spell_at: float`, `judge_busy_until: float` on Room
- `main.py`:
  - **Spell reactions**: `run_commentary()` fires after every spell, waits for `judge_busy_until` before speaking (no overlap with judge)
  - **Idle chatter**: `idle_commentary_loop()` runs every 20s per room, triggers when silence ≥12s — commentators nag players, banter between themselves, make predictions
  - `_broadcast_commentary_lines()` shared helper: checks `judge_busy_until` before each line
  - Two ElevenLabs voices: `COMMENTATOR_MALE_VOICE_ID` (Marc) + `COMMENTATOR_FEMALE_VOICE_ID` (Sophie) via env vars
- Frontend:
  - `CommentatorVoiceMessage` with `speaker` field ("marc" | "sophie")
  - `useWebSocket.ts`: audio queue system — commentator lines play one at a time (no overlap), `playSoundAsync` waits for audio to finish, 300ms gap between lines
  - `CommentatorPanel.tsx`: shows Marc & Sophie side by side below the judge, active speaker gets glow + animated sound bars, inactive speaker dimmed
  - Wired into both `App.tsx` (same-computer) and `RemoteGameView.tsx` (multi-computer)

### TTS caching
- `tts.py`: in-memory cache keyed by `md5(voice_id:text)` — avoids redundant ElevenLabs API calls
  - Commentators often repeat similar phrases ("on s'ennuie", "allez jouez!"), cache prevents paying twice
  - Max 500 entries, FIFO eviction

### Same-computer: both players named
- `room.py`: `fill_both_sides(code, left_name, right_name)` — accepts two distinct names
- `main.py`: `CreateRoomRequest` gains `wizard_name_right: str | None`
- `Lobby.tsx`: second "Wizard Name (Right)" input shown when mode is same-computer, validated non-empty

### Voice-only spell casting (LLM emoji inference)
- Players no longer click emojis — they just speak (or type) their spell
- New `infer_emojis()` in `spell.py`: Ministral tool-calling infers which emojis from the hand match the incantation
  - `select_emojis` tool with `emojis: string[]` parameter
  - Validates LLM output against actual hand; fallback to first 2 if <2 valid
  - Supports mistral and aws providers
- Backend `main.py`: `cast_spell` and `text_spell` handlers no longer read `selected_emojis` from client message
  - After transcription, calls `infer_emojis()` server-side
  - Broadcasts new `emoji_inference` message with inferred emojis
  - `validate_emojis()` and `MIN_EMOJIS` removed
- Frontend: `EmojiHand` is now display-only (no click handlers)
  - Inferred emojis get golden glow, scale up, float; non-inferred emojis dim
  - Inferred preview pulses at bottom
- New flow: speak → transcription → emoji inference (broadcast) → judge verdict → consume & refill
- Emoji inference runs in parallel with judge eval start, hiding latency

### Wizard names everywhere
- Backend: `broadcast_game_state()` includes `wizard_name` in each side's payload (both same-computer and remote modes)
- Backend: `format_game_context()` now takes `caster_name` and `opponent_name` — judge sees actual wizard names instead of "Caster"/"Opponent"
- Frontend: `useGameState.ts` stores `wizardName` per player from `game_state` messages
- Frontend: `App.tsx` (same-computer) uses actual wizard names in panels and winner banner instead of "Wizard 1"/"Wizard 2"
- `RemoteGameView.tsx` already used `wizardName` prop — now also gets names from game_state

### Rules panel (how to play)
- New `RulesPanel.tsx` modal component — explains goal, push-to-talk controls, emoji system, scoring, and judge mechanics
- Auto-shows on game load (`useState(true)`), dismissed with "Got it!" button
- Reopened via 📜 button in game header (both `App.tsx` and `RemoteGameView.tsx`)
- Fully bilingual (FR/EN) via 13 new i18n keys
- Matches existing ornate-card visual style with backdrop blur overlay

### Architecture presentation page
- `ArchitecturePage.tsx`: full-page technical slide accessible from the lobby
  - Horizontal flow diagram: Player Voice → Voxtral Mini → Ministral 8B → ElevenLabs → Game Effects
  - Mistral nodes get gold glow + badge, ElevenLabs gets purple
  - "Latency is King" callout section with 8 design decisions explained
  - 3-column model detail cards (Voxtral Mini, Ministral 8B, ElevenLabs) with bullet points
  - Tech stack footer pills
  - Animated fade-in-up with staggered delays
  - Same dark arcane theme as the rest of the game
- `GameRouter.tsx`: `architecture` phase added to router state machine
- `Lobby.tsx`: subtle "Architecture" link-button at the bottom of the lobby page
- Ready for the jury to scan in ~30 seconds

### README.md
- Polished hackathon submission README
- Pitch, flow diagram, Mistral models table, latency-first philosophy, ElevenLabs integration, tech stack, quick start

### Password protection
- Simple password gate to prevent unauthorized API credit usage
- `GAME_PASSWORD` env var in `.env` — if set, all endpoints require it
- Backend: `verify_password` dependency on all REST endpoints (`/api/auth`, `/api/rooms`, `/api/rooms/{code}/join`, `/api/rooms/{code}`), WebSocket checks `password` query param
- Frontend: `PasswordGate` component in `GameRouter.tsx` — shown before lobby, stores password in `sessionStorage`
- `config.ts`: `getPassword()`, `setPassword()`, `authHeaders()` helpers — all API calls include `X-Game-Password` header
- WebSocket URL includes `&password=...` query param
- If no `GAME_PASSWORD` env var is set, everything works without auth (backwards compatible)

## Not yet implemented
- **RAG asset retrieval** — Mistral Embed + Qdrant for sound/image/animation lookup
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
