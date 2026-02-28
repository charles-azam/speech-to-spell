import json
import logging
import os
from typing import Literal

from dotenv import load_dotenv
from mistralai import Mistral
from openai import OpenAI
from pydantic import BaseModel

from speech_to_spell.sound import SOUND_IDS, get_sound_descriptions

load_dotenv()

logger = logging.getLogger(__name__)

# ---- Change this to switch provider ----
SPELL_PROVIDER: Literal["mistral", "aws", "huggingface"] = "mistral"

# --- Mistral (direct) ---
_mistral_client: Mistral | None = None
MISTRAL_MODEL = "ministral-8b-latest"

# --- AWS Bedrock (OpenAI-compatible) ---
_aws_client: OpenAI | None = None
AWS_MODEL = "mistral.ministral-8b-2410-v1:0"

# --- HuggingFace GPT-OSS 120B ---
_hf_client: OpenAI | None = None
HF_MODEL = "openai/gpt-oss-120b:cerebras"


def _get_mistral_client() -> Mistral:
    global _mistral_client
    if _mistral_client is None:
        _mistral_client = Mistral(api_key=os.environ["MISTRAL_API_KEY"])
    return _mistral_client


def _get_aws_client() -> OpenAI:
    global _aws_client
    if _aws_client is None:
        _aws_client = OpenAI(
            base_url="https://bedrock-mantle.us-west-2.api.aws/v1",
            api_key=os.environ["AWS_BEARER_TOKEN_BEDROCK"],
        )
    return _aws_client


def _get_hf_client() -> OpenAI:
    global _hf_client
    if _hf_client is None:
        _hf_client = OpenAI(
            base_url="https://router.huggingface.co/v1",
            api_key=os.environ["HUGGINGFACE_API_KEY"],
        )
    return _hf_client

# --- Valid templates for visual effects ---

VALID_TEMPLATES = {
    "explosion", "swirl", "rain", "wave_left", "wave_right",
    "shatter", "pulse", "spiral", "rise",
}

# --- Judge tool definition ---

JUDGE_SPELL_TOOL = {
    "type": "function",
    "function": {
        "name": "judge_spell",
        "description": (
            "Rends ton verdict sur le sort lancé. "
            "Si verdict=YES, remplis TOUS les champs d'effet. "
            "Si verdict=NO ou EXPLAIN, seul comment est requis."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "verdict": {
                    "type": "string",
                    "enum": ["YES", "NO", "EXPLAIN"],
                    "description": (
                        "YES = sort accepté (dégâts appliqués), "
                        "NO = sort rejeté, "
                        "EXPLAIN = le joueur doit justifier son sort"
                    ),
                },
                "comment": {
                    "type": "string",
                    "description": (
                        "Commentaire du juge en français. Drôle, théâtral, mémorable. "
                        "Ex: 'Impressionnant, petit sorcier !', 'Même toi tu n'y crois pas...', "
                        "'Explique-toi, mortel !'"
                    ),
                },
                "spell_name": {
                    "type": "string",
                    "description": "Nom dramatique du sort (seulement si YES).",
                },
                "target": {
                    "type": "string",
                    "enum": ["attack", "heal"],
                    "description": (
                        "attack = le sort attaque l'adversaire, "
                        "heal = le sort soigne le lanceur. "
                        "Déduis l'intention du sorcier depuis son incantation et ses emojis. "
                        "Seulement si YES."
                    ),
                },
                "damage": {
                    "type": "integer",
                    "description": "Dégâts ou soin (1-30). Créatif=haut, ennuyeux=bas. Seulement si YES.",
                },
                "sound_id": {
                    "type": "string",
                    "enum": SOUND_IDS,
                    "description": "Effet sonore à jouer (seulement si YES).",
                },
                "emojis": {
                    "type": "array",
                    "items": {"type": "string"},
                    "minItems": 1,
                    "maxItems": 3,
                    "description": "1-3 emojis pour l'effet visuel (seulement si YES).",
                },
                "template": {
                    "type": "string",
                    "enum": sorted(VALID_TEMPLATES),
                    "description": "Pattern d'animation pour les particules (seulement si YES).",
                },
                "primary_color": {
                    "type": "string",
                    "description": "Couleur CSS principale, ex '#ff4500' (seulement si YES).",
                },
                "secondary_color": {
                    "type": "string",
                    "description": "Couleur CSS secondaire, ex '#ff8c00' (seulement si YES).",
                },
            },
            "required": ["verdict", "comment"],
        },
    },
}

TOOLS = [JUDGE_SPELL_TOOL]

_sound_descriptions = get_sound_descriptions()

SYSTEM_PROMPT = f"""Tu es LE JUGE SUPRÊME d'un duel de sorciers. Tu es théâtral, drôle, impitoyable mais juste.

Tu parles UNIQUEMENT en français. Tes commentaires doivent être mémorables, drôles, et varier à chaque sort.

## Ton rôle
Un sorcier lance un sort en combinant des emojis de sa main + une incantation vocale.
Tu dois évaluer la COHÉRENCE entre les emojis choisis et l'incantation, la CRÉATIVITÉ, et l'AUDACE.

## Tes verdicts
- **YES** : Le sort est accepté ! Tu appliques les dégâts/soins. Sois généreux avec les sorts créatifs.
- **NO** : Le sort est rejeté. Les emojis sont quand même consommés. Utilise ce verdict quand :
  - Il n'y a AUCUN lien entre les emojis et l'incantation
  - Le joueur spamme le même sort
  - L'incantation est vide ou incompréhensible
- **EXPLAIN** : Tu donnes une chance au joueur de justifier son sort. Utilise quand :
  - Le lien est ténu mais potentiellement intéressant
  - Tu es intrigué mais pas convaincu

## Attaque ou Soin ?
C'est TOI qui décides si le sort est une attaque (target=attack) ou un soin (target=heal) en te basant sur l'incantation et les emojis.
- Si l'incantation évoque la destruction, le combat, le feu, etc. → attack
- Si l'incantation évoque la guérison, la protection, la régénération, etc. → heal
- En cas de doute → attack (c'est un duel après tout)

## Règles de dégâts/soin (quand YES)
- Sort créatif et cohérent : 15-30
- Sort correct mais classique : 5-15
- Sort médiocre mais accepté : 1-5

## Ton style de commentaire
Varie tes formulations ! Exemples de styles :
- Admiratif : "Par les anciens dieux, quelle magnificence !"
- Moqueur : "Même toi tu n'y crois pas..."
- Impressionné : "Attendez... c'est du GÉNIE !"
- Dégoûté : "Mon chat aurait fait mieux, et il est mort."
- Théâtral : "SILENCE DANS LA SALLE ! *frappe son marteau*"
- Intrigué : "Hmm... explique-toi, mortel."
- Blasé : "Encore ? Tu n'as vraiment pas d'imagination..."

## Sons disponibles
{_sound_descriptions}

## Templates d'animation
- explosion: particules qui explosent depuis le centre (feu, bombes, impacts)
- swirl: particules en orbite (vent, vortex, magie)
- rain: particules qui tombent (pluie, neige, débris)
- wave_left/wave_right: balayage horizontal (poussée, souffle)
- shatter: éclats qui volent (destruction, bris)
- pulse: lueur pulsante au centre (soin, aura, power-up)
- spiral: trajectoires en spirale (cosmique, mystique)
- rise: particules qui montent (feu, esprits, lévitation)
"""


class VisualEffect(BaseModel):
    template: str = "explosion"
    primary_color: str = "#ff4500"
    secondary_color: str = "#ff8c00"
    particle_count: int = 25
    scale: float = 1.0
    duration_s: float = 2.0
    emojis: list[str] = []


class JudgeVerdict(BaseModel):
    verdict: str  # YES, NO, EXPLAIN
    comment: str
    spell_name: str | None = None
    target: str = "attack"  # "attack" or "heal" — decided by the judge
    damage: int = 0
    sound_id: str | None = None
    visual_effect: VisualEffect | None = None


def _parse_judge_tool(args: dict) -> JudgeVerdict:
    """Parse the judge_spell tool call into a JudgeVerdict."""
    verdict = args.get("verdict", "NO")
    if verdict not in ("YES", "NO", "EXPLAIN"):
        verdict = "NO"

    comment = args.get("comment", "Le juge est perplexe...")

    if verdict != "YES":
        return JudgeVerdict(verdict=verdict, comment=comment)

    # Parse spell effects for YES verdict
    target = args.get("target", "attack")
    if target not in ("attack", "heal"):
        target = "attack"
    damage = max(0, min(30, args.get("damage", 0)))

    # Derive visual params from damage
    particle_count = 15 + int(damage * 1.17)  # 15-50
    scale = 0.6 + damage / 30 * 1.4           # 0.6-2.0
    duration_s = 1.5 + damage / 30 * 1.5      # 1.5-3.0

    template = args.get("template", "explosion")
    if template not in VALID_TEMPLATES:
        template = "explosion"

    sound_id = args.get("sound_id")
    if sound_id not in SOUND_IDS:
        sound_id = None

    return JudgeVerdict(
        verdict="YES",
        comment=comment,
        spell_name=args.get("spell_name"),
        target=target,
        damage=damage,
        sound_id=sound_id,
        visual_effect=VisualEffect(
            template=template,
            primary_color=args.get("primary_color", "#ff4500"),
            secondary_color=args.get("secondary_color", "#ff8c00"),
            particle_count=particle_count,
            scale=round(scale, 2),
            duration_s=round(duration_s, 2),
            emojis=args.get("emojis", ["✨"])[:3],
        ),
    )


def _parse_tool_calls_mistral(tool_calls: list) -> JudgeVerdict:
    """Parse tool calls from Mistral SDK response."""
    for tool_call in tool_calls:
        name = tool_call.function.name
        args = json.loads(tool_call.function.arguments)
        logger.info(f"Tool call: {name}({args})")
        if name == "judge_spell":
            return _parse_judge_tool(args=args)
    return JudgeVerdict(verdict="NO", comment="Le juge n'a pas pu rendre son verdict.")


def _parse_tool_calls_openai(tool_calls: list) -> JudgeVerdict:
    """Parse tool calls from OpenAI SDK response."""
    for tool_call in tool_calls:
        name = tool_call.function.name
        args = json.loads(tool_call.function.arguments)
        logger.info(f"Tool call: {name}({args})")
        if name == "judge_spell":
            return _parse_judge_tool(args=args)
    return JudgeVerdict(verdict="NO", comment="Le juge n'a pas pu rendre son verdict.")


def _build_user_message(
    selected_emojis: list[str],
    transcription: str,
    game_context: str,
    explanation: str | None = None,
) -> str:
    """Build the user message for the LLM."""
    emoji_str = " ".join(selected_emojis)

    parts = [
        f"Emojis choisis par le sorcier : {emoji_str}",
        f'Incantation : "{transcription}"',
    ]

    if explanation:
        parts.append(f'Explication du sorcier : "{explanation}"')
        parts.append("C'est sa DEUXIÈME chance. Tu dois rendre un verdict final : YES ou NO uniquement.")

    if game_context:
        parts.append(f"\nÉtat du jeu :\n{game_context}")

    return "\n".join(parts)


def _interpret_mistral(user_content: str) -> JudgeVerdict:
    """Interpret spell via Mistral SDK (direct)."""
    response = _get_mistral_client().chat.complete(
        model=MISTRAL_MODEL,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_content},
        ],
        tools=TOOLS,
        tool_choice="any",
    )
    tool_calls = response.choices[0].message.tool_calls or []
    return _parse_tool_calls_mistral(tool_calls=tool_calls)


def _interpret_openai(client: OpenAI, model: str, user_content: str) -> JudgeVerdict:
    """Interpret spell via any OpenAI-compatible endpoint (AWS Bedrock, HuggingFace, etc.)."""
    response = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_content},
        ],
        tools=TOOLS,
        tool_choice="auto",
    )
    tool_calls = response.choices[0].message.tool_calls or []
    return _parse_tool_calls_openai(tool_calls=tool_calls)


def interpret_spell(
    selected_emojis: list[str],
    transcription: str,
    game_context: str = "",
    explanation: str | None = None,
) -> JudgeVerdict:
    """Send spell to the judge LLM, return verdict."""
    user_content = _build_user_message(
        selected_emojis=selected_emojis,
        transcription=transcription,
        game_context=game_context,
        explanation=explanation,
    )

    logger.info(f"Using {SPELL_PROVIDER} for spell: {transcription!r}")

    if SPELL_PROVIDER == "mistral":
        return _interpret_mistral(user_content=user_content)
    elif SPELL_PROVIDER == "aws":
        return _interpret_openai(client=_get_aws_client(), model=AWS_MODEL, user_content=user_content)
    else:
        return _interpret_openai(client=_get_hf_client(), model=HF_MODEL, user_content=user_content)
