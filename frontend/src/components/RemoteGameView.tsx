import { useState, useCallback, useEffect, useRef } from "react";
import { WizardPanel } from "./WizardPanel";
import { EmojiHand } from "./EmojiHand";
import { JudgePanel } from "./JudgePanel";
import { AmbientSparkles } from "./AmbientSparkles";
import { TextSpellInput } from "./TextSpellInput";
import { MicSelector } from "./MicSelector";
import { useWebSocket } from "../hooks/useWebSocket";
import { useMicrophone } from "../hooks/useMicrophone";
import { useAudioDevices } from "../hooks/useAudioDevices";
import type {
  PlayerSide,
  ServerMessage,
  VisualEffect,
  Verdict,
} from "../types";

interface RemoteGameViewProps {
  roomCode: string;
  side: PlayerSide;
  wizardName: string;
}

export function RemoteGameView({ roomCode, side, wizardName }: RemoteGameViewProps) {
  // Game state from server
  const [myHealth, setMyHealth] = useState(100);
  const [opponentHealth, setOpponentHealth] = useState(100);
  const [myHand, setMyHand] = useState<string[]>([]);
  const [winner, setWinner] = useState<string | null>(null);

  // Selection state
  const [selectedEmojis, setSelectedEmojis] = useState<string[]>([]);

  // Mic device
  const { devices } = useAudioDevices();
  const [deviceId, setDeviceId] = useState("");

  // Explain phase
  const explainPlayerRef = useRef<PlayerSide | null>(null);

  // Transcriptions
  const [myTranscription, setMyTranscription] = useState<string | null>(null);
  const [opponentTranscription, setOpponentTranscription] = useState<string | null>(null);

  // Visual effects
  const [mySpellName, setMySpellName] = useState<string | null>(null);
  const [opponentSpellName, setOpponentSpellName] = useState<string | null>(null);
  const [myColor, setMyColor] = useState<string | null>(null);
  const [opponentColor, setOpponentColor] = useState<string | null>(null);
  const [myVisualEffect, setMyVisualEffect] = useState<VisualEffect | null>(null);
  const [opponentVisualEffect, setOpponentVisualEffect] = useState<VisualEffect | null>(null);
  const [screenShake, setScreenShake] = useState(false);

  // Judge state
  const [judgeVerdict, setJudgeVerdict] = useState<Verdict | null>(null);
  const [judgeComment, setJudgeComment] = useState<string | null>(null);
  const [judgeWaiting, setJudgeWaiting] = useState(false);
  const [judgeSpellName, setJudgeSpellName] = useState<string | null>(null);
  const [judgeDamage, setJudgeDamage] = useState<number | null>(null);

  // Processing state
  const [processing, setProcessing] = useState(false);

  // Opponent connection
  const [opponentConnected, setOpponentConnected] = useState(false);
  const [opponentName, setOpponentName] = useState("Opponent");

  // Refs
  const selectedEmojisRef = useRef(selectedEmojis);
  selectedEmojisRef.current = selectedEmojis;
  const deviceIdRef = useRef(deviceId);
  deviceIdRef.current = deviceId;

  const setSpellNameForSide = useCallback((targetSide: PlayerSide, name: string | null) => {
    if (targetSide === side) setMySpellName(name);
    else setOpponentSpellName(name);
  }, [side]);

  const setColorForSide = useCallback((targetSide: PlayerSide, color: string | null) => {
    if (targetSide === side) setMyColor(color);
    else setOpponentColor(color);
  }, [side]);

  const setVisualEffectForSide = useCallback((targetSide: PlayerSide, effect: VisualEffect | null) => {
    if (targetSide === side) setMyVisualEffect(effect);
    else setOpponentVisualEffect(effect);
  }, [side]);

  const handleServerMessage = useCallback((msg: ServerMessage) => {
    if (msg.type === "transcription") {
      if (msg.player === side) {
        setMyTranscription(msg.text);
        setProcessing(false);
      } else {
        setOpponentTranscription(msg.text);
      }
      setJudgeWaiting(true);
      setJudgeVerdict(null);
      setJudgeComment(null);
      setJudgeSpellName(null);
      setJudgeDamage(null);
    } else if (msg.type === "spell_fizzle") {
      if (msg.player === side) {
        setMyTranscription(msg.reason ?? "Ton sort s'est dissipe...");
        setProcessing(false);
      }
      setJudgeWaiting(false);
    } else if (msg.type === "judge_verdict") {
      setJudgeWaiting(false);
      setJudgeVerdict(msg.verdict);
      setJudgeComment(msg.comment);
      setJudgeSpellName(msg.spell_name);
      setJudgeDamage(msg.damage);

      if (msg.verdict === "YES" && msg.visual_effect) {
        setSpellNameForSide(msg.caster, msg.spell_name);
        setColorForSide(msg.target, msg.visual_effect.primary_color);
        setVisualEffectForSide(msg.target, msg.visual_effect);

        const cleanupMs = (msg.visual_effect.duration_s + 1) * 1000;
        const targetSide = msg.target;
        const casterSide = msg.caster;
        setTimeout(() => {
          setVisualEffectForSide(targetSide, null);
          setColorForSide(targetSide, null);
          setSpellNameForSide(casterSide, null);
        }, cleanupMs);

        if (msg.damage >= 20) {
          setScreenShake(true);
          setTimeout(() => setScreenShake(false), 500);
        }
      }

      if (msg.verdict === "EXPLAIN" && explainPlayerRef.current === null) {
        explainPlayerRef.current = msg.caster;
      } else {
        const caster = msg.caster;
        explainPlayerRef.current = null;
        setTimeout(() => {
          if (caster === side) {
            setSelectedEmojis([]);
            setMyTranscription(null);
          } else {
            setOpponentTranscription(null);
          }
        }, 4000);
      }
    } else if (msg.type === "game_state") {
      if (side === "left") {
        setMyHealth(msg.left.health);
        setOpponentHealth(msg.right.health);
        setMyHand(msg.left.emoji_hand);
      } else {
        setMyHealth(msg.right.health);
        setOpponentHealth(msg.left.health);
        setMyHand(msg.right.emoji_hand);
      }
      setWinner(msg.winner);
    } else if (msg.type === "player_joined") {
      if (msg.side !== side) {
        setOpponentConnected(true);
        setOpponentName(msg.wizard_name);
      }
    } else if (msg.type === "player_disconnected") {
      if (msg.side !== side) {
        setOpponentConnected(false);
      }
    }
  }, [side, setSpellNameForSide, setColorForSide, setVisualEffectForSide]);

  const { send, connected } = useWebSocket(handleServerMessage, roomCode, side);
  const sendRef = useRef(send);
  sendRef.current = send;

  useEffect(() => {
    if (!connected) {
      setJudgeWaiting(false);
      setProcessing(false);
    }
  }, [connected]);

  const handleRecordingComplete = useCallback(
    (audioBase64: string) => {
      setProcessing(true);

      if (explainPlayerRef.current === side) {
        sendRef.current({ type: "explain_spell", audio: audioBase64 });
      } else {
        sendRef.current({ type: "cast_spell", player: side, selected_emojis: selectedEmojisRef.current, audio: audioBase64 });
      }
    },
    [side],
  );

  const { recording, startRecording, stopRecording } = useMicrophone(handleRecordingComplete);

  const handleTextSpell = useCallback(
    (player: PlayerSide, text: string) => {
      setProcessing(true);
      if (explainPlayerRef.current === player) {
        send({ type: "explain_spell", text });
      } else {
        send({ type: "text_spell", player, selected_emojis: selectedEmojisRef.current, text });
      }
    },
    [send],
  );

  const handleEmojiToggle = useCallback((emoji: string) => {
    setSelectedEmojis((prev) =>
      prev.includes(emoji) ? prev.filter((e) => e !== emoji) : [...prev, emoji],
    );
  }, []);

  // Push-to-talk: Spacebar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (winner) return;
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
  }, [recording, winner, startRecording, stopRecording]);

  const isExplaining = explainPlayerRef.current === side;

  // Determine which side is "left" and "right" in the visual layout
  // Always show "my" side on the left, opponent on the right
  const myPanelSide: PlayerSide = "left";
  const opponentPanelSide: PlayerSide = "right";

  return (
    <div className={`min-h-screen flex flex-col ${screenShake ? "animate-screen-shake" : ""}`}>
      <AmbientSparkles />

      {/* Header */}
      <header className="text-center pt-6 pb-4 relative z-10">
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
              {connected ? "Connected" : "Disconnected"}
            </span>
          </div>
          <span className="text-xs" style={{ color: "var(--text-dim)", fontFamily: "'Cinzel', serif" }}>
            Room: {roomCode}
          </span>
          {!opponentConnected && (
            <span className="text-xs animate-pulse" style={{ color: "var(--amber-warn)" }}>
              Waiting for opponent...
            </span>
          )}
        </div>
        <div className="ornate-rule mt-3 max-w-md mx-auto">
          <span style={{ color: "var(--gold-dim)", fontSize: "10px" }}>{"\u2726"} {"\u2726"} {"\u2726"}</span>
        </div>
      </header>

      {/* Winner banner */}
      {winner && (
        <div className="text-center py-6 relative z-10">
          <p
            className="text-4xl font-bold animate-pulse tracking-[0.1em]"
            style={{
              fontFamily: "'Cinzel Decorative', serif",
              color: "var(--gold-bright)",
              textShadow: "0 0 40px rgba(201, 168, 76, 0.5), 0 0 80px rgba(201, 168, 76, 0.25)",
            }}
          >
            {winner === side ? `${wizardName} Triomphe !` : `${opponentName} Triomphe !`}
          </p>
        </div>
      )}

      {/* Arena */}
      <main className="flex-1 flex items-start justify-center px-6 pb-8 relative z-10">
        <div className="grid grid-cols-[1fr_auto_1fr] gap-6 w-full max-w-6xl items-start">
          {/* My wizard (left visual position) */}
          <div className="flex flex-col gap-4">
            <WizardPanel
              side={myPanelSide}
              name={wizardName}
              keyBind="Space"
              recording={recording}
              transcription={myTranscription}
              processing={processing}
              spellName={mySpellName}
              hitColor={myColor}
              health={myHealth}
              visualEffect={myVisualEffect}
            />

            {/* Controls */}
            {!winner && (
              <div className="flex flex-col gap-3 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
                {devices.length > 1 && (
                  <MicSelector
                    devices={devices}
                    value={deviceId}
                    onChange={setDeviceId}
                  />
                )}

                <EmojiHand
                  emojis={myHand}
                  selectedEmojis={selectedEmojis}
                  onToggle={handleEmojiToggle}
                  disabled={false}
                />

                {isExplaining && (
                  <p
                    className="text-sm text-center"
                    style={{ fontFamily: "'Crimson Pro', serif", fontStyle: "italic", color: "var(--amber-warn)" }}
                  >
                    Le juge veut une explication ! Maintiens [Space] pour justifier ton sort.
                  </p>
                )}

                <TextSpellInput
                  side={side}
                  onCast={handleTextSpell}
                  disabled={selectedEmojis.length < 2 && !isExplaining}
                />
              </div>
            )}
          </div>

          {/* Judge Panel */}
          <JudgePanel
            verdict={judgeVerdict}
            comment={judgeComment}
            waiting={judgeWaiting}
            spellName={judgeSpellName}
            damage={judgeDamage}
          />

          {/* Opponent (right visual position) — minimal view */}
          <div className="flex flex-col gap-4">
            <WizardPanel
              side={opponentPanelSide}
              name={opponentName}
              keyBind=""
              recording={false}
              transcription={opponentTranscription}
              processing={false}
              spellName={opponentSpellName}
              hitColor={opponentColor}
              health={opponentHealth}
              visualEffect={opponentVisualEffect}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
