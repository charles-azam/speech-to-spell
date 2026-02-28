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

A multiplayer wizard duel game set in a **comedic wizard school**. Players cast spells by speaking them out loud. Spells are not predefined — players invent them freely using their imagination (e.g. "giant fireball!", "wall of ice!", "a rain of cats!", "emotional damage!").

Voice analysis uses a **mix of Voxtral and Ministral**: Voxtral transcribes the speech, Ministral analyzes intonation and delivery. It's not only about what you say but how you say it.

## Design Decisions

### Spell System
- Spells are **expected** to be elemental (fire, water, ice, lightning, earth, etc.) but **anything goes** — a rain of cats, a hard breakup, an insult, all count as spells. Originality is always rewarded.
- Players invent spells freely — the LLM interprets intent and determines the effect
- Spell **combos** exist and are **generated dynamically by the LLM** during the match — not predefined

### Mana & Balance
- Speaking too much or casting overly powerful spells drains mana
- The **LLM is the judge** of spell power and mana cost: it penalizes spam, rewards originality, and maintains game equilibrium
- The LLM is the warrant of the balance of the game itself

### Visual Effects & Interface
- **Side-view** arena with a clear status panel showing active effects, terrain conditions, health, mana
- Art style TBD — **pixel art** is an option but not mandatory

**Visual effects are layered — the LLM decides which layers activate based on spell power/creativity:**

**Always present (cheap, instant):**
- Screen shake + color tint
- Big spell name text with CSS glow/animation ("FROZEN HURRICANE" slamming onto screen)
- **Emoji particle burst**: LLM picks 1-3 emojis, shower the screen with them via a simple particle system. "Rain of cats" → 🐱 raining down, "Fireball" → 🔥 expanding, "Emotional damage" → 💔 shattering. Trivial to implement, inherently comedic, works for any spell.

**Additional layers (LLM picks based on spell quality — creative spells get more spectacular effects):**
- **LLM-generated CSS animations**: Ministral generates CSS @keyframes with parameters (colors, timing, scale). Use a template library of ~10 patterns (pulse, expand, spiral, rain, shake, etc.) that the LLM fills in. Broken CSS = "your spell fizzled!" which is funny and on-theme.
- **SVG generation**: Inline SVG with filters (feTurbulence for fire/smoke, feGaussianBlur for glow). Powerful but arcane syntax — use base templates the LLM modifies.
- **Pre-made sprite bank**: ~15-20 sprites from itch.io for common effects. Generic but reliable fallback.
- **Programmatic particles** (tsparticles or Canvas2D): LLM returns particle parameters → visually unique every time.
- **Meta-spells that break the fourth wall**: Glitch the game interface itself — invert colors, flip the arena, pixelate the opponent's side, scramble their UI. "I cast CTRL+Z!" → last spell reverses. "I cast LAG!" → opponent's side stutters. Costs almost nothing (CSS transforms on existing DOM) and is peak comedy.

A weak "fire" gets emoji burst + text. A creative "volcanic sneeze from the earth's nostril" gets all layers plus a special commentator line. This reinforces the core design: rewarding originality through the visuals themselves.

**Stretch goal:** Real-time image generation. Latency (2-3s) kills game flow — only viable if pre-generated during opponent's turn.

### Audio
- **ElevenLabs TTS** for an AI commentator that narrates the match
- **ElevenLabs API** for spell sound effects
- The commentator sometimes signals combos or special moments with a distinct sound cue
- No speech-to-speech, but use ElevenLabs Speech-to-Speech API if any voice transformation is needed

### Multiplayer Progression (build in this order)
1. Same computer, turn-based
2. Multiple computers, turn-based
3. Multiple computers, real-time
4. Same computer, real-time, two microphones entries

## Technical Architecture

### Stack: React/Vite + FastAPI + WebSockets
Using Phaser for the frontend is fine but for the backend we want to avoid using Colyseus. 

### No Auth, No Database
Room code system (4-letter code + wizard name). All state in server memory. Supabase can be bolted on later for leaderboard if time allows.

### Voice Pipeline
Browser captures mic → **Silero VAD** client-side detects speech start/end → audio chunk sent to server → **Voxtral** transcribes → **Ministral** interprets the spell.

One Voxtral endpoint handles all players concurrently (short audio clips, independent requests).

### Same-Computer Multiplayer
Speaker diarization is too unreliable. Solutions:
- **Turn-based** (phase 1): solves it naturally
- **Two separate mic inputs**: each player picks their mic via device enumeration
- **Push-to-talk** (phase 4): each player has a key (e.g. Q and P)



## Ideas Worth Exploring

These are not decided yet but could add depth:

- **Made-up recognizable words get a bonus**: "tornador" is better than "tornado" — invented words that are still understandable reward creativity
- **Language-based bonuses**: casting "blizzard" in a Nordic language is more powerful than in a Latin language — the spell's cultural origin matters
- **Spell suggestions at the start**: show players a few example spells at the beginning to lower the entry barrier
- **Spell combinations between teammates** (in team mode): two players casting complementary spells get amplified effects

## Good practice
It has to be as fast as possible. So for instance there might be multiple sound tracks like sound effect and commentator being recorded.

# Critical

You must in a progress.md file keep track of what you achieved and the features that have been developped. You can also give context to what extend the features are polished / tested / in progress.