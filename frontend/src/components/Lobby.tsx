import { useState } from "react";
import { API_BASE } from "../config";

type GameMode = "same_computer" | "multi_computer";

interface LobbyProps {
  onRoomCreated: (roomCode: string, side: string, mode: GameMode, wizardName: string) => void;
}

export function Lobby({ onRoomCreated }: LobbyProps) {
  const [wizardName, setWizardName] = useState("");
  const [mode, setMode] = useState<GameMode>("same_computer");
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const createRoom = async () => {
    if (!wizardName.trim()) {
      setError("Choose a wizard name!");
      return;
    }
    setLoading(true);
    setError(null);

    const res = await fetch(`${API_BASE}/api/rooms`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wizard_name: wizardName.trim(), mode }),
    });

    if (!res.ok) {
      setError("Failed to create room");
      setLoading(false);
      return;
    }

    const data = await res.json();
    onRoomCreated(data.room_code, data.side, mode, wizardName.trim());
  };

  const joinRoom = async () => {
    if (!wizardName.trim()) {
      setError("Choose a wizard name!");
      return;
    }
    if (!joinCode.trim()) {
      setError("Enter a room code!");
      return;
    }
    setLoading(true);
    setError(null);

    const res = await fetch(`${API_BASE}/api/rooms/${joinCode.trim().toUpperCase()}/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wizard_name: wizardName.trim() }),
    });

    if (!res.ok) {
      const text = await res.text();
      setError(text.includes("not found") ? "Room not found" : text.includes("full") ? "Room is full" : "Failed to join room");
      setLoading(false);
      return;
    }

    const data = await res.json();
    onRoomCreated(data.room_code, data.side, "multi_computer", wizardName.trim());
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <h1
        className="text-5xl font-bold tracking-[0.08em] mb-2"
        style={{
          fontFamily: "'Cinzel Decorative', 'Cinzel', serif",
          color: "var(--gold-bright)",
          textShadow: "0 0 40px rgba(201, 168, 76, 0.25), 0 2px 4px rgba(0,0,0,0.5)",
        }}
      >
        Speech to Spell
      </h1>

      <p className="text-sm mb-10" style={{ color: "var(--text-dim)", fontFamily: "'Crimson Pro', serif" }}>
        A wizard duel of voice and emojis
      </p>

      {/* Card */}
      <div
        className="w-full max-w-md rounded-xl p-8 flex flex-col gap-6"
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border-subtle)",
          boxShadow: "0 0 60px rgba(0,0,0,0.5)",
        }}
      >
        {/* Wizard name */}
        <div className="flex flex-col gap-2">
          <label
            className="text-sm font-semibold tracking-wider uppercase"
            style={{ color: "var(--gold)", fontFamily: "'Cinzel', serif", fontSize: "11px" }}
          >
            Wizard Name
          </label>
          <input
            type="text"
            value={wizardName}
            onChange={(e) => setWizardName(e.target.value)}
            placeholder="Enter your wizard name..."
            maxLength={20}
            className="w-full px-4 py-3 rounded-lg text-base outline-none transition-colors"
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border-subtle)",
              color: "var(--text-primary)",
              fontFamily: "'MedievalSharp', cursive",
            }}
            onFocus={(e) => (e.target.style.borderColor = "var(--border-active)")}
            onBlur={(e) => (e.target.style.borderColor = "var(--border-subtle)")}
          />
        </div>

        {/* Mode toggle */}
        <div className="flex flex-col gap-2">
          <label
            className="text-sm font-semibold tracking-wider uppercase"
            style={{ color: "var(--gold)", fontFamily: "'Cinzel', serif", fontSize: "11px" }}
          >
            Game Mode
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => setMode("same_computer")}
              className="flex-1 py-2.5 px-3 rounded-lg text-sm transition-all"
              style={{
                background: mode === "same_computer" ? "var(--purple-magic)" : "var(--bg-surface)",
                border: `1px solid ${mode === "same_computer" ? "var(--purple-magic)" : "var(--border-subtle)"}`,
                color: mode === "same_computer" ? "#fff" : "var(--text-secondary)",
                fontFamily: "'Crimson Pro', serif",
              }}
            >
              Same Computer
            </button>
            <button
              onClick={() => setMode("multi_computer")}
              className="flex-1 py-2.5 px-3 rounded-lg text-sm transition-all"
              style={{
                background: mode === "multi_computer" ? "var(--purple-magic)" : "var(--bg-surface)",
                border: `1px solid ${mode === "multi_computer" ? "var(--purple-magic)" : "var(--border-subtle)"}`,
                color: mode === "multi_computer" ? "#fff" : "var(--text-secondary)",
                fontFamily: "'Crimson Pro', serif",
              }}
            >
              Different Computers
            </button>
          </div>
        </div>

        {/* Create room button */}
        <button
          onClick={createRoom}
          disabled={loading}
          className="w-full py-3 rounded-lg text-lg font-semibold tracking-wider transition-all"
          style={{
            background: "linear-gradient(135deg, var(--gold-dim), var(--gold))",
            color: "var(--bg-deep)",
            fontFamily: "'Cinzel', serif",
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? "Creating..." : "Create Room"}
        </button>

        {/* Divider */}
        <div className="flex items-center gap-4">
          <div className="flex-1 h-px" style={{ background: "var(--border-subtle)" }} />
          <span className="text-xs" style={{ color: "var(--text-dim)", fontFamily: "'Crimson Pro', serif" }}>or join a room</span>
          <div className="flex-1 h-px" style={{ background: "var(--border-subtle)" }} />
        </div>

        {/* Join room */}
        <div className="flex gap-2">
          <input
            type="text"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            placeholder="ABCD"
            maxLength={4}
            className="flex-1 px-4 py-3 rounded-lg text-center text-xl tracking-[0.3em] uppercase outline-none"
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border-subtle)",
              color: "var(--text-primary)",
              fontFamily: "'Cinzel', serif",
            }}
            onFocus={(e) => (e.target.style.borderColor = "var(--border-active)")}
            onBlur={(e) => (e.target.style.borderColor = "var(--border-subtle)")}
            onKeyDown={(e) => { if (e.key === "Enter") joinRoom(); }}
          />
          <button
            onClick={joinRoom}
            disabled={loading}
            className="px-6 py-3 rounded-lg text-base font-semibold tracking-wider transition-all"
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border-active)",
              color: "var(--gold)",
              fontFamily: "'Cinzel', serif",
              opacity: loading ? 0.6 : 1,
            }}
          >
            Join
          </button>
        </div>

        {/* Error */}
        {error && (
          <p className="text-sm text-center" style={{ color: "var(--crimson)" }}>
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
