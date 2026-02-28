import { EmojiHand } from "./EmojiHand";
import { TextSpellInput } from "./TextSpellInput";
import { MicSelector } from "./MicSelector";
import type { AudioDevice } from "../hooks/useAudioDevices";
import type { PlayerSide } from "../types";

interface PlayerControlsProps {
  side: PlayerSide;
  hand: string[];
  selectedEmojis: string[];
  onToggle: (emoji: string) => void;
  isExplaining: boolean;
  keyBind: string;
  disabled: boolean;
  devices: AudioDevice[];
  deviceId: string;
  onDeviceChange: (id: string) => void;
  onTextCast: (player: PlayerSide, text: string) => void;
}

export function PlayerControls({
  side,
  hand,
  selectedEmojis,
  onToggle,
  isExplaining,
  keyBind,
  disabled,
  devices,
  deviceId,
  onDeviceChange,
  onTextCast,
}: PlayerControlsProps) {
  if (disabled) return null;

  return (
    <div className="flex flex-col gap-3 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
      {devices.length > 1 && (
        <MicSelector
          devices={devices}
          value={deviceId}
          onChange={onDeviceChange}
        />
      )}

      <EmojiHand
        emojis={hand}
        selectedEmojis={selectedEmojis}
        onToggle={onToggle}
        disabled={false}
      />

      {isExplaining && (
        <p
          className="text-sm text-center"
          style={{ fontFamily: "'Crimson Pro', serif", fontStyle: "italic", color: "var(--amber-warn)" }}
        >
          Le juge veut une explication ! Maintiens [{keyBind}] pour justifier ton sort.
        </p>
      )}

      <TextSpellInput
        side={side}
        onCast={onTextCast}
        disabled={selectedEmojis.length < 2 && !isExplaining}
      />
    </div>
  );
}
