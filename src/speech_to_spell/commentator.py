import json
import logging
import os
from typing import Literal

from dotenv import load_dotenv
from mistralai import Mistral
from pydantic import BaseModel

load_dotenv()

logger = logging.getLogger(__name__)

_mistral_client: Mistral | None = None
COMMENTATOR_MODEL = "ministral-8b-latest"


def _get_mistral_client() -> Mistral:
    global _mistral_client
    if _mistral_client is None:
        _mistral_client = Mistral(api_key=os.environ["MISTRAL_API_KEY"])
    return _mistral_client


class CommentaryLine(BaseModel):
    speaker: Literal["marc", "sophie"]
    text: str


MARC_SAYS_TOOL_FR = {
    "type": "function",
    "function": {
        "name": "marc_says",
        "description": "Marc dit quelque chose. Marc est le commentateur excité, il hype les grands moments.",
        "parameters": {
            "type": "object",
            "properties": {
                "text": {
                    "type": "string",
                    "description": "Ce que Marc dit. Court, max 15 mots.",
                },
            },
            "required": ["text"],
        },
    },
}

SOPHIE_SAYS_TOOL_FR = {
    "type": "function",
    "function": {
        "name": "sophie_says",
        "description": "Sophie dit quelque chose. Sophie est la commentatrice sarcastique, elle roast les mauvais plays.",
        "parameters": {
            "type": "object",
            "properties": {
                "text": {
                    "type": "string",
                    "description": "Ce que Sophie dit. Court, max 15 mots.",
                },
            },
            "required": ["text"],
        },
    },
}

MARC_SAYS_TOOL_EN = {
    "type": "function",
    "function": {
        "name": "marc_says",
        "description": "Marc says something. Marc is the excited commentator, he hypes big moments.",
        "parameters": {
            "type": "object",
            "properties": {
                "text": {
                    "type": "string",
                    "description": "What Marc says. Short, max 15 words. In English.",
                },
            },
            "required": ["text"],
        },
    },
}

SOPHIE_SAYS_TOOL_EN = {
    "type": "function",
    "function": {
        "name": "sophie_says",
        "description": "Sophie says something. Sophie is the sarcastic commentator, she roasts bad plays.",
        "parameters": {
            "type": "object",
            "properties": {
                "text": {
                    "type": "string",
                    "description": "What Sophie says. Short, max 15 words. In English.",
                },
            },
            "required": ["text"],
        },
    },
}

COMMENTATOR_TOOLS = {
    "fr": [MARC_SAYS_TOOL_FR, SOPHIE_SAYS_TOOL_FR],
    "en": [MARC_SAYS_TOOL_EN, SOPHIE_SAYS_TOOL_EN],
}

SYSTEM_PROMPT_FR = """Tu es un DUO de commentateurs sportifs pour un duel de sorciers en DIRECT. Tu contrôles DEUX personnages :

**Marc** — Commentateur masculin surexcité. Il hype les grands moments, s'enflamme sur les sorts créatifs, crie quand c'est intense. Mix français/anglais naturel. "OH LA LA", "INCROYABLE", "What a PLAY!", "C'est CHAUD!"

**Sophie** — Commentatrice féminine sarcastique. Elle roast les mauvais plays, deadpan humor, pince-sans-rire. Elle remet Marc à sa place quand il s'emballe trop. "Wow. Impressionnant. Non j'déconne.", "Marc, calme-toi c'était 2 de dégâts.", "Bon on s'ennuie là."

Ils peuvent :
- Réagir au dernier sort (commenter les dégâts, la créativité, le choix des emojis)
- Se chambrer entre eux ("Marc t'es insupportable", "Sophie t'as jamais rien de positif à dire")
- Interpeller les joueurs par leur nom ("Allez {nom}, montre-nous ce que t'as!")
- Faire des pronostics ("Je sens que le prochain sort va être DINGUE")
- Commenter les HP ("Attention, il est à 30 HP, ça sent la fin!")
- Meubler quand il ne se passe rien ("Bon alors, on joue ou quoi?", "Le public s'impatiente!")

RÈGLES :
- 1-3 répliques au total selon la situation
- Max 15 mots par réplique
- Appelle marc_says et/ou sophie_says — tu DOIS appeler au moins un des deux
- Langue : français naturel avec expressions anglaises quand ça colle
- Sois DRÔLE et VARIÉ, ne te répète jamais
- Tu peux faire parler les deux pour un dialogue entre eux"""

SYSTEM_PROMPT_EN = """You are a DUO of sports commentators for a LIVE wizard duel. You control TWO characters:

**Marc** — Overexcited male commentator. He hypes big moments, goes wild over creative spells, shouts when it's intense. "OH MY GOD", "INCREDIBLE", "What a PLAY!", "This is INSANE!"

**Sophie** — Sarcastic female commentator. She roasts bad plays, deadpan humor, dry wit. She puts Marc back in his place when he gets too excited. "Wow. Impressive. Just kidding.", "Marc, calm down, that was 2 damage.", "Well, this is boring."

They can:
- React to the latest spell (comment on damage, creativity, emoji choices)
- Banter with each other ("Marc you're unbearable", "Sophie you never have anything positive to say")
- Call out players by name ("Come on {name}, show us what you've got!")
- Make predictions ("I feel like the next spell is going to be WILD")
- Comment on HP ("Watch out, they're at 30 HP, this could be the end!")
- Fill dead air when nothing's happening ("So... are we playing or what?", "The audience is getting restless!")

RULES:
- 1-3 lines total depending on the situation
- Max 15 words per line
- Call marc_says and/or sophie_says — you MUST call at least one of them
- Language: English
- Be FUNNY and VARIED, never repeat yourself
- You can have both speak for a dialogue between them"""

SYSTEM_PROMPTS = {"fr": SYSTEM_PROMPT_FR, "en": SYSTEM_PROMPT_EN}


def _parse_tool_calls(tool_calls: list) -> list[CommentaryLine]:
    """Parse tool calls into CommentaryLine list."""
    lines: list[CommentaryLine] = []
    for tool_call in tool_calls:
        name = tool_call.function.name
        args = json.loads(tool_call.function.arguments)
        text = args.get("text", "")
        logger.info(f"Commentator tool call: {name}({text!r})")
        if name == "marc_says" and text:
            lines.append(CommentaryLine(speaker="marc", text=text))
        elif name == "sophie_says" and text:
            lines.append(CommentaryLine(speaker="sophie", text=text))
    return lines


USER_MESSAGES = {
    "fr": {
        "commentary": (
            "Joueurs: {left_name} (gauche) vs {right_name} (droite)\n\n"
            "Derniers événements:\n{events_text}\n\n"
            "Commentez le dernier sort ! Réagissez, analysez, hypez ou roastez."
        ),
        "idle": (
            "Joueurs: {left_name} (gauche) vs {right_name} (droite)\n"
            "Ça fait {idle_seconds} secondes que personne n'a lancé de sort.{context}\n\n"
            "Meublez ! Commentez le silence, interpellez les joueurs, faites un pronostic, "
            "chambrez-vous entre commentateurs. Le public attend!"
        ),
        "idle_context": "\n\nDerniers événements (il y a un moment):\n{events_text}",
    },
    "en": {
        "commentary": (
            "Players: {left_name} (left) vs {right_name} (right)\n\n"
            "Recent events:\n{events_text}\n\n"
            "Comment on the latest spell! React, analyze, hype or roast."
        ),
        "idle": (
            "Players: {left_name} (left) vs {right_name} (right)\n"
            "It's been {idle_seconds} seconds since anyone cast a spell.{context}\n\n"
            "Fill the dead air! Comment on the silence, call out players, make a prediction, "
            "banter between commentators. The audience is waiting!"
        ),
        "idle_context": "\n\nRecent events (a while ago):\n{events_text}",
    },
}


def generate_commentary(
    events: list[str],
    left_name: str,
    right_name: str,
    lang: str = "fr",
) -> list[CommentaryLine]:
    """Generate commentary lines reacting to recent game events."""
    events_text = "\n".join(f"- {e}" for e in events[-5:])
    templates = USER_MESSAGES.get(lang, USER_MESSAGES["en"])
    user_message = templates["commentary"].format(
        left_name=left_name,
        right_name=right_name,
        events_text=events_text,
    )

    response = _get_mistral_client().chat.complete(
        model=COMMENTATOR_MODEL,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPTS.get(lang, SYSTEM_PROMPTS["en"])},
            {"role": "user", "content": user_message},
        ],
        tools=COMMENTATOR_TOOLS.get(lang, COMMENTATOR_TOOLS["en"]),
        tool_choice="any",
    )

    return _parse_tool_calls(tool_calls=response.choices[0].message.tool_calls or [])


def generate_idle_commentary(
    events: list[str],
    left_name: str,
    right_name: str,
    idle_seconds: int,
    lang: str = "fr",
) -> list[CommentaryLine]:
    """Generate commentary for when players are idle / taking too long."""
    templates = USER_MESSAGES.get(lang, USER_MESSAGES["en"])
    context = ""
    if events:
        events_text = "\n".join(f"- {e}" for e in events[-3:])
        context = templates["idle_context"].format(events_text=events_text)

    user_message = templates["idle"].format(
        left_name=left_name,
        right_name=right_name,
        idle_seconds=idle_seconds,
        context=context,
    )

    response = _get_mistral_client().chat.complete(
        model=COMMENTATOR_MODEL,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPTS.get(lang, SYSTEM_PROMPTS["en"])},
            {"role": "user", "content": user_message},
        ],
        tools=COMMENTATOR_TOOLS.get(lang, COMMENTATOR_TOOLS["en"]),
        tool_choice="any",
    )

    return _parse_tool_calls(tool_calls=response.choices[0].message.tool_calls or [])
