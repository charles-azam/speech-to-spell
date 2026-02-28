import { EmojiParticles } from "./EmojiParticles";
import type { PlayerSide } from "../types";

interface WizardPanelProps {
  side: PlayerSide;
  name: string;
  keyBind: string;
  recording: boolean;
  transcription: string | null;
  processing: boolean;
  spellName: string | null;
  hitColor: string | null;
  health: number;
  mana: number;
  emojis: string[];
}

function StatBar({
  value,
  max,
  color,
  label,
}: {
  value: number;
  max: number;
  color: string;
  label: string;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="w-full">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-white/60">{label}</span>
        <span className="text-white/80 font-mono">
          {value}/{max}
        </span>
      </div>
      <div className="h-3 bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

export function WizardPanel({
  side,
  name,
  keyBind,
  recording,
  transcription,
  processing,
  spellName,
  hitColor,
  health,
  mana,
  emojis,
}: WizardPanelProps) {
  const isLeft = side === "left";

  return (
    <div
      className="relative flex flex-col items-center justify-between p-8 rounded-2xl border transition-all duration-500 min-h-[500px] overflow-hidden"
      style={{
        borderColor:
          hitColor ??
          (isLeft ? "rgba(99,102,241,0.3)" : "rgba(245,158,11,0.3)"),
        backgroundColor: hitColor
          ? `color-mix(in srgb, ${hitColor} 15%, transparent)`
          : undefined,
        boxShadow: hitColor
          ? `0 0 40px ${hitColor}44, inset 0 0 60px ${hitColor}22`
          : undefined,
      }}
    >
      {/* Spell name overlay */}
      {spellName && (
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
          style={{
            textShadow: hitColor
              ? `0 0 20px ${hitColor}, 0 0 40px ${hitColor}, 0 0 80px ${hitColor}`
              : undefined,
          }}
        >
          <p className="text-3xl font-black uppercase tracking-wider text-white animate-pulse">
            {spellName}
          </p>
        </div>
      )}

      {/* Emoji particle burst */}
      {emojis.length > 0 && (
        <EmojiParticles emojis={emojis} color={hitColor} />
      )}

      {/* Wizard avatar + name */}
      <div className="flex flex-col items-center gap-4 z-20">
        <div
          className={`text-8xl ${recording ? "animate-bounce" : ""} transition-all`}
        >
          {isLeft ? "\u{1F9D9}" : "\u{1F9D9}\u200D\u2640\uFE0F"}
        </div>
        <h2 className="text-2xl font-bold tracking-wide">{name}</h2>
      </div>

      {/* Health & Mana bars */}
      <div className="w-full flex flex-col gap-2 z-20 my-4">
        <StatBar value={health} max={100} color="#ef4444" label="HP" />
        <StatBar value={mana} max={100} color="#3b82f6" label="Mana" />
      </div>

      {/* Transcription display */}
      <div className="flex-1 flex items-center justify-center w-full my-4 z-20">
        {recording ? (
          <div className="flex flex-col items-center gap-3">
            <div className="flex gap-1">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse [animation-delay:150ms]" />
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse [animation-delay:300ms]" />
            </div>
            <p className="text-red-400 text-sm font-medium uppercase tracking-widest">
              Casting...
            </p>
          </div>
        ) : processing ? (
          <p className="text-yellow-400/70 text-sm italic animate-pulse">
            Transcribing...
          </p>
        ) : transcription ? (
          <p className="text-xl text-center font-medium italic text-white/90 max-w-xs leading-relaxed">
            &ldquo;{transcription}&rdquo;
          </p>
        ) : (
          <p className="text-white/30 text-sm">
            Press{" "}
            <kbd className="px-2 py-1 bg-white/10 rounded text-white/60 font-mono">
              {keyBind.toUpperCase()}
            </kbd>{" "}
            to cast a spell
          </p>
        )}
      </div>

      {/* Key indicator */}
      <div
        className={`w-14 h-14 rounded-xl flex items-center justify-center text-xl font-bold font-mono transition-all duration-150 z-20 ${
          recording
            ? "bg-red-500 text-white scale-110"
            : "bg-white/10 text-white/40"
        }`}
      >
        {keyBind.toUpperCase()}
      </div>
    </div>
  );
}
