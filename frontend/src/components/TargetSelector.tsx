interface TargetSelectorProps {
  target: "attack" | "heal";
  onSelect: (target: "attack" | "heal") => void;
  disabled: boolean;
}

export function TargetSelector({
  target,
  onSelect,
  disabled,
}: TargetSelectorProps) {
  return (
    <div className="flex gap-3 justify-center">
      <button
        onClick={() => onSelect("attack")}
        disabled={disabled}
        className="flex-1 flex items-center justify-center gap-2 py-2.5 transition-all duration-200"
        style={{
          fontFamily: "'MedievalSharp', cursive",
          fontSize: "0.9rem",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          background: target === "attack"
            ? "linear-gradient(180deg, rgba(198, 40, 40, 0.2) 0%, rgba(198, 40, 40, 0.06) 100%)"
            : "var(--bg-surface)",
          border: `1px solid ${target === "attack" ? "var(--crimson)" : "var(--border-subtle)"}`,
          color: target === "attack" ? "#ef5350" : "var(--text-dim)",
          boxShadow: target === "attack"
            ? "0 0 20px var(--crimson-glow), inset 0 0 15px rgba(198, 40, 40, 0.08)"
            : "none",
          opacity: disabled ? 0.35 : 1,
          borderRadius: "4px",
        }}
      >
        <span>&#x2694;&#xFE0F;</span>
        Attaque
      </button>
      <button
        onClick={() => onSelect("heal")}
        disabled={disabled}
        className="flex-1 flex items-center justify-center gap-2 py-2.5 transition-all duration-200"
        style={{
          fontFamily: "'MedievalSharp', cursive",
          fontSize: "0.9rem",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          background: target === "heal"
            ? "linear-gradient(180deg, rgba(46, 125, 50, 0.2) 0%, rgba(46, 125, 50, 0.06) 100%)"
            : "var(--bg-surface)",
          border: `1px solid ${target === "heal" ? "var(--emerald)" : "var(--border-subtle)"}`,
          color: target === "heal" ? "#66bb6a" : "var(--text-dim)",
          boxShadow: target === "heal"
            ? "0 0 20px var(--emerald-glow), inset 0 0 15px rgba(46, 125, 50, 0.08)"
            : "none",
          opacity: disabled ? 0.35 : 1,
          borderRadius: "4px",
        }}
      >
        <span>&#x1F49A;</span>
        Soin
      </button>
    </div>
  );
}
