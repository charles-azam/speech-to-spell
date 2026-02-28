# Speech to Spell — Game Design Document

## Context

Mistral hackathon. 2 devs, 48 hours. Core judging criteria: how well we leverage Mistral's SOTA models — the game should not have been possible without them.

**Models available:**
- **Voxtral**: Very fast SOTA speech-to-text. Backbone of the project — real-time voice input drives gameplay.
- **Ministral** (3B / 8B / 14B): Small SOTA models for fast inference — spell interpretation, game logic, intonation analysis.
- **Mistral Large 3**: For heavier reasoning tasks if needed.

**Bonus prize categories** (each with a special prize):
- On-device (NVIDIA)
- Fine-tuning
- AWS APIs
- Best video game
- ElevenLabs (voice synthesis)

## Core Concept

A multiplayer wizard duel game. Players cast spells by **combining emojis + voice**.

### Game Flow

1. **Emoji Hand**: Each wizard starts with **10 random emojis** picked from a huge bank of all emojis.
2. **Spell Crafting**: On their turn, a player **hand-picks at least 2 emojis** from their hand (more is better). They then **speak out loud** to describe their attack spell (e.g. "rain of dogs!").
3. **The Judge**: An LLM judge evaluates the spell (emoji selection + voice description) and gives one of three verdicts:
   - **YES** — the spell is accepted and takes effect
   - **NO** — the spell is rejected
   - **"Explain yourself"** — the judge gives the player a chance to justify their spell
4. **Spell Target**: Spells can either **attack the opponent** (decrease their life) or **heal yourself** (increase your life).
5. **Resolution**: The judge determines damage/healing based on creativity, coherence between emojis and spoken spell, and delivery.

### The Judge

The judge is the heart of the game. It is an LLM that:
- Evaluates spell quality (emoji + voice coherence, creativity, delivery)
- Makes **funny comments** in French — e.g. "Meme toi tu n'y crois pas", "C'est la premiere fois que je vois ca", etc.
- **Tone matters** — how you say it affects the outcome (analyzed via Voxtral + Ministral)
- Is the sole arbiter of game balance

### Visual Effects & Sound

**Visual effects are layered — the judge decides which layers activate based on spell power/creativity:**

**Always present (cheap, instant):**
- Screen shake + color tint
- Big spell name text with CSS glow/animation ("FROZEN HURRICANE" slamming onto screen)
- **Emoji particle burst**: the selected emojis shower the screen via a simple particle system. "Rain of cats" → 🐱 raining down, "Fireball" → 🔥 expanding. Trivial to implement, inherently comedic, works for any spell.

**Additional layers (judge picks based on spell quality — creative spells get more spectacular effects):**
- **LLM-generated CSS animations**: Ministral generates CSS @keyframes with parameters (colors, timing, scale). Use a template library of ~10 patterns (pulse, expand, spiral, rain, shake, etc.) that the LLM fills in. Broken CSS = "your spell fizzled!" which is funny and on-theme.
- **Meta-spells that break the fourth wall**: Glitch the game interface itself — invert colors, flip the arena, pixelate the opponent's side, scramble their UI. Costs almost nothing (CSS transforms on existing DOM) and is peak comedy.

**Sound effects:**
- **Sound effects via pre-generated bank + RAG retrieval** — real-time generation is too slow. Pre-generate ~200 sound effects offline, embed them with Mistral Embed, store in Qdrant, and retrieve the best match instantly at game time.
- **ElevenLabs TTS** for the judge's voice and the commentator

### Asset Bank + RAG Architecture (sound effects, images, animations)
- **Offline generation**: scripts generate assets (ElevenLabs for sounds, image gen for visuals) and save them with metadata JSON files
- **Embedding + indexing**: Mistral Embed encodes each asset's description/tags → stored in Qdrant
- **Runtime retrieval**: LLM spell interpretation produces a query → nearest-neighbor search in Qdrant → instant asset lookup, no generation latency
- This scales to any asset type (sounds, sprites, animations, videos) with the same pipeline

### Additional Features (post-MVP)
- **Commentator**: A separate voice (ElevenLabs TTS) commentating on top of the judge's decisions — hype moments, roasts, play-by-play
- **Room system**: Players create/join rooms with a simple code for multiplayer over network
- **Deployment**: Fastest path to get it online — room-based, no auth needed

### Ideas Worth Exploring

- **Game equilibrium via emoji economy**: using more emojis = more powerful spell but depletes your hand faster. Strategic tension between big flashy spells and conserving your hand.
- **Made-up recognizable words get a bonus**: "tornador" is better than "tornado" — invented words that are still understandable reward creativity
- **Language-based bonuses**: casting "blizzard" in a Nordic language is more powerful than in a Latin language — the spell's cultural origin matters
- **Spell suggestions at the start**: show players a few example spells at the beginning to lower the entry barrier
- **Spell combinations between teammates** (in team mode): two players casting complementary spells get amplified effects
- **Spells that manipulate the UI**: moving characters, resizing panels, etc. — fits naturally with the meta/fourth-wall-break spells

## Technical Architecture

### Stack: React/Vite + FastAPI + WebSockets

### No Auth, No Database
Room code system (4-letter code + wizard name). All state in server memory.

### Voice Pipeline
Browser captures mic → **Silero VAD** client-side detects speech start/end → audio chunk sent to server → **Voxtral** transcribes → **Ministral** interprets the spell.

One Voxtral endpoint handles all players concurrently (short audio clips, independent requests).

### Same-Computer Multiplayer
Speaker diarization is too unreliable. Solutions:
- **Turn-based** (phase 1): solves it naturally
- **Two separate mic inputs**: each player picks their mic via device enumeration
- **Push-to-talk**: each player has a key (e.g. Q and P)

### Multiplayer Progression (build in this order)
1. Same computer, turn-based (MVP)
2. Multiple computers, turn-based (room codes)
3. Multiple computers, real-time

## Good practice
It has to be as fast as possible. So for instance there might be multiple sound tracks like sound effect and commentator being recorded.

# Critical

You must in a progress.md file keep track of what you achieved and the features that have been developped. You can also give context to what extend the features are polished / tested / in progress.
