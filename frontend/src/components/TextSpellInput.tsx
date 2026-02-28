import { useState, useRef } from "react";
import type { PlayerSide } from "../types";

interface TextSpellInputProps {
  side: PlayerSide;
  onCast: (player: PlayerSide, text: string) => void;
  disabled: boolean;
}

export function TextSpellInput({ side, onCast, disabled }: TextSpellInputProps) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = () => {
    const text = value.trim();
    if (!text || disabled) return;
    onCast(side, text);
    setValue("");
  };

  return (
    <div className="flex gap-2">
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === "Enter") handleSubmit();
        }}
        placeholder="Type a spell..."
        disabled={disabled}
        className="flex-1 bg-white/5 border border-white/10 focus:border-purple-500/50 rounded-lg px-3 py-1.5 text-sm text-white outline-none transition-colors placeholder:text-white/20 disabled:opacity-40"
      />
      <button
        onClick={handleSubmit}
        disabled={disabled || !value.trim()}
        className="px-3 py-1.5 text-xs font-semibold bg-purple-600/40 hover:bg-purple-600/60 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg text-purple-200 transition-colors"
      >
        Cast
      </button>
    </div>
  );
}
