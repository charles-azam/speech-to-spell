from pydantic import BaseModel

from speech_to_spell.spell import SpellResult

MAX_HEALTH = 100
MAX_MANA = 100


class PlayerState(BaseModel):
    health: int = MAX_HEALTH
    mana: int = MAX_MANA
    spells_cast: list[str] = []


class GameState(BaseModel):
    left: PlayerState = PlayerState()
    right: PlayerState = PlayerState()
    turn_number: int = 0
    winner: str | None = None


def apply_spell(
    game: GameState,
    caster: str,
    spell: SpellResult,
) -> GameState:
    """Apply a spell's effects to the game state. Returns updated state."""
    caster_state = game.left if caster == "left" else game.right
    target = "right" if caster == "left" else "left"
    target_state = game.left if target == "left" else game.right

    # Deduct mana (can't go below 0)
    actual_mana_cost = min(spell.mana_cost, caster_state.mana)
    caster_state.mana -= actual_mana_cost

    # If caster didn't have enough mana, scale damage down proportionally
    if spell.mana_cost > 0 and actual_mana_cost < spell.mana_cost:
        damage_ratio = actual_mana_cost / spell.mana_cost
        actual_damage = int(spell.damage * damage_ratio)
    else:
        actual_damage = spell.damage

    # Apply damage
    target_state.health = max(0, target_state.health - actual_damage)

    # Track spells
    if spell.spell_name:
        caster_state.spells_cast.append(spell.spell_name)

    game.turn_number += 1

    # Check win condition
    if target_state.health <= 0:
        game.winner = caster

    return game


def format_game_context(game: GameState, caster: str) -> str:
    """Format game state as text for the LLM."""
    target = "right" if caster == "left" else "left"
    caster_state = game.left if caster == "left" else game.right
    target_state = game.left if target == "left" else game.right

    lines = [
        f"Turn {game.turn_number + 1}",
        f"Caster — HP: {caster_state.health}/{MAX_HEALTH}, Mana: {caster_state.mana}/{MAX_MANA}",
        f"Opponent — HP: {target_state.health}/{MAX_HEALTH}, Mana: {target_state.mana}/{MAX_MANA}",
    ]

    if caster_state.spells_cast:
        recent = caster_state.spells_cast[-5:]
        lines.append(f"Caster's recent spells: {', '.join(recent)}")

    return "\n".join(lines)
