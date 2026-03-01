import { useLanguage } from "../hooks/useLanguage";

interface SpellHistoryProps {
  spells: string[];
}

export function SpellHistory({ spells }: SpellHistoryProps) {
  const { t } = useLanguage();

  if (spells.length === 0) return null;

  // Most recent first
  const reversed = [...spells].reverse();

  return (
    <div className="flex flex-col gap-1.5">
      <div className="ornate-rule">
        <span
          style={{
            fontFamily: "'MedievalSharp', cursive",
            fontSize: "10px",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "var(--gold-dim)",
          }}
        >
          {t("spells.title")}
        </span>
      </div>
      <div
        className="flex flex-col gap-0.5 max-h-28 overflow-y-auto"
        style={{ scrollbarWidth: "thin", scrollbarColor: "var(--border-subtle) transparent" }}
      >
        {reversed.map((spell, i) => (
          <p
            key={`${spell}-${i}`}
            className="text-xs text-center truncate"
            style={{
              fontFamily: "'MedievalSharp', cursive",
              color: "var(--text-secondary)",
              opacity: Math.max(0.3, 1 - i * 0.15),
            }}
          >
            {spell}
          </p>
        ))}
      </div>
    </div>
  );
}
