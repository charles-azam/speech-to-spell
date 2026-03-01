import { useLanguage } from "../hooks/useLanguage";

interface EmojiHandProps {
  emojis: string[];
  inferredEmojis: string[];
}

export function EmojiHand({
  emojis,
  inferredEmojis,
}: EmojiHandProps) {
  const { t } = useLanguage();
  const hasInferred = inferredEmojis.length > 0;

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
      </div>

      {/* Emoji grid */}
      <div className="flex flex-wrap gap-2 justify-center">
        {emojis.map((emoji, idx) => {
          const isInferred = hasInferred && inferredEmojis.includes(emoji);
          return (
            <div
              key={`${emoji}-${idx}`}
              className="select-none transition-all duration-300"
              style={{
                width: "46px",
                height: "46px",
                fontSize: "1.6rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: isInferred
                  ? "linear-gradient(180deg, rgba(201, 168, 76, 0.2) 0%, rgba(201, 168, 76, 0.08) 100%)"
                  : "var(--bg-surface)",
                border: `1px solid ${isInferred ? "var(--gold)" : "var(--border-subtle)"}`,
                borderRadius: "4px",
                boxShadow: isInferred
                  ? "0 0 20px rgba(201, 168, 76, 0.4), inset 0 0 12px rgba(201, 168, 76, 0.1)"
                  : "none",
                transform: isInferred ? "scale(1.15) translateY(-3px)" : "scale(1)",
                opacity: hasInferred && !isInferred ? 0.3 : 1,
              }}
            >
              {emoji}
            </div>
          );
        })}
      </div>

      {/* Inferred preview */}
      {hasInferred && (
        <div className="flex items-center justify-center gap-1 text-2xl">
          {inferredEmojis.map((emoji, i) => (
            <span key={`inf-${i}`} className="animate-pulse" style={{ animationDelay: `${i * 100}ms` }}>
              {emoji}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
