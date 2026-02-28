export type PlayerSide = "left" | "right";

export interface PlayerState {
  side: PlayerSide;
  name: string;
  key: string;
  recording: boolean;
  transcription: string | null;
}

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
}

export type ServerMessage = TranscriptionMessage | SpellResultMessage;

export interface AudioMessage {
  type: "audio";
  player: PlayerSide;
  audio: string; // base64
}
