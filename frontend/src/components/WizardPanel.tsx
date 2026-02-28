import { SpellEffect } from "./SpellEffect";
import type { PlayerSide, VisualEffect } from "../types";

interface WizardPanelProps {
  side: PlayerSide;
  name: string;
  isActive: boolean;
  recording: boolean;
  transcription: string | null;
  processing: boolean;
  spellName: string | null;
  hitColor: string | null;
  health: number;
  visualEffect: VisualEffect | null;
}

function HealthBar({ value, max }: { value: number; max: number }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const color = pct > 50 ? "#22c55e" : pct > 25 ? "#eab308" : "#ef4444";
  return (
    <div className="w-full">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-white/60 font-medium">HP</span>
        <span className="text-white/80 font-mono">
          {value}/{max}
        </span>
      </div>
      <div className="h-4 bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${pct}%`,
            backgroundColor: color,
            boxShadow: `0 0 8px ${color}66`,
          }}
        />
      </div>
    </div>
  );
}

export function WizardPanel({
  side,
  name,
  isActive,
  recording,
  transcription,
  processing,
  spellName,
  hitColor,
  health,
  visualEffect,
}: WizardPanelProps) {
  const isLeft = side === "left";

  return (
    <div
      className={`
        relative flex flex-col items-center justify-between p-6 rounded-2xl border
        transition-all duration-500 min-h-[350px] overflow-hidden
        ${isActive ? "animate-turn-glow" : "opacity-60"}
      `}
      style={{
        borderColor:
          hitColor ??
          (isActive
            ? "rgba(168,85,247,0.4)"
            : isLeft
              ? "rgba(99,102,241,0.15)"
              : "rgba(245,158,11,0.15)"),
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
          <p className="text-2xl font-black uppercase tracking-wider text-white animate-pulse">
            {spellName}
          </p>
        </div>
      )}

      {/* Visual spell effect */}
      {visualEffect && <SpellEffect effect={visualEffect} />}

      {/* Wizard avatar + name */}
      <div className="flex flex-col items-center gap-3 z-20">
        <div
          className={`text-7xl ${recording ? "animate-bounce" : ""} transition-all`}
        >
          {isLeft ? "\u{1F9D9}" : "\u{1F9D9}\u200D\u2640\uFE0F"}
        </div>
        <h2 className="text-xl font-bold tracking-wide">{name}</h2>
        {isActive && (
          <span className="text-xs text-purple-300/80 uppercase tracking-[0.2em] font-medium">
            A ton tour !
          </span>
        )}
        {!isActive && (
          <span className="text-xs text-white/20 uppercase tracking-[0.2em]">
            En attente...
          </span>
        )}
      </div>

      {/* Health bar */}
      <div className="w-full z-20 my-4">
        <HealthBar value={health} max={100} />
      </div>

      {/* Transcription display */}
      <div className="flex-1 flex items-center justify-center w-full my-2 z-20">
        {recording ? (
          <div className="flex flex-col items-center gap-3">
            <div className="flex gap-1">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse [animation-delay:150ms]" />
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse [animation-delay:300ms]" />
            </div>
            <p className="text-red-400 text-sm font-medium uppercase tracking-widest">
              Incantation...
            </p>
          </div>
        ) : processing ? (
          <p className="text-yellow-400/70 text-sm italic animate-pulse">
            Le juge ecoute...
          </p>
        ) : transcription ? (
          <p className="text-lg text-center font-medium italic text-white/90 max-w-xs leading-relaxed">
            &ldquo;{transcription}&rdquo;
          </p>
        ) : null}
      </div>
    </div>
  );
}
