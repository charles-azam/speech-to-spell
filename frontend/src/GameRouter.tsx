import { useState, useCallback, useEffect, useRef } from "react";
import { Lobby } from "./components/Lobby";
import { WaitingRoom } from "./components/WaitingRoom";
import { RemoteGameView } from "./components/RemoteGameView";
import { ArchitecturePage } from "./components/ArchitecturePage";
import { AmbientSparkles } from "./components/AmbientSparkles";
import App from "./App";
import { API_BASE, authHeaders, getPassword, setPassword } from "./config";
import type { PlayerSide } from "./types";

type GameMode = "same_computer" | "multi_computer";

type RouterState =
  | { phase: "password" }
  | { phase: "lobby" }
  | { phase: "architecture" }
  | { phase: "waiting"; roomCode: string; wizardName: string }
  | { phase: "game"; roomCode: string; side: string; mode: GameMode; wizardName: string };

function PasswordGate({ onSuccess }: { onSuccess: () => void }) {
  const [pw, setPw] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    setError(false);
    const res = await fetch(`${API_BASE}/api/auth`, {
      method: "POST",
      headers: { "X-Game-Password": pw },
    });
    if (res.ok) {
      setPassword(pw);
      onSuccess();
    } else {
      setError(true);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <h1
        className="text-5xl font-bold tracking-[0.08em] mb-8"
        style={{
          fontFamily: "'Cinzel Decorative', 'Cinzel', serif",
          color: "var(--gold-bright)",
          textShadow: "0 0 40px rgba(201, 168, 76, 0.25), 0 2px 4px rgba(0,0,0,0.5)",
        }}
      >
        Speech to Spell
      </h1>
      <p
        className="text-sm text-center mb-6 max-w-sm leading-relaxed"
        style={{ color: "var(--text-dim)", fontFamily: "'Crimson Pro', serif" }}
      >
        Due to unexpected demand and limited API credits, the demo is no longer publicly available.
        Please contact us to get the password and try it out!
      </p>
      <div
        className="w-full max-w-sm rounded-xl p-8 flex flex-col gap-4"
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border-subtle)",
          boxShadow: "0 0 60px rgba(0,0,0,0.5)",
        }}
      >
        <label
          className="text-sm font-semibold tracking-wider uppercase text-center"
          style={{ color: "var(--gold)", fontFamily: "'Cinzel', serif", fontSize: "11px" }}
        >
          Enter Password
        </label>
        <input
          type="password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
          placeholder="Password..."
          className="w-full px-4 py-3 rounded-lg text-base outline-none text-center"
          style={{
            background: "var(--bg-surface)",
            border: `1px solid ${error ? "var(--crimson)" : "var(--border-subtle)"}`,
            color: "var(--text-primary)",
            fontFamily: "'MedievalSharp', cursive",
          }}
          autoFocus
        />
        {error && (
          <p className="text-sm text-center" style={{ color: "var(--crimson)" }}>
            Wrong password
          </p>
        )}
        <button
          onClick={submit}
          disabled={loading}
          className="w-full py-3 rounded-lg text-lg font-semibold tracking-wider"
          style={{
            background: "linear-gradient(135deg, var(--gold-dim), var(--gold))",
            color: "var(--bg-deep)",
            fontFamily: "'Cinzel', serif",
            opacity: loading ? 0.6 : 1,
          }}
        >
          Enter
        </button>
      </div>
    </div>
  );
}

export function GameRouter() {
  const [state, setState] = useState<RouterState>(
    getPassword() ? { phase: "lobby" } : { phase: "password" },
  );

  // Poll for opponent joining when in waiting phase
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (state.phase !== "waiting") {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      return;
    }

    const { roomCode, wizardName } = state;

    const checkRoom = async () => {
      const res = await fetch(`${API_BASE}/api/rooms/${roomCode}`, { headers: authHeaders() });
      if (!res.ok) return;
      const data = await res.json();
      if (data.players.right) {
        setState({
          phase: "game",
          roomCode,
          side: "left",
          mode: "multi_computer",
          wizardName,
        });
      }
    };

    pollRef.current = setInterval(checkRoom, 1500);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [state]);

  const handleRoomCreated = useCallback((roomCode: string, _side: string, mode: GameMode, wizardName: string) => {
    if (mode === "same_computer") {
      setState({ phase: "game", roomCode, side: "both", mode, wizardName });
    } else {
      setState({ phase: "waiting", roomCode, wizardName });
    }
  }, []);

  const handleShowArchitecture = useCallback(() => {
    setState({ phase: "architecture" });
  }, []);

  const handleCancel = useCallback(() => {
    setState({ phase: "lobby" });
  }, []);

  if (state.phase === "password") {
    return (
      <>
        <AmbientSparkles />
        <PasswordGate onSuccess={() => setState({ phase: "lobby" })} />
      </>
    );
  }

  if (state.phase === "lobby") {
    return (
      <>
        <AmbientSparkles />
        <Lobby onRoomCreated={handleRoomCreated} onShowArchitecture={handleShowArchitecture} />
      </>
    );
  }

  if (state.phase === "architecture") {
    return (
      <>
        <AmbientSparkles />
        <ArchitecturePage onBack={handleCancel} />
      </>
    );
  }

  if (state.phase === "waiting") {
    return (
      <>
        <AmbientSparkles />
        <WaitingRoom
          roomCode={state.roomCode}
          wizardName={state.wizardName}
          onCancel={handleCancel}
        />
      </>
    );
  }

  // Game phase
  if (state.mode === "same_computer") {
    return <App roomCode={state.roomCode} />;
  }

  return (
    <RemoteGameView
      roomCode={state.roomCode}
      side={state.side as PlayerSide}
      wizardName={state.wizardName}
    />
  );
}
