import { useState } from "react";

interface WaitingRoomProps {
  roomCode: string;
  wizardName: string;
  onCancel: () => void;
}

export function WaitingRoom({ roomCode, wizardName, onCancel }: WaitingRoomProps) {
  const [copied, setCopied] = useState(false);

  const copyCode = async () => {
    await navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <h1
        className="text-4xl font-bold tracking-[0.08em] mb-2"
        style={{
          fontFamily: "'Cinzel Decorative', 'Cinzel', serif",
          color: "var(--gold-bright)",
          textShadow: "0 0 40px rgba(201, 168, 76, 0.25), 0 2px 4px rgba(0,0,0,0.5)",
        }}
      >
        Speech to Spell
      </h1>

      <div
        className="w-full max-w-md rounded-xl p-8 flex flex-col items-center gap-6 mt-8"
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border-subtle)",
          boxShadow: "0 0 60px rgba(0,0,0,0.5)",
        }}
      >
        <p className="text-sm" style={{ color: "var(--text-secondary)", fontFamily: "'Crimson Pro', serif" }}>
          Welcome, <span style={{ color: "var(--gold)" }}>{wizardName}</span>
        </p>

        <p
          className="text-sm tracking-wider uppercase"
          style={{ color: "var(--text-dim)", fontFamily: "'Cinzel', serif", fontSize: "11px" }}
        >
          Room Code
        </p>

        {/* Big room code */}
        <button
          onClick={copyCode}
          className="text-6xl tracking-[0.4em] font-bold px-6 py-4 rounded-xl transition-all cursor-pointer"
          style={{
            fontFamily: "'Cinzel', serif",
            color: "var(--gold-bright)",
            background: "var(--bg-surface)",
            border: "2px solid var(--border-active)",
            textShadow: "0 0 30px rgba(201, 168, 76, 0.3)",
          }}
        >
          {roomCode}
        </button>

        <p className="text-xs" style={{ color: copied ? "var(--emerald)" : "var(--text-dim)", fontFamily: "'Crimson Pro', serif" }}>
          {copied ? "Copied!" : "Click to copy"}
        </p>

        {/* Waiting animation */}
        <div className="flex items-center gap-3 mt-4">
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="w-2 h-2 rounded-full animate-pulse"
                style={{
                  backgroundColor: "var(--purple-magic)",
                  animationDelay: `${i * 0.3}s`,
                }}
              />
            ))}
          </div>
          <p className="text-sm" style={{ color: "var(--text-secondary)", fontFamily: "'Crimson Pro', serif" }}>
            Waiting for opponent...
          </p>
        </div>

        <p className="text-xs mt-2" style={{ color: "var(--text-dim)", fontFamily: "'Crimson Pro', serif" }}>
          Share this code with your opponent so they can join.
        </p>

        <button
          onClick={onCancel}
          className="mt-4 px-6 py-2 rounded-lg text-sm transition-all"
          style={{
            background: "transparent",
            border: "1px solid var(--border-subtle)",
            color: "var(--text-dim)",
            fontFamily: "'Crimson Pro', serif",
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
