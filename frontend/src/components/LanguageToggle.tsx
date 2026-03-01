import { useLanguage } from "../hooks/useLanguage";

export function LanguageToggle() {
  const { lang, setLang } = useLanguage();

  return (
    <button
      onClick={() => setLang(lang === "fr" ? "en" : "fr")}
      className="px-3 py-1 rounded text-xs font-semibold tracking-wider transition-all"
      style={{
        fontFamily: "'Cinzel', serif",
        background: "var(--bg-surface)",
        border: "1px solid var(--border-subtle)",
        color: "var(--gold)",
        letterSpacing: "0.1em",
      }}
      title={lang === "fr" ? "Switch to English" : "Passer en français"}
    >
      {lang === "fr" ? "EN" : "FR"}
    </button>
  );
}
