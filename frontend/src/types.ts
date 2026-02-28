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

export type Verdict = "YES" | "NO" | "EXPLAIN";

export interface JudgeVerdictMessage {
  type: "judge_verdict";
  verdict: Verdict;
  comment: string;
  caster: PlayerSide;
  target: PlayerSide;
  spell_name: string | null;
  damage: number;
  visual_effect: VisualEffect | null;
}

export interface GameStateMessage {
  type: "game_state";
  left: { health: number; emoji_hand: string[]; spells_cast?: string[] };
  right: { health: number; emoji_hand: string[]; spells_cast?: string[] };
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
  reason?: string;
}

export interface PlayerJoinedMessage {
  type: "player_joined";
  side: PlayerSide;
  wizard_name: string;
}

export interface PlayerDisconnectedMessage {
  type: "player_disconnected";
  side: PlayerSide;
}

export type ServerMessage =
  | TranscriptionMessage
  | JudgeVerdictMessage
  | GameStateMessage
  | SoundEffectMessage
  | SpellFizzleMessage
  | PlayerJoinedMessage
  | PlayerDisconnectedMessage;

export interface CastSpellMessage {
  type: "cast_spell";
  player: PlayerSide;
  selected_emojis: string[];
  audio?: string; // base64
  text?: string;
}

export interface ExplainSpellMessage {
  type: "explain_spell";
  player: PlayerSide;
  audio?: string;
  text?: string;
}

export interface TextSpellMessage {
  type: "text_spell";
  player: PlayerSide;
  selected_emojis: string[];
  text: string;
}

export type ClientMessage = CastSpellMessage | ExplainSpellMessage | TextSpellMessage;
