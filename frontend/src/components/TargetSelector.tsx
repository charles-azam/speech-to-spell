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
    <div className="flex gap-2 justify-center">
      <button
        onClick={() => onSelect("attack")}
        disabled={disabled}
        className={`
          px-4 py-2 rounded-lg text-sm font-bold uppercase tracking-wider
          transition-all duration-150
          ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}
          ${
            target === "attack"
              ? "bg-red-500/30 text-red-300 ring-2 ring-red-400 shadow-[0_0_12px_rgba(239,68,68,0.3)]"
              : "bg-white/5 text-white/40 hover:bg-white/10"
          }
        `}
      >
        <span className="mr-1.5">&#x2694;&#xFE0F;</span>
        Attack
      </button>
      <button
        onClick={() => onSelect("heal")}
        disabled={disabled}
        className={`
          px-4 py-2 rounded-lg text-sm font-bold uppercase tracking-wider
          transition-all duration-150
          ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}
          ${
            target === "heal"
              ? "bg-green-500/30 text-green-300 ring-2 ring-green-400 shadow-[0_0_12px_rgba(34,197,94,0.3)]"
              : "bg-white/5 text-white/40 hover:bg-white/10"
          }
        `}
      >
        <span className="mr-1.5">&#x1F49A;</span>
        Heal
      </button>
    </div>
  );
}
