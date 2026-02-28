import { useState, useCallback, useEffect, useRef } from "react";
import { Lobby } from "./components/Lobby";
import { WaitingRoom } from "./components/WaitingRoom";
import { RemoteGameView } from "./components/RemoteGameView";
import { AmbientSparkles } from "./components/AmbientSparkles";
import App from "./App";
import { API_BASE } from "./config";
import type { PlayerSide } from "./types";

type GameMode = "same_computer" | "multi_computer";

type RouterState =
  | { phase: "lobby" }
  | { phase: "waiting"; roomCode: string; wizardName: string }
  | { phase: "game"; roomCode: string; side: string; mode: GameMode; wizardName: string };

export function GameRouter() {
  const [state, setState] = useState<RouterState>({ phase: "lobby" });

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
      const res = await fetch(`${API_BASE}/api/rooms/${roomCode}`);
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

  const handleCancel = useCallback(() => {
    setState({ phase: "lobby" });
  }, []);

  if (state.phase === "lobby") {
    return (
      <>
        <AmbientSparkles />
        <Lobby onRoomCreated={handleRoomCreated} />
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
