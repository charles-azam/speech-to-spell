import type { CommentatorSpeaker } from "../types";

interface CommentatorPanelProps {
  currentSpeaker: CommentatorSpeaker | null;
}

function CommentatorAvatar({
  name,
  emoji,
  speaking,
  side,
}: {
  name: string;
  emoji: string;
  speaking: boolean;
  side: "left" | "right";
}) {
  const glowColor = side === "left" ? "rgba(59, 130, 246, 0.6)" : "rgba(236, 72, 153, 0.6)";
  const nameColor = side === "left" ? "#60a5fa" : "#f472b6";

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className={`text-4xl select-none transition-all duration-300 ${speaking ? "scale-110" : "scale-100 opacity-50"}`}
        style={{
          filter: speaking
            ? `drop-shadow(0 0 12px ${glowColor}) drop-shadow(0 0 24px ${glowColor})`
            : "none",
        }}
      >
        {emoji}
      </div>
      {/* Sound wave bars */}
      <div className="flex items-end gap-[2px] h-3">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="w-[3px] rounded-full transition-all duration-150"
            style={{
              backgroundColor: speaking ? nameColor : "var(--text-dim)",
              height: speaking ? `${6 + Math.sin(i * 1.2) * 6}px` : "2px",
              opacity: speaking ? 1 : 0.3,
              animation: speaking ? `commentator-bar ${0.4 + i * 0.1}s ease-in-out infinite alternate` : "none",
            }}
          />
        ))}
      </div>
      <span
        className="text-[10px] font-semibold tracking-[0.15em] uppercase transition-opacity duration-300"
        style={{
          fontFamily: "'Crimson Pro', serif",
          color: speaking ? nameColor : "var(--text-dim)",
          opacity: speaking ? 1 : 0.5,
        }}
      >
        {name}
      </span>
    </div>
  );
}

export function CommentatorPanel({ currentSpeaker }: CommentatorPanelProps) {
  return (
    <div className="flex flex-col items-center w-64 mt-2">
      {/* Separator */}
      <div className="ornate-rule mb-3 w-full px-2" style={{ color: "var(--gold-dim)" }}>
        <span
          style={{
            fontFamily: "'MedievalSharp', cursive",
            fontSize: "9px",
            letterSpacing: "0.3em",
            textTransform: "uppercase",
          }}
        >
          Commentateurs
        </span>
      </div>

      {/* Two commentators side by side */}
      <div className="flex items-center justify-center gap-6">
        <CommentatorAvatar
          name="Marc"
          emoji={"\u{1F468}\u200D\u{1F3A4}"}
          speaking={currentSpeaker === "marc"}
          side="left"
        />
        <div
          className="text-xs italic"
          style={{
            fontFamily: "'Crimson Pro', serif",
            color: "var(--text-dim)",
            opacity: 0.4,
          }}
        >
          &amp;
        </div>
        <CommentatorAvatar
          name="Sophie"
          emoji={"\u{1F469}\u200D\u{1F3A4}"}
          speaking={currentSpeaker === "sophie"}
          side="right"
        />
      </div>

      {/* CSS animation for sound bars */}
      <style>{`
        @keyframes commentator-bar {
          0% { transform: scaleY(0.3); }
          100% { transform: scaleY(1); }
        }
      `}</style>
    </div>
  );
}
