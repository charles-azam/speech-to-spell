import { SpellEffect } from "./SpellEffect";
import type { PlayerSide, VisualEffect } from "../types";
import { useLanguage } from "../hooks/useLanguage";

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
  visualEffect: VisualEffect | null;
}

function HealthBar({ value, max }: { value: number; max: number }) {
  const { t } = useLanguage();
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const color = pct > 50 ? "var(--emerald)" : pct > 25 ? "var(--amber-warn)" : "var(--crimson)";
  const glowColor = pct > 50 ? "var(--emerald-glow)" : pct > 25 ? "rgba(217, 119, 6, 0.3)" : "var(--crimson-glow)";

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-1.5">
        <div className="flex items-center gap-1.5">
          <span style={{ fontSize: "12px" }}>{pct > 25 ? "\u2764\uFE0F" : "\u{1F494}"}</span>
          <span
            className="text-xs uppercase tracking-[0.15em]"
            style={{ fontFamily: "'MedievalSharp', cursive", color: "var(--text-secondary)" }}
          >
            {t("wizard.health")}
          </span>
        </div>
        <span
          className="text-sm font-semibold tabular-nums"
          style={{ fontFamily: "'Crimson Pro', serif", color: "var(--text-primary)" }}
        >
          {value}
          <span style={{ color: "var(--text-dim)" }}>/{max}</span>
        </span>
      </div>
      {/* Ornate HP bar */}
      <div
        className="relative h-5 overflow-hidden"
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "2px",
        }}
      >
        <div
          className="h-full transition-all duration-700 ease-out"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(180deg, ${color}, color-mix(in srgb, ${color} 60%, black))`,
            boxShadow: `0 0 12px ${glowColor}, inset 0 1px 0 rgba(255,255,255,0.2)`,
            borderRadius: "1px",
          }}
        />
        {/* Decorative notches */}
        <div className="absolute inset-0 flex" style={{ pointerEvents: "none" }}>
          {[25, 50, 75].map((mark) => (
            <div
              key={mark}
              className="absolute top-0 bottom-0 w-px"
              style={{ left: `${mark}%`, background: "rgba(255,255,255,0.08)" }}
            />
          ))}
        </div>
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
  visualEffect,
}: WizardPanelProps) {
  const { t } = useLanguage();
  const isLeft = side === "left";

  return (
    <div
      className="ornate-card ornate-card-bottom relative flex flex-col items-center justify-between p-6 transition-all duration-500 min-h-[340px]"
      style={{
        borderColor: hitColor ?? "var(--border-active)",
        backgroundColor: hitColor
          ? `color-mix(in srgb, ${hitColor} 10%, var(--bg-card))`
          : "var(--bg-card)",
        boxShadow: hitColor
          ? `0 0 50px ${hitColor}33, inset 0 0 40px ${hitColor}11`
          : undefined,
        transition: "all 0.5s ease",
      }}
    >
      {/* Spell name overlay */}
      {spellName && (
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
          style={{
            textShadow: hitColor
              ? `0 0 20px ${hitColor}, 0 0 40px ${hitColor}, 0 0 80px ${hitColor}`
              : `0 0 20px var(--gold), 0 0 40px var(--gold)`,
          }}
        >
          <p
            className="text-2xl font-bold uppercase tracking-[0.15em] animate-pulse"
            style={{ fontFamily: "'MedievalSharp', cursive", color: "var(--text-primary)" }}
          >
            {spellName}
          </p>
        </div>
      )}

      {/* Visual spell effect */}
      {visualEffect && <SpellEffect effect={visualEffect} />}

      {/* Wizard avatar + name */}
      <div className="flex flex-col items-center gap-2 z-20">
        <div
          className={`text-7xl select-none transition-all duration-300 ${recording ? "animate-bounce" : ""}`}
          style={{
            filter: "drop-shadow(0 0 12px rgba(201, 168, 76, 0.3))",
          }}
        >
          {isLeft ? "\u{1F9D9}" : "\u{1F9D9}\u200D\u2640\uFE0F"}
        </div>
        <h2
          className="text-xl tracking-wide"
          style={{ fontFamily: "'MedievalSharp', cursive", color: "var(--gold-bright)" }}
        >
          {name}
        </h2>
        {keyBind && (
          <span
            className="text-xs uppercase tracking-[0.25em]"
            style={{ fontFamily: "'MedievalSharp', cursive", color: "var(--gold)" }}
          >
            {t("wizard.holdKey").replace("{key}", keyBind)}
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
            <div className="flex gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ backgroundColor: "var(--crimson)" }} />
              <span className="w-2.5 h-2.5 rounded-full animate-pulse [animation-delay:150ms]" style={{ backgroundColor: "var(--crimson)" }} />
              <span className="w-2.5 h-2.5 rounded-full animate-pulse [animation-delay:300ms]" style={{ backgroundColor: "var(--crimson)" }} />
            </div>
            <p
              className="text-sm uppercase tracking-[0.2em]"
              style={{ fontFamily: "'MedievalSharp', cursive", color: "var(--crimson)" }}
            >
              {t("wizard.casting")}
            </p>
          </div>
        ) : processing ? (
          <p className="text-sm italic animate-pulse" style={{ color: "var(--gold-dim)" }}>
            {t("wizard.judgeListening")}
          </p>
        ) : transcription ? (
          <p
            className="text-lg text-center italic leading-relaxed max-w-xs"
            style={{ fontFamily: "'Crimson Pro', serif", color: "var(--text-primary)" }}
          >
            &ldquo;{transcription}&rdquo;
          </p>
        ) : null}
      </div>
    </div>
  );
}
