import { useCallback, useEffect, useRef } from "react";
import { WizardPanel } from "./components/WizardPanel";
import { JudgePanel } from "./components/JudgePanel";
import { CommentatorPanel } from "./components/CommentatorPanel";
import { AmbientSparkles } from "./components/AmbientSparkles";
import { PlayerControls } from "./components/PlayerControls";
import { SpellHistory } from "./components/SpellHistory";
import { LanguageToggle } from "./components/LanguageToggle";
import { RulesPanel } from "./components/RulesPanel";
import { useWebSocket } from "./hooks/useWebSocket";
import { useGameState } from "./hooks/useGameState";
import { useMicrophone } from "./hooks/useMicrophone";
import { useAudioDevices } from "./hooks/useAudioDevices";
import { useLanguage } from "./hooks/useLanguage";
import { useState } from "react";
import type { PlayerSide } from "./types";

interface AppProps {
  roomCode: string;
}

function App({ roomCode }: AppProps) {
  const { t } = useLanguage();
  const { state, dispatch, handleServerMessage } = useGameState();
  const { devices, permissionDenied: micPermissionDenied } = useAudioDevices();
  const [leftDeviceId, setLeftDeviceId] = useState("");
  const [rightDeviceId, setRightDeviceId] = useState("");
  const [showRules, setShowRules] = useState(false);

  // Push-to-talk: track which player is currently recording
  const activePlayerRef = useRef<PlayerSide | null>(null);

  // Refs for latest state needed in callbacks
  const leftDeviceIdRef = useRef(leftDeviceId);
  leftDeviceIdRef.current = leftDeviceId;
  const rightDeviceIdRef = useRef(rightDeviceId);
  rightDeviceIdRef.current = rightDeviceId;
  const stateRef = useRef(state);
  stateRef.current = state;

  const { send, connected, currentSpeaker, duckCommentator, unduckCommentator } = useWebSocket(handleServerMessage, roomCode, "both");
  const sendRef = useRef(send);
  sendRef.current = send;

  // Clear stuck states when connection drops
  useEffect(() => {
    if (!connected) dispatch({ type: "connection_lost" });
  }, [connected, dispatch]);

  const handleRecordingComplete = useCallback(
    (audioBase64: string) => {
      const player = activePlayerRef.current;
      if (!player) return;

      dispatch({ type: "set_processing", player, value: true });

      const s = stateRef.current;
      if (s.explainPlayer === player) {
        sendRef.current({ type: "explain_spell", player, audio: audioBase64 });
      } else {
        sendRef.current({ type: "cast_spell", player, audio: audioBase64 });
      }
    },
    [dispatch],
  );

  const { recording, startRecording, stopRecording, micError } = useMicrophone(handleRecordingComplete);

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

  // Push-to-talk: E for left, P for right (same key on QWERTY and AZERTY)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (state.winner) return;
      if (recording) return;

      const key = e.key.toLowerCase();
      if (key === "e") {
        e.preventDefault();
        activePlayerRef.current = "left";
        startRecording(leftDeviceIdRef.current || undefined);
      } else if (key === "p") {
        e.preventDefault();
        activePlayerRef.current = "right";
        startRecording(rightDeviceIdRef.current || undefined);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (
        (key === "e" && activePlayerRef.current === "left") ||
        (key === "p" && activePlayerRef.current === "right")
      ) {
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

  const handleHoldStart = useCallback(
    (side: PlayerSide) => {
      if (recording || state.winner) return;
      activePlayerRef.current = side;
      const devId = side === "left" ? leftDeviceIdRef.current : rightDeviceIdRef.current;
      startRecording(devId || undefined);
    },
    [recording, state.winner, startRecording],
  );

  const handleHoldEnd = useCallback(() => {
    stopRecording();
  }, [stopRecording]);

  const renderColumn = (side: PlayerSide) => {
    const ps = state[side];
    const name = state[side].wizardName || (side === "left" ? t("game.wizard1") : t("game.wizard2"));
    const keyBind = side === "left" ? "E" : "P";
    const deviceId = side === "left" ? leftDeviceId : rightDeviceId;
    const onDeviceChange = side === "left" ? setLeftDeviceId : setRightDeviceId;
    const isRecording = recording && activePlayerRef.current === side;

    return (
      <div className="flex flex-col gap-4">
        <WizardPanel
          side={side}
          name={name}
          keyBind={keyBind}
          recording={isRecording}
          transcription={ps.transcription}
          processing={ps.processing}
          spellName={ps.spellName}
          hitColor={ps.hitColor}
          health={ps.health}
          visualEffect={ps.visualEffect}
        />
        <SpellHistory spells={ps.spellsCast} />
        {!state.winner && (
          <PlayerControls
            side={side}
            hand={ps.hand}
            inferredEmojis={ps.inferredEmojis}
            isExplaining={state.explainPlayer === side}
            keyBind={keyBind}
            disabled={false}
            recording={isRecording}
            devices={devices}
            deviceId={deviceId}
            onDeviceChange={onDeviceChange}
            onTextCast={handleTextSpell}
            onHoldStart={() => handleHoldStart(side)}
            onHoldEnd={handleHoldEnd}
          />
        )}
      </div>
    );
  };

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
        <div className="mt-3 flex items-center justify-center">
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
        </div>
        <div className="ornate-rule mt-3 max-w-md mx-auto">
          <span style={{ color: "var(--gold-dim)", fontSize: "10px" }}>{"\u2726"} {"\u2726"} {"\u2726"}</span>
        </div>
      </header>

      {/* Mic error banner */}
      {(micPermissionDenied || micError) && (
        <div
          className="text-center py-3 px-6 mx-auto max-w-lg rounded-lg relative z-10"
          style={{
            background: "rgba(198, 40, 40, 0.15)",
            border: "1px solid var(--crimson)",
            color: "var(--text-primary)",
            fontFamily: "'Crimson Pro', serif",
          }}
        >
          <p className="text-sm">
            {micError || "Microphone permission denied. Allow mic access in your browser settings and reload."}
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--text-dim)" }}>
            You can still play using text input below.
          </p>
        </div>
      )}

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
            {(state.winner === "left" ? state.left.wizardName : state.right.wizardName) || (state.winner === "left" ? t("game.wizard1") : t("game.wizard2"))} {t("game.triumphs")}
          </p>
        </div>
      )}

      {/* Arena */}
      <main className="flex-1 flex items-start justify-center px-6 pb-8 relative z-10">
        <div className="grid grid-cols-[1fr_auto_1fr] gap-6 w-full max-w-6xl items-start">
          {renderColumn("left")}
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
          {renderColumn("right")}
        </div>
      </main>

      {showRules && <RulesPanel onClose={() => setShowRules(false)} />}
    </div>
  );
}

export default App;
