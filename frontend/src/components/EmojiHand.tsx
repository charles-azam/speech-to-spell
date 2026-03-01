import { useLanguage } from "../hooks/useLanguage";

interface EmojiHandProps {
  emojis: string[];
  selectedEmojis: string[];
  onToggle: (emoji: string) => void;
  disabled: boolean;
}

export function EmojiHand({
  emojis,
  selectedEmojis,
  onToggle,
  disabled,
}: EmojiHandProps) {
  const { t } = useLanguage();
  const selectedCount = selectedEmojis.length;

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex justify-between items-center px-1">
        <div className="ornate-rule flex-1">
          <span
            style={{
              fontFamily: "'MedievalSharp', cursive",
              fontSize: "10px",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "var(--gold-dim)",
            }}
          >
            {t("emoji.hand")}
          </span>
        </div>
        <span
          className="ml-3 text-xs tabular-nums"
          style={{
            fontFamily: "'Crimson Pro', serif",
            color: selectedCount >= 2 ? "var(--emerald)" : "var(--amber-warn)",
          }}
        >
          {selectedCount} {selectedCount < 2 ? t("emoji.min2") : t("emoji.selected")}
        </span>
      </div>

      {/* Emoji grid */}
      <div className="flex flex-wrap gap-2 justify-center">
        {emojis.map((emoji, idx) => {
          const isSelected = selectedEmojis.includes(emoji);
          return (
            <button
              key={`${emoji}-${idx}`}
              onClick={() => onToggle(emoji)}
              disabled={disabled}
              className="select-none transition-all duration-150"
              style={{
                width: "46px",
                height: "46px",
                fontSize: "1.6rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: isSelected
                  ? "linear-gradient(180deg, rgba(201, 168, 76, 0.15) 0%, rgba(201, 168, 76, 0.05) 100%)"
                  : "var(--bg-surface)",
                border: `1px solid ${isSelected ? "var(--gold)" : "var(--border-subtle)"}`,
                borderRadius: "4px",
                boxShadow: isSelected
                  ? "0 0 16px rgba(201, 168, 76, 0.25), inset 0 0 12px rgba(201, 168, 76, 0.08)"
                  : "none",
                transform: isSelected ? "scale(1.1) translateY(-2px)" : "scale(1)",
                opacity: disabled ? 0.35 : 1,
                cursor: disabled ? "not-allowed" : undefined,
              }}
              onMouseEnter={(e) => {
                if (!disabled && !isSelected) {
                  e.currentTarget.style.borderColor = "var(--gold-dim)";
                  e.currentTarget.style.background = "var(--bg-card-hover)";
                  e.currentTarget.style.transform = "scale(1.08)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.borderColor = "var(--border-subtle)";
                  e.currentTarget.style.background = "var(--bg-surface)";
                  e.currentTarget.style.transform = "scale(1)";
                }
              }}
            >
              {emoji}
            </button>
          );
        })}
      </div>

      {/* Selected preview */}
      {selectedCount > 0 && (
        <div className="flex items-center justify-center gap-1 text-2xl">
          {selectedEmojis.map((emoji, i) => (
            <span key={`sel-${i}`} className="animate-pulse" style={{ animationDelay: `${i * 100}ms` }}>
              {emoji}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
