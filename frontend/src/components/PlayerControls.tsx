import { EmojiHand } from "./EmojiHand";
import { TextSpellInput } from "./TextSpellInput";
import { MicSelector } from "./MicSelector";
import type { AudioDevice } from "../hooks/useAudioDevices";
import type { PlayerSide } from "../types";
import { useLanguage } from "../hooks/useLanguage";

interface PlayerControlsProps {
  side: PlayerSide;
  hand: string[];
  inferredEmojis: string[];
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
  inferredEmojis,
  isExplaining,
  keyBind,
  disabled,
  devices,
  deviceId,
  onDeviceChange,
  onTextCast,
}: PlayerControlsProps) {
  const { t } = useLanguage();

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
        inferredEmojis={inferredEmojis}
      />

      {isExplaining && (
        <p
          className="text-sm text-center"
          style={{ fontFamily: "'Crimson Pro', serif", fontStyle: "italic", color: "var(--amber-warn)" }}
        >
          {t("controls.explainPrompt").replace("{key}", keyBind)}
        </p>
      )}

      <TextSpellInput
        side={side}
        onCast={onTextCast}
        disabled={false}
      />
    </div>
  );
}
