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


MARC_SAYS_TOOL = {
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

SOPHIE_SAYS_TOOL = {
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

COMMENTATOR_TOOLS = [MARC_SAYS_TOOL, SOPHIE_SAYS_TOOL]

SYSTEM_PROMPT = """Tu es un DUO de commentateurs sportifs pour un duel de sorciers en DIRECT. Tu contrôles DEUX personnages :

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


def generate_commentary(
    events: list[str],
    left_name: str,
    right_name: str,
) -> list[CommentaryLine]:
    """Generate commentary lines reacting to recent game events."""
    events_text = "\n".join(f"- {e}" for e in events[-5:])
    user_message = (
        f"Joueurs: {left_name} (gauche) vs {right_name} (droite)\n\n"
        f"Derniers événements:\n{events_text}\n\n"
        f"Commentez le dernier sort ! Réagissez, analysez, hyper ou roastez."
    )

    response = _get_mistral_client().chat.complete(
        model=COMMENTATOR_MODEL,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_message},
        ],
        tools=COMMENTATOR_TOOLS,
        tool_choice="any",
    )

    return _parse_tool_calls(tool_calls=response.choices[0].message.tool_calls or [])


def generate_idle_commentary(
    events: list[str],
    left_name: str,
    right_name: str,
    idle_seconds: int,
) -> list[CommentaryLine]:
    """Generate commentary for when players are idle / taking too long."""
    context = ""
    if events:
        events_text = "\n".join(f"- {e}" for e in events[-3:])
        context = f"\n\nDerniers événements (il y a un moment):\n{events_text}"

    user_message = (
        f"Joueurs: {left_name} (gauche) vs {right_name} (droite)\n"
        f"Ça fait {idle_seconds} secondes que personne n'a lancé de sort.{context}\n\n"
        f"Meublez ! Commentez le silence, interpellez les joueurs, faites un pronostic, "
        f"chambrez-vous entre commentateurs. Le public attend!"
    )

    response = _get_mistral_client().chat.complete(
        model=COMMENTATOR_MODEL,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_message},
        ],
        tools=COMMENTATOR_TOOLS,
        tool_choice="any",
    )

    return _parse_tool_calls(tool_calls=response.choices[0].message.tool_calls or [])
