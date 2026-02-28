export type PlayerSide = "left" | "right";

export interface TranscriptionMessage {
  type: "transcription";
  player: PlayerSide;
  text: string;
}

export type EffectTemplate =
  | "explosion"
  | "swirl"
  | "rain"
  | "wave_left"
  | "wave_right"
  | "shatter"
  | "pulse"
  | "spiral"
  | "rise";

export interface VisualEffect {
  template: EffectTemplate;
  primary_color: string;
  secondary_color: string;
  particle_count: number;
  scale: number;
  duration_s: number;
  emojis: string[];
}

export interface SpellResultMessage {
  type: "spell_result";
  caster: PlayerSide;
  target: PlayerSide;
  spell_name: string | null;
  color: string | null;
  damage: number;
  mana_cost: number;
  visual_effect: VisualEffect | null;
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

export interface TextSpellMessage {
  type: "text_spell";
  player: PlayerSide;
  text: string;
}

export type ClientMessage = AudioMessage | TextSpellMessage;
