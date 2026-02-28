export type PlayerSide = "left" | "right";

export interface TranscriptionMessage {
  type: "transcription";
  player: PlayerSide;
  text: string;
}

export interface SpellResultMessage {
  type: "spell_result";
  caster: PlayerSide;
  target: PlayerSide;
  spell_name: string | null;
  color: string | null;
  damage: number;
  mana_cost: number;
  emojis: string[];
}

export interface GameStateMessage {
  type: "game_state";
  left: { health: number; mana: number };
  right: { health: number; mana: number };
  turn_number: number;
  winner: string | null;
}

export interface SoundEffectMessage {
  type: "sound_effect";
  audio: string; // base64 mp3
}

export interface SpellFizzleMessage {
  type: "spell_fizzle";
  player: PlayerSide;
}

export type ServerMessage =
  | TranscriptionMessage
  | SpellResultMessage
  | GameStateMessage
  | SoundEffectMessage
  | SpellFizzleMessage;

export interface AudioMessage {
  type: "audio";
  player: PlayerSide;
  audio: string; // base64
}
