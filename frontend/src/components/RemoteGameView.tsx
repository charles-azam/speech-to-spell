import { useCallback, useEffect, useRef, useState } from "react";
import { WizardPanel } from "./WizardPanel";
import { JudgePanel } from "./JudgePanel";
import { CommentatorPanel } from "./CommentatorPanel";
import { AmbientSparkles } from "./AmbientSparkles";
import { PlayerControls } from "./PlayerControls";
import { SpellHistory } from "./SpellHistory";
import { LanguageToggle } from "./LanguageToggle";
import { RulesPanel } from "./RulesPanel";
import { useWebSocket } from "../hooks/useWebSocket";
import { useGameState } from "../hooks/useGameState";
import { useMicrophone } from "../hooks/useMicrophone";
import { useAudioDevices } from "../hooks/useAudioDevices";
import { useLanguage } from "../hooks/useLanguage";
import type { PlayerSide, ServerMessage } from "../types";

interface RemoteGameViewProps {
  roomCode: string;
  side: PlayerSide;
  wizardName: string;
}

export function RemoteGameView({ roomCode, side, wizardName }: RemoteGameViewProps) {
  const { t } = useLanguage();
  const opponent: PlayerSide = side === "left" ? "right" : "left";
  const { state, dispatch, handleServerMessage: baseHandler } = useGameState();
  const { devices } = useAudioDevices();
  const [deviceId, setDeviceId] = useState("");
  const [showRules, setShowRules] = useState(false);
  const deviceIdRef = useRef(deviceId);
  deviceIdRef.current = deviceId;
  const stateRef = useRef(state);
  stateRef.current = state;

  // Wrap base handler to filter player_joined/disconnected for opponent only
  const handleServerMessage = useCallback(
    (msg: ServerMessage) => {
      if (msg.type === "player_joined" && msg.side === side) return;
      if (msg.type === "player_disconnected" && msg.side === side) return;
      baseHandler(msg);
    },
    [baseHandler, side],
  );

  const { send, connected, currentSpeaker, duckCommentator, unduckCommentator } = useWebSocket(handleServerMessage, roomCode, side);
  const sendRef = useRef(send);
  sendRef.current = send;

  useEffect(() => {
    if (!connected) dispatch({ type: "connection_lost" });
  }, [connected, dispatch]);

  const handleRecordingComplete = useCallback(
    (audioBase64: string) => {
      dispatch({ type: "set_processing", player: side, value: true });
      const s = stateRef.current;

      if (s.explainPlayer === side) {
        sendRef.current({ type: "explain_spell", player: side, audio: audioBase64 });
      } else {
        sendRef.current({ type: "cast_spell", player: side, audio: audioBase64 });
      }
    },
    [side, dispatch],
  );

  const { recording, startRecording, stopRecording } = useMicrophone(handleRecordingComplete);

  // Duck commentator while recording
  useEffect(() => {
    if (recording) duckCommentator();
    else unduckCommentator();
  }, [recording, duckCommentator, unduckCommentator]);

  const handleTextSpell = useCallback(
    (player: PlayerSide, text: string) => {
      dispatch({ type: "set_processing", player, value: true });
      const s = stateRef.current;

      if (s.explainPlayer === player) {
        send({ type: "explain_spell", player, text });
      } else {
        send({ type: "text_spell", player, text });
      }
    },
    [send, dispatch],
  );

  // Push-to-talk: Spacebar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (state.winner) return;
      if (recording) return;

      if (e.code === "Space") {
        e.preventDefault();
        startRecording(deviceIdRef.current || undefined);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        stopRecording();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [recording, state.winner, startRecording, stopRecording]);

  const my = state[side];
  const opp = state[opponent];

  return (
    <div className={`min-h-screen flex flex-col ${state.screenShake ? "animate-screen-shake" : ""}`}>
      <AmbientSparkles />

      {/* Header */}
      <header className="text-center pt-6 pb-4 relative z-10">
        <div className="absolute top-4 right-4 flex items-center gap-2">
          <button
            onClick={() => setShowRules(true)}
            className="px-3 py-1 rounded text-xs font-semibold tracking-wider transition-all"
            title={t("rules.tooltip")}
            style={{
              fontFamily: "'Cinzel', serif",
              background: "var(--bg-surface)",
              border: "1px solid var(--border-subtle)",
              color: "var(--gold)",
              letterSpacing: "0.1em",
              cursor: "pointer",
            }}
          >
            ?
          </button>
          <LanguageToggle />
        </div>
        <h1
          className="text-4xl font-bold tracking-[0.08em]"
          style={{
            fontFamily: "'Cinzel Decorative', 'Cinzel', serif",
            color: "var(--gold-bright)",
            textShadow: "0 0 40px rgba(201, 168, 76, 0.25), 0 2px 4px rgba(0,0,0,0.5)",
          }}
        >
          Speech to Spell
        </h1>
        <div className="mt-3 flex items-center justify-center gap-4">
          <div className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full"
              style={{
                backgroundColor: connected ? "var(--emerald)" : "var(--crimson)",
                boxShadow: connected ? "0 0 8px var(--emerald-glow)" : "0 0 8px var(--crimson-glow)",
              }}
            />
            <span className="text-xs" style={{ fontFamily: "'Crimson Pro', serif", color: "var(--text-dim)" }}>
              {connected ? t("status.connected") : t("status.disconnected")}
            </span>
          </div>
          <span className="text-xs" style={{ color: "var(--text-dim)", fontFamily: "'Cinzel', serif" }}>
            {t("game.room")} {roomCode}
          </span>
          {!state.opponentConnected && (
            <span className="text-xs animate-pulse" style={{ color: "var(--amber-warn)" }}>
              {t("game.waitingOpponent")}
            </span>
          )}
        </div>
        <div className="ornate-rule mt-3 max-w-md mx-auto">
          <span style={{ color: "var(--gold-dim)", fontSize: "10px" }}>{"\u2726"} {"\u2726"} {"\u2726"}</span>
        </div>
      </header>

      {/* Winner banner */}
      {state.winner && (
        <div className="text-center py-6 relative z-10">
          <p
            className="text-4xl font-bold animate-pulse tracking-[0.1em]"
            style={{
              fontFamily: "'Cinzel Decorative', serif",
              color: "var(--gold-bright)",
              textShadow: "0 0 40px rgba(201, 168, 76, 0.5), 0 0 80px rgba(201, 168, 76, 0.25)",
            }}
          >
            {state.winner === side ? `${wizardName} ${t("game.triumphs")}` : `${state.opponentName} ${t("game.triumphs")}`}
          </p>
        </div>
      )}

      {/* Arena */}
      <main className="flex-1 flex items-start justify-center px-6 pb-8 relative z-10">
        <div className="grid grid-cols-[1fr_auto_1fr] gap-6 w-full max-w-6xl items-start">
          {/* My wizard (left visual position) */}
          <div className="flex flex-col gap-4">
            <WizardPanel
              side="left"
              name={wizardName}
              keyBind="Space"
              recording={recording}
              transcription={my.transcription}
              processing={my.processing}
              spellName={my.spellName}
              hitColor={my.hitColor}
              health={my.health}
              visualEffect={my.visualEffect}
            />
            <SpellHistory spells={my.spellsCast} />
            {!state.winner && (
              <PlayerControls
                side={side}
                hand={my.hand}
                inferredEmojis={my.inferredEmojis}
                isExplaining={state.explainPlayer === side}
                keyBind="Space"
                disabled={false}
                devices={devices}
                deviceId={deviceId}
                onDeviceChange={setDeviceId}
                onTextCast={handleTextSpell}
              />
            )}
          </div>

          {/* Judge Panel + Commentators */}
          <div className="flex flex-col items-center">
            <JudgePanel
              verdict={state.judge.verdict}
              comment={state.judge.comment}
              waiting={state.judge.waiting}
              spellName={state.judge.spellName}
              damage={state.judge.damage}
            />
            <CommentatorPanel currentSpeaker={currentSpeaker} />
          </div>

          {/* Opponent (right visual position) */}
          <div className="flex flex-col gap-4">
            <WizardPanel
              side="right"
              name={state.opponentName}
              keyBind=""
              recording={false}
              transcription={opp.transcription}
              processing={false}
              spellName={opp.spellName}
              hitColor={opp.hitColor}
              health={opp.health}
              visualEffect={opp.visualEffect}
            />
            <SpellHistory spells={opp.spellsCast} />
          </div>
        </div>
      </main>

      {showRules && <RulesPanel onClose={() => setShowRules(false)} />}
    </div>
  );
}
