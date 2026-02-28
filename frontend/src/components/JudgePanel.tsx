import { useState, useEffect } from "react";
import type { Verdict } from "../types";

interface JudgePanelProps {
  verdict: Verdict | null;
  comment: string | null;
  waiting: boolean;
  spellName: string | null;
  damage: number | null;
}

function TypewriterText({ text, speed = 35 }: { text: string; speed?: number }) {
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
      {!done && <span className="animate-pulse">|</span>}
    </span>
  );
}

function VerdictStamp({ verdict }: { verdict: Verdict }) {
  const config = {
    YES: { text: "ACCEPTE !", color: "text-green-400", border: "border-green-400", glow: "shadow-[0_0_30px_rgba(34,197,94,0.6)]" },
    NO: { text: "REJETE !", color: "text-red-400", border: "border-red-400", glow: "shadow-[0_0_30px_rgba(239,68,68,0.6)]" },
    EXPLAIN: { text: "EXPLIQUE !", color: "text-amber-400", border: "border-amber-400", glow: "shadow-[0_0_30px_rgba(245,158,11,0.6)]" },
  }[verdict];

  return (
    <div
      className={`
        absolute -top-3 -right-3 px-3 py-1 rounded-lg border-2 text-xs font-black uppercase tracking-widest
        ${config.color} ${config.border} ${config.glow}
        bg-[#0f0a1e]/90 animate-verdict-stamp z-10
      `}
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
  const bubbleGlow = verdict === "YES"
    ? "border-green-500/50 shadow-[0_0_20px_rgba(34,197,94,0.2)]"
    : verdict === "NO"
      ? "border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.2)]"
      : verdict === "EXPLAIN"
        ? "border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.2)]"
        : "border-white/10";

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
    <div className="flex flex-col items-center gap-4 w-56 py-8">
      {/* Judge character */}
      <div className={`text-7xl select-none ${judgeAnimation}`}>
        {verdict === "YES" ? "\u{1F9D1}\u200D\u2696\uFE0F" :
         verdict === "NO" ? "\u{1F9D1}\u200D\u2696\uFE0F" :
         verdict === "EXPLAIN" ? "\u{1F9D1}\u200D\u2696\uFE0F" :
         "\u{1F9D1}\u200D\u2696\uFE0F"}
      </div>

      <h3 className="text-sm font-bold uppercase tracking-[0.25em] text-white/40">
        Le Juge
      </h3>

      {/* Speech bubble */}
      <div className={`relative w-full rounded-xl border p-4 bg-white/5 ${bubbleGlow} transition-all duration-500`}>
        {/* Verdict stamp */}
        {verdict && <VerdictStamp verdict={verdict} />}

        {/* Bubble arrow */}
        <div
          className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 rotate-45 bg-white/5 border-l border-t"
          style={{ borderColor: "inherit" }}
        />

        {waiting ? (
          <div className="flex flex-col items-center gap-2 py-2">
            <div className="flex gap-1">
              <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce [animation-delay:0ms]" />
              <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce [animation-delay:150ms]" />
              <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce [animation-delay:300ms]" />
            </div>
            <p className="text-xs text-purple-300/60 italic">Le Juge delibere...</p>
          </div>
        ) : comment ? (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-white/90 italic leading-relaxed min-h-[3em]">
              <TypewriterText text={comment} />
            </p>
            {verdict === "YES" && spellName && (
              <div className="flex items-center justify-between pt-2 border-t border-white/10">
                <span className="text-xs font-bold text-purple-300 uppercase">{spellName}</span>
                {damage !== null && damage > 0 && (
                  <span className="text-xs font-mono text-red-400">-{damage} HP</span>
                )}
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-white/20 text-center italic py-2">
            En attente du prochain sort...
          </p>
        )}
      </div>
    </div>
  );
}
