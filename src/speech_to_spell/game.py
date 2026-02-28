import random

from pydantic import BaseModel

MAX_HEALTH = 100
HAND_SIZE = 10

EMOJI_BANK = [
    # Animals
    "🐱", "🐶", "🐺", "🦊", "🐻", "🐼", "🐨", "🐯", "🦁", "🐮",
    "🐷", "🐸", "🐵", "🐔", "🐧", "🐦", "🐤", "🦅", "🦇", "🐝",
    "🐛", "🦋", "🐌", "🐞", "🐜", "🦂", "🐍", "🦎", "🐢", "🐙",
    "🦑", "🦀", "🐡", "🐠", "🐟", "🐬", "🐳", "🦈", "🐊", "🐅",
    "🦍", "🦧", "🐘", "🦏", "🐪", "🦒", "🦘", "🐎", "🦄", "🐉",
    # Nature & Elements
    "🔥", "💧", "❄️", "⚡", "🌊", "🌪️", "🌋", "💨", "☀️", "🌙",
    "⭐", "🌟", "💫", "✨", "☄️", "🌈", "☁️", "⛈️", "🌿", "🍀",
    "🌸", "🌺", "🌻", "🌹", "🍄", "🌵", "🎋", "🍂", "🍁", "🌾",
    # Food & Drink
    "🍎", "🍋", "🍌", "🍉", "🍇", "🍓", "🫐", "🍑", "🥥", "🌶️",
    "🧄", "🧅", "🥕", "🌽", "🥦", "🍔", "🍕", "🌮", "🍣", "🍩",
    "🎂", "🍫", "🍬", "🧁", "🍪", "🥤", "☕", "🍷", "🍺", "🧃",
    # Objects & Tools
    "⚔️", "🗡️", "🏹", "🛡️", "🔮", "💎", "💰", "🪙", "🧲", "🔑",
    "🗝️", "🔒", "📿", "🧿", "🪄", "🎭", "👑", "💍", "🎩", "🧪",
    "⚗️", "🔔", "📯", "🎺", "🥁", "🎸", "🎵", "🎶", "📖", "📜",
    "🕯️", "🏮", "🪔", "💣", "🧨", "🎆", "🎇", "🎪", "🎲", "🃏",
    # Fantasy & Symbols
    "💀", "👻", "👽", "🤖", "👾", "😈", "👿", "💩", "🧙", "🧛",
    "🧟", "🧞", "🧜", "🧚", "👼", "🦸", "🦹", "🥷", "🏴‍☠️", "⚓",
    "🪦", "⚰️", "🔱", "⚜️", "🏺", "🗿", "🪬", "🧿", "🪶", "🐚",
    # Hearts & Energy
    "❤️", "🖤", "💜", "💙", "💚", "💛", "🤍", "💔", "❤️‍🔥", "💝",
    "💗", "💖", "💞", "🫀", "🧠", "👁️", "👀", "🦴", "💪", "🤝",
    # Space & Weather
    "🪐", "🌍", "🌑", "🌕", "🛸", "🚀", "🌌", "🕳️",
]


class PlayerState(BaseModel):
    health: int = MAX_HEALTH
    emoji_hand: list[str] = []
    spells_cast: list[str] = []


class GameState(BaseModel):
    left: PlayerState = PlayerState()
    right: PlayerState = PlayerState()
    turn_number: int = 0
    winner: str | None = None


def deal_hand(count: int = HAND_SIZE) -> list[str]:
    """Deal a hand of random emojis from the bank."""
    return random.sample(EMOJI_BANK, k=min(count, len(EMOJI_BANK)))


def create_game() -> GameState:
    """Create a new game with hands dealt to both players."""
    return GameState(
        left=PlayerState(emoji_hand=deal_hand()),
        right=PlayerState(emoji_hand=deal_hand()),
    )


def consume_and_refill(game: GameState, player: str, used_emojis: list[str]) -> GameState:
    """Remove used emojis from a player's hand and refill to HAND_SIZE."""
    player_state = game.left if player == "left" else game.right

    # Remove used emojis from hand
    remaining = list(player_state.emoji_hand)
    for emoji in used_emojis:
        if emoji in remaining:
            remaining.remove(emoji)

    # Refill to HAND_SIZE with new random emojis
    needed = HAND_SIZE - len(remaining)
    if needed > 0:
        new_emojis = random.sample(EMOJI_BANK, k=min(needed, len(EMOJI_BANK)))
        remaining.extend(new_emojis)

    player_state.emoji_hand = remaining
    return game


def apply_spell(
    game: GameState,
    caster: str,
    target: str,
    damage: int,
    spell_name: str | None = None,
) -> GameState:
    """Apply a spell's effects to the game state. Returns updated state.

    If target == caster, this is a heal (capped at MAX_HEALTH).
    If target == opponent, this is damage.
    """
    target_state = game.left if target == "left" else game.right
    caster_state = game.left if caster == "left" else game.right

    if target == caster:
        # Heal
        target_state.health = min(MAX_HEALTH, target_state.health + damage)
    else:
        # Damage
        target_state.health = max(0, target_state.health - damage)

    # Track spells
    if spell_name:
        caster_state.spells_cast.append(spell_name)

    game.turn_number += 1

    # Check win condition
    opponent = "right" if caster == "left" else "left"
    opponent_state = game.left if opponent == "left" else game.right
    if opponent_state.health <= 0:
        game.winner = caster

    return game


def format_game_context(game: GameState, caster: str) -> str:
    """Format game state as text for the LLM."""
    target = "right" if caster == "left" else "left"
    caster_state = game.left if caster == "left" else game.right
    target_state = game.left if target == "left" else game.right

    lines = [
        f"Turn {game.turn_number + 1}",
        f"Caster — HP: {caster_state.health}/{MAX_HEALTH}",
        f"Opponent — HP: {target_state.health}/{MAX_HEALTH}",
    ]

    if caster_state.spells_cast:
        recent = caster_state.spells_cast[-5:]
        lines.append(f"Caster's recent spells: {', '.join(recent)}")

    if target_state.spells_cast:
        recent = target_state.spells_cast[-5:]
        lines.append(f"Opponent's recent spells: {', '.join(recent)}")

    return "\n".join(lines)
