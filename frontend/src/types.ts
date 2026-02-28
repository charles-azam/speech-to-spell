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

export type ServerMessage =
  | TranscriptionMessage
  | SpellResultMessage
  | GameStateMessage
  | SoundEffectMessage;

export interface AudioMessage {
  type: "audio";
  player: PlayerSide;
  audio: string; // base64
}
