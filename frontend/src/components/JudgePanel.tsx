import { useState, useEffect } from "react";
import type { Verdict } from "../types";
import { useLanguage } from "../hooks/useLanguage";

interface JudgePanelProps {
  verdict: Verdict | null;
  comment: string | null;
  waiting: boolean;
  spellName: string | null;
  damage: number | null;
}

function TypewriterText({ text, speed = 30 }: { text: string; speed?: number }) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    setDisplayed("");
    setDone(false);
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(interval);
        setDone(true);
      }
    }, speed);
    return () => clearInterval(interval);
  }, [text, speed]);

  return (
    <span>
      {displayed}
      {!done && (
        <span className="animate-pulse" style={{ color: "var(--gold)" }}>
          |
        </span>
      )}
    </span>
  );
}

function VerdictStamp({ verdict }: { verdict: "NO" | "EXPLAIN" }) {
  const { t } = useLanguage();

  const config = {
    NO: {
      text: t("judge.rejected"),
      color: "var(--crimson)",
      shadow: "0 0 30px var(--crimson-glow), 0 0 60px var(--crimson-glow)",
    },
    EXPLAIN: {
      text: t("judge.explain"),
      color: "var(--amber-warn)",
      shadow: "0 0 30px rgba(217, 119, 6, 0.4), 0 0 60px rgba(217, 119, 6, 0.2)",
    },
  }[verdict];

  return (
    <div
      className="text-center mb-2 animate-verdict-stamp"
      style={{
        fontFamily: "'MedievalSharp', cursive",
        fontSize: "0.85rem",
        fontWeight: "bold",
        letterSpacing: "0.15em",
        color: config.color,
        textTransform: "uppercase",
        textShadow: config.shadow.replace(/box-shadow:|,/g, ""),
      }}
    >
      {config.text}
    </div>
  );
}

export function JudgePanel({
  verdict,
  comment,
  waiting,
  spellName,
  damage,
}: JudgePanelProps) {
  const { t } = useLanguage();

  const verdictGlow = verdict === "YES"
    ? "var(--emerald)"
    : verdict === "NO"
      ? "var(--crimson)"
      : verdict === "EXPLAIN"
        ? "var(--amber-warn)"
        : "var(--gold-dim)";

  const judgeAnimation = verdict === "YES"
    ? "animate-judge-nod"
    : verdict === "NO"
      ? "animate-judge-shake"
      : verdict === "EXPLAIN"
        ? "animate-judge-eyebrow"
        : waiting
          ? "animate-judge-think"
          : "animate-judge-idle";

  return (
    <div className="flex flex-col items-center w-64 py-6 relative z-10">
      {/* Decorative top ornament */}
      <div className="ornate-rule mb-4 w-full px-2" style={{ color: "var(--gold-dim)" }}>
        <span style={{ fontFamily: "'MedievalSharp', cursive", fontSize: "9px", letterSpacing: "0.3em", textTransform: "uppercase" }}>
          {t("judge.tribunal")}
        </span>
      </div>

      {/* Judge character — large and imposing */}
      <div className="relative mb-2">
        <div
          className={`text-8xl select-none ${judgeAnimation}`}
          style={{
            filter: `drop-shadow(0 0 20px ${verdictGlow}44)`,
          }}
        >
          {"\u{1F9D1}\u200D\u2696\uFE0F"}
        </div>
      </div>

      <h3
        className="text-base tracking-[0.2em] uppercase mb-4"
        style={{
          fontFamily: "'MedievalSharp', cursive",
          color: "var(--gold)",
          textShadow: "0 0 20px rgba(201, 168, 76, 0.3)",
        }}
      >
        {t("judge.title")}
      </h3>

      {/* Speech bubble — ornate scroll */}
      <div
        className="relative w-full"
        style={{
          background: "var(--bg-surface)",
          border: `1px solid ${verdict ? verdictGlow + "44" : "var(--border-subtle)"}`,
          padding: "1.25rem",
          transition: "all 0.5s ease",
          boxShadow: verdict ? `0 0 25px ${verdictGlow}15, inset 0 0 25px ${verdictGlow}08` : "none",
        }}
      >
        {/* Bubble pointer */}
        <div
          className="absolute -top-[7px] left-1/2 -translate-x-1/2 w-3 h-3 rotate-45"
          style={{
            background: "var(--bg-surface)",
            borderLeft: `1px solid ${verdict ? verdictGlow + "44" : "var(--border-subtle)"}`,
            borderTop: `1px solid ${verdict ? verdictGlow + "44" : "var(--border-subtle)"}`,
          }}
        />

        {waiting ? (
          <div className="flex flex-col items-center gap-3 py-3">
            <div className="flex gap-2">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-2 h-2 rounded-full animate-bounce"
                  style={{
                    backgroundColor: "var(--gold-dim)",
                    animationDelay: `${i * 150}ms`,
                  }}
                />
              ))}
            </div>
            <p
              className="text-xs italic"
              style={{ fontFamily: "'Crimson Pro', serif", color: "var(--text-dim)" }}
            >
              {t("judge.deliberating")}
            </p>
          </div>
        ) : comment ? (
          <div className="flex flex-col gap-2">
            {(verdict === "NO" || verdict === "EXPLAIN") && <VerdictStamp verdict={verdict} />}
            <p
              className="text-sm italic leading-relaxed min-h-[3.5em]"
              style={{ fontFamily: "'Crimson Pro', serif", color: "var(--text-primary)" }}
            >
              &laquo;&nbsp;
              <TypewriterText text={comment} />
              &nbsp;&raquo;
            </p>
            {verdict === "YES" && spellName && (
              <div
                className="flex items-center justify-between pt-3"
                style={{ borderTop: "1px solid var(--border-subtle)" }}
              >
                <span
                  className="text-xs uppercase tracking-[0.1em]"
                  style={{ fontFamily: "'MedievalSharp', cursive", color: "var(--gold)" }}
                >
                  {spellName}
                </span>
                {damage !== null && damage > 0 && (
                  <span
                    className="text-sm font-bold tabular-nums"
                    style={{ fontFamily: "'Crimson Pro', serif", color: "var(--crimson)" }}
                  >
                    -{damage} HP
                  </span>
                )}
              </div>
            )}
          </div>
        ) : (
          <p
            className="text-xs text-center italic py-3"
            style={{ fontFamily: "'Crimson Pro', serif", color: "var(--text-dim)" }}
          >
            {t("judge.waiting")}
          </p>
        )}
      </div>

      {/* Decorative bottom ornament */}
      <div className="ornate-rule mt-4 w-full px-2" style={{ color: "var(--gold-dim)" }}>
        <span style={{ fontSize: "10px" }}>{"\u2726"}</span>
      </div>
    </div>
  );
}
