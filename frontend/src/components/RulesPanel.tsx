import { useLanguage } from "../hooks/useLanguage";

interface RulesPanelProps {
  onClose: () => void;
}

export function RulesPanel({ onClose }: RulesPanelProps) {
  const { t } = useLanguage();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backdropFilter: "blur(8px)", backgroundColor: "rgba(0, 0, 0, 0.6)" }}
      onClick={onClose}
    >
      <div
        className="ornate-card ornate-card-bottom relative max-w-lg w-full mx-4 p-8"
        style={{ maxHeight: "85vh", overflowY: "auto" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Title */}
        <h2
          className="text-2xl font-bold text-center mb-6 tracking-[0.08em]"
          style={{
            fontFamily: "'Cinzel Decorative', 'Cinzel', serif",
            color: "var(--gold-bright)",
            textShadow: "0 0 20px rgba(201, 168, 76, 0.3)",
          }}
        >
          {t("rules.title")}
        </h2>

        <div className="flex flex-col gap-4">
          {/* Goal */}
          <Section icon="🎯" title={t("rules.goalTitle")}>
            <p>{t("rules.goalText")}</p>
          </Section>

          {/* How to Cast */}
          <Section icon="🎙️" title={t("rules.castTitle")}>
            <ul className="list-none flex flex-col gap-1">
              <li>
                <kbd className="rules-kbd">Q</kbd> / <kbd className="rules-kbd">P</kbd> — {t("rules.castSame")}
              </li>
              <li>
                <kbd className="rules-kbd">Space</kbd> — {t("rules.castRemote")}
              </li>
              <li style={{ color: "var(--text-dim)" }}>{t("rules.castText")}</li>
            </ul>
          </Section>

          {/* Emojis */}
          <Section icon="✨" title={t("rules.emojiTitle")}>
            <p>{t("rules.emojiText")}</p>
          </Section>

          {/* Scoring */}
          <Section icon="⚔️" title={t("rules.scoringTitle")}>
            <p>{t("rules.scoringText")}</p>
          </Section>

          {/* Judge */}
          <Section icon="⚖️" title={t("rules.judgeTitle")}>
            <p>{t("rules.judgeText")}</p>
          </Section>
        </div>

        {/* Got it button */}
        <div className="mt-6 flex justify-center">
          <button
            onClick={onClose}
            className="ornate-btn text-lg px-8 py-3"
            style={{ cursor: "pointer" }}
          >
            {t("rules.gotIt")}
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3
        className="text-sm font-semibold mb-1 tracking-[0.06em] uppercase"
        style={{
          fontFamily: "'Cinzel', serif",
          color: "var(--gold)",
        }}
      >
        {icon} {title}
      </h3>
      <div
        className="text-sm leading-relaxed"
        style={{
          fontFamily: "'Crimson Pro', serif",
          color: "var(--text-main)",
        }}
      >
        {children}
      </div>
    </div>
  );
}
