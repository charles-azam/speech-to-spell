import { useState, useRef } from "react";
import type { PlayerSide } from "../types";
import { useLanguage } from "../hooks/useLanguage";

interface TextSpellInputProps {
  side: PlayerSide;
  onCast: (player: PlayerSide, text: string) => void;
  disabled: boolean;
}

export function TextSpellInput({ side, onCast, disabled }: TextSpellInputProps) {
  const { t } = useLanguage();
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
        placeholder={t("text.placeholder")}
        disabled={disabled}
        className="flex-1 px-3 py-1.5 text-sm outline-none transition-all duration-200"
        style={{
          fontFamily: "'Crimson Pro', serif",
          fontStyle: "italic",
          background: "var(--bg-surface)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "3px",
          color: "var(--text-primary)",
          opacity: disabled ? 0.35 : 1,
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = "var(--gold-dim)";
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = "var(--border-subtle)";
        }}
      />
      <button
        onClick={handleSubmit}
        disabled={disabled || !value.trim()}
        className="px-4 py-1.5 transition-all duration-200"
        style={{
          fontFamily: "'MedievalSharp', cursive",
          fontSize: "0.8rem",
          letterSpacing: "0.1em",
          background: "linear-gradient(180deg, rgba(201, 168, 76, 0.12) 0%, rgba(201, 168, 76, 0.04) 100%)",
          border: "1px solid var(--gold-dim)",
          borderRadius: "3px",
          color: "var(--gold-bright)",
          opacity: disabled || !value.trim() ? 0.25 : 1,
        }}
      >
        {t("text.cast")}
      </button>
    </div>
  );
}
