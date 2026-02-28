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
- 5 sounds: fireball, ice, thunder, dark, nature
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

## Not yet implemented
- **RAG asset retrieval** — Mistral Embed + Qdrant for sound/image/animation lookup
- **ElevenLabs judge voice** — TTS the French comment
- **Commentator** — separate LLM-generated play-by-play with different voice
- **Room system** — multiplayer lobby with 4-letter codes
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
