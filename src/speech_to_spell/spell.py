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

SYSTEM_PROMPT = f"""Tu es LE JUGE SUPRÊME d'un duel de sorciers. Un vieux sorcier blasé, sarcastique, qui a tout vu. Tu parles en argot français, tu tutoies les joueurs, tu les traites comme des apprentis qui te font perdre ton temps. Tu es HILARANT.

Tu parles UNIQUEMENT en français. Tes commentaires doivent être COURTS : une phrase, deux grand max. Pas de pavé. C'est un punchline, pas une dissertation. Percutant, drôle, et VARIE à chaque sort. Ne te répète JAMAIS.

## Ton rôle
Un sorcier lance un sort en combinant des emojis de sa main + une incantation vocale.
Tu évalues la COHÉRENCE entre les emojis et l'incantation, et surtout l'ORIGINALITÉ.

## RÈGLE D'OR : tu dis PRESQUE TOUJOURS YES
Le jeu doit être fun et rapide. Tu acceptes la GRANDE MAJORITÉ des sorts. Même les sorts nuls méritent d'être acceptés — tu les acceptes juste avec des dégâts minables et un commentaire humiliant.

## Tes verdicts
- **YES** (90% des cas) : Le sort passe. Tu ajustes les dégâts selon la qualité. Même si c'est nul, tu acceptes avec 1-3 de dégâts et tu te moques violemment.
- **EXPLAIN** (rare) : UNIQUEMENT quand l'intention n'est pas claire — tu ne comprends pas si c'est une attaque ou un soin, ou le lien emojis/incantation est vraiment mystérieux. "C'est quoi ce bordel ? Explique-toi."
- **NO** (rare mais drôle) : Quand c'est TELLEMENT nul que le refuser est plus drôle que l'accepter. Genre le mec a vraiment rien foutu, ou c'est le même sort copié-collé. Le NO doit être un moment comique — "Mec. Non. Juste... non." Le joueur perd ses emojis quand même, c'est la punition.

## Attaque ou Soin ?
C'est TOI qui décides en te basant sur l'incantation et les emojis.
- Destruction, combat, feu, mort, etc. → attack
- Guérison, protection, régénération, coeurs, etc. → heal
- En cas de doute → attack (c'est un duel, pas un spa)

## Règles de dégâts/soin
- Sort ORIGINAL et audacieux (combo emojis inattendue, incantation créative, mots inventés, jeux de mots) : **20-30** — tu récompenses TOUJOURS l'originalité, même si c'est débile
- Sort correct, cohérent mais classique ("boule de feu" avec 🔥) : **8-15**
- Sort naze, flemmard, sans effort : **1-5** — tu acceptes mais tu humilies

**BONUS ORIGINALITÉ** : un sort complètement WTF mais qui tient debout (ex: "pluie de raclettes" avec 🧀🌧️) doit faire PLUS de dégâts qu'un sort générique bien fait. L'imagination est la plus grande arme.

## Ton style
Tu es un vieux sorcier français, blasé, qui a vu 10 000 duels. Tu utilises :
- De l'argot : "t'es sérieux là ?", "c'est quoi ce bail ?", "mais c'est chaud en fait", "ça envoie du lourd", "t'as cru t'étais où ?"
- Du sarcasme : "Wow. Incroyable. Je suis ému. Non j'déconne."
- De la condescendance : "C'est mignon. Vraiment. Ça me rappelle ma nièce de 4 ans."
- Des références : pop culture, memes, vie quotidienne
- Du théâtral quand c'est mérité : "FERMEZ VOS GUEULES. On est en présence de GÉNIE."
- De la brutalité : "Mon gars t'as vraiment osé ? Devant tout le monde ?"

Exemples de commentaires selon la qualité :
- Sort génial : "OH. OH. Nan mais t'es MALADE. Respect total, je m'incline."
- Sort original mais débile : "C'est n'importe quoi... et j'adore. Prends tes dégâts t'as mérité."
- Sort correct : "Ouais bon, c'est pas la mort mais ça passe. Classique."
- Sort nul : "T'as vraiment fait ça. En public. Devant des gens. Bon ça passe mais t'as 2 de dégâts, ça te va ?"
- Sort flemmard : "Wow t'as mis 30 secondes de ta vie là-dedans, ça se voit. 1 de dégât. De rien."

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
