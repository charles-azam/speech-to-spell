# Speech to Spell

**A multiplayer wizard duel powered by voice and Mistral AI.**

Two wizards face off in a magical arena. Speak your spells out loud — an AI judge evaluates your creativity, picks emojis from your hand, delivers theatrical French roasts, and determines the outcome. A commentator duo hypes every moment. This game would not have been possible without Mistral's models.

## How it works

```
🎙️ Speak spell  →  🗣️ Voxtral Mini (STT)  →  ⚖️ Ministral 8B (Judge + Emoji + Commentary)  →  🔊 ElevenLabs (TTS)  →  ✨ Effects
```

1. **Speak** your spell into the mic (push-to-talk or text input)
2. **Voxtral Mini** transcribes your voice in ~500ms
3. **Ministral 8B** runs 3 independent tasks: judges the spell, infers emojis from your hand, generates commentary
4. **ElevenLabs** voices the judge's verdict and commentator duo
5. **Game effects** — visual animations, sound effects, damage/healing applied

## Mistral Models Used

| Model | ID | Role |
|---|---|---|
| **Voxtral Mini** | `voxtral-mini-latest` | Speech-to-text — every spell passes through Voxtral. ~500ms per transcription. |
| **Ministral 8B** | `ministral-8b-latest` | **Judge AI** — single tool call evaluates spell (verdict + damage + effects). |
| | | **Emoji Inference** — single tool call picks emojis from the player's hand matching the incantation. |
| | | **Commentator AI** — minimalist agent with managed context (last 5 events only). Marc hypes, Sophie roasts. |

## Latency-first design

Every design decision optimizes for real-time gameplay:

- **Voxtral Mini + Ministral 8B** chosen for fastest multilingual inference — not the biggest models, the fastest
- **Single tool calls everywhere** — Judge = 1 call. Emoji inference = 1 call. No agentic loops, no multi-turn. Minimizes round trips.
- **Minimalist commentator agent** — each call sends only system prompt + 1 user message with the last 5 events. No conversation history accumulates — context is manually managed to stay tiny.
- **EC2 in Europe** — server co-located with Mistral's EU inference endpoints. Minimal network latency.
- **Pre-generated sound bank** — 25 sounds generated offline via ElevenLabs. Instant disk lookup at runtime.
- **Fire-and-forget commentary** — commentator runs asynchronously after the judge, never blocks the game loop
- **TTS caching** — in-memory cache (500 entries) avoids redundant ElevenLabs calls for repeated phrases

## ElevenLabs Integration

- **Judge voice** — `eleven_multilingual_v2` for theatrical French roasts on every verdict
- **Commentator duo** — Marc (excitable hype-man) & Sophie (deadpan sarcasm), two distinct voices
- **Sound effects** — 25 pre-generated sounds (fireball, thunder, healing, cosmic, etc.)

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS 4
- **Backend**: FastAPI, WebSockets, Python 3.13
- **AI**: Mistral AI (Voxtral Mini, Ministral 8B), ElevenLabs (TTS + sound generation)
- **Deployment**: Docker, nginx, EC2 Europe, Cloudflare Pages

## How to run

```bash
# Backend
cp .env.example .env  # Add MISTRAL_API_KEY + ELEVENLABS_API_KEY
uv run uvicorn speech_to_spell.main:app --reload

# Frontend (in another terminal)
cd frontend && npm install && npm run dev
```

Open http://localhost:5173 — create a room and start dueling.

## Team

Built in 48 hours at the Mistral Hackathon.
