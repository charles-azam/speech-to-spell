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

export interface AudioMessage {
  type: "audio";
  player: PlayerSide;
  audio: string; // base64
}
