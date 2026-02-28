import type { PlayerSide } from "../types";

interface WizardPanelProps {
  side: PlayerSide;
  name: string;
  keyBind: string;
  recording: boolean;
  transcription: string | null;
  processing: boolean;
}

export function WizardPanel({
  side,
  name,
  keyBind,
  recording,
  transcription,
  processing,
}: WizardPanelProps) {
  const isLeft = side === "left";
  const bgGradient = isLeft
    ? "from-indigo-900/40 to-purple-900/20"
    : "from-rose-900/20 to-amber-900/40";
  const borderColor = isLeft ? "border-indigo-500/30" : "border-amber-500/30";
  const glowColor = recording
    ? isLeft
      ? "shadow-indigo-500/50"
      : "shadow-amber-500/50"
    : "";

  return (
    <div
      className={`flex flex-col items-center justify-between p-8 rounded-2xl border bg-gradient-to-b ${bgGradient} ${borderColor} ${recording ? `shadow-lg ${glowColor}` : ""} transition-all duration-200 min-h-[500px]`}
    >
      {/* Wizard avatar area */}
      <div className="flex flex-col items-center gap-4">
        <div
          className={`text-8xl ${recording ? "animate-bounce" : ""} transition-all`}
        >
          {isLeft ? "\u{1F9D9}" : "\u{1F9D9}\u200D\u2640\uFE0F"}
        </div>
        <h2 className="text-2xl font-bold tracking-wide">{name}</h2>
      </div>

      {/* Transcription display */}
      <div className="flex-1 flex items-center justify-center w-full my-8">
        {recording ? (
          <div className="flex flex-col items-center gap-3">
            <div className="flex gap-1">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse [animation-delay:150ms]" />
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse [animation-delay:300ms]" />
            </div>
            <p className="text-red-400 text-sm font-medium uppercase tracking-widest">
              Casting...
            </p>
          </div>
        ) : processing ? (
          <p className="text-yellow-400/70 text-sm italic animate-pulse">
            Transcribing...
          </p>
        ) : transcription ? (
          <p className="text-xl text-center font-medium italic text-white/90 max-w-xs leading-relaxed">
            &ldquo;{transcription}&rdquo;
          </p>
        ) : (
          <p className="text-white/30 text-sm">
            Press{" "}
            <kbd className="px-2 py-1 bg-white/10 rounded text-white/60 font-mono">
              {keyBind.toUpperCase()}
            </kbd>{" "}
            to cast a spell
          </p>
        )}
      </div>

      {/* Key indicator */}
      <div
        className={`w-14 h-14 rounded-xl flex items-center justify-center text-xl font-bold font-mono transition-all duration-150 ${
          recording
            ? "bg-red-500 text-white scale-110"
            : "bg-white/10 text-white/40"
        }`}
      >
        {keyBind.toUpperCase()}
      </div>
    </div>
  );
}
