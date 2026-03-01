import { useRef, useCallback } from "react";
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
  recording: boolean;
  devices: AudioDevice[];
  deviceId: string;
  onDeviceChange: (id: string) => void;
  onTextCast: (player: PlayerSide, text: string) => void;
  onHoldStart: () => void;
  onHoldEnd: () => void;
}

export function PlayerControls({
  side,
  hand,
  inferredEmojis,
  isExplaining,
  keyBind,
  disabled,
  recording,
  devices,
  deviceId,
  onDeviceChange,
  onTextCast,
  onHoldStart,
  onHoldEnd,
}: PlayerControlsProps) {
  const { t } = useLanguage();
  const holdingRef = useRef(false);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    holdingRef.current = true;
    onHoldStart();
  }, [onHoldStart]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    if (holdingRef.current) {
      holdingRef.current = false;
      onHoldEnd();
    }
  }, [onHoldEnd]);

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

      {/* Hold-to-cast button (touch + mouse) */}
      <button
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="w-full py-4 rounded-lg text-base font-semibold tracking-wider select-none touch-none transition-all"
        style={{
          fontFamily: "'MedievalSharp', cursive",
          background: recording
            ? "linear-gradient(135deg, var(--crimson), #8b1a1a)"
            : "linear-gradient(135deg, var(--gold-dim), var(--gold))",
          color: recording ? "#fff" : "var(--bg-deep)",
          border: recording ? "1px solid var(--crimson)" : "1px solid var(--gold)",
          boxShadow: recording
            ? "0 0 20px var(--crimson-glow)"
            : "0 0 10px rgba(201, 168, 76, 0.15)",
        }}
      >
        {recording ? t("wizard.casting") : `${t("wizard.holdKey").replace("{key}", keyBind)} / Hold`}
      </button>

      <TextSpellInput
        side={side}
        onCast={onTextCast}
        disabled={false}
      />
    </div>
  );
}
