import random
import string
from pydantic import BaseModel
from speech_to_spell.spell import SpellResult


class Player(BaseModel):
    name: str
    hp: int = 100
    mana: int = 100
    index: int = 0


class GameState(BaseModel):
    room_code: str
    phase: str = "waiting"  # waiting, playing, finished
    players: list[Player] = []
    current_turn: int = 0  # index of player whose turn it is
    spell_history: list[str] = []  # spell names for repetition tracking
    winner: str | None = None
    last_spell: dict | None = None  # last spell result for display


# In-memory game storage
games: dict[str, GameState] = {}
# Map: room_code -> list of WebSocket connections (index = player index)
room_connections: dict[str, list] = {}


def generate_room_code() -> str:
    while True:
        code = ''.join(random.choices(string.ascii_uppercase, k=4))
        if code not in games:
            return code


def create_game(player_name: str) -> GameState:
    code = generate_room_code()
    player = Player(name=player_name, index=0)
    game = GameState(room_code=code, players=[player])
    games[code] = game
    room_connections[code] = [None, None]
    return game


def join_game(room_code: str, player_name: str) -> GameState | str:
    """Returns GameState on success or error string on failure."""
    code = room_code.upper()
    if code not in games:
        return "Room not found"
    game = games[code]
    if len(game.players) >= 2:
        return "Room is full"
    player = Player(name=player_name, index=1)
    game.players.append(player)
    game.phase = "playing"
    game.current_turn = 0  # player 0 goes first
    return game


def apply_spell(game: GameState, caster_index: int, spell: SpellResult) -> GameState:
    """Apply spell effects to game state. Returns updated game."""
    caster = game.players[caster_index]
    target_index = 1 - caster_index
    target = game.players[target_index]

    # Deduct mana (reduced power if not enough)
    power_mult = 1.0
    if caster.mana < spell.mana_cost:
        if caster.mana < 5:
            power_mult = 0.5
        else:
            power_mult = caster.mana / spell.mana_cost
    caster.mana = max(0, caster.mana - spell.mana_cost)

    # Apply damage
    actual_damage = int(spell.damage * power_mult)
    target.hp = max(0, target.hp - actual_damage)

    # Track spell history
    game.spell_history.append(spell.spell_name)

    # Store last spell for display
    game.last_spell = spell.model_dump()
    game.last_spell["actual_damage"] = actual_damage
    game.last_spell["caster"] = caster.name
    game.last_spell["target"] = target.name

    # Check win condition
    if target.hp <= 0:
        game.phase = "finished"
        game.winner = caster.name
    else:
        # Advance turn + mana regen for next caster
        game.current_turn = target_index
        # Regen 5 mana for the player who is about to take their turn
        game.players[target_index].mana = min(100, game.players[target_index].mana + 5)

    return game


def get_game(room_code: str) -> GameState | None:
    return games.get(room_code.upper())


def game_state_dict(game: GameState) -> dict:
    """Serialize game state for sending to clients."""
    return game.model_dump()
