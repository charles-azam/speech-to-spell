import { useState, useCallback, useEffect, useRef } from "react";
import { WizardPanel } from "./components/WizardPanel";
import { EmojiHand } from "./components/EmojiHand";
import { JudgePanel } from "./components/JudgePanel";
import { AmbientSparkles } from "./components/AmbientSparkles";
import { TextSpellInput } from "./components/TextSpellInput";
import { MicSelector } from "./components/MicSelector";
import { useWebSocket } from "./hooks/useWebSocket";
import { useMicrophone } from "./hooks/useMicrophone";
import { useAudioDevices } from "./hooks/useAudioDevices";
import type {
  PlayerSide,
  ServerMessage,
  VisualEffect,
  Verdict,
} from "./types";

interface AppProps {
  roomCode: string;
}

function App({ roomCode }: AppProps) {
  // Game state from server
  const [leftHealth, setLeftHealth] = useState(100);
  const [rightHealth, setRightHealth] = useState(100);
  const [leftHand, setLeftHand] = useState<string[]>([]);
  const [rightHand, setRightHand] = useState<string[]>([]);
  const [winner, setWinner] = useState<string | null>(null);

  // Per-player independent selection state
  const [leftSelectedEmojis, setLeftSelectedEmojis] = useState<string[]>([]);
  const [rightSelectedEmojis, setRightSelectedEmojis] = useState<string[]>([]);

  // Per-player mic device
  const { devices } = useAudioDevices();
  const [leftDeviceId, setLeftDeviceId] = useState("");
  const [rightDeviceId, setRightDeviceId] = useState("");

  // Per-player explain phase tracking
  const explainPlayerRef = useRef<PlayerSide | null>(null);

  // Transcriptions
  const [leftTranscription, setLeftTranscription] = useState<string | null>(null);
  const [rightTranscription, setRightTranscription] = useState<string | null>(null);

  // Visual effects
  const [leftSpellName, setLeftSpellName] = useState<string | null>(null);
  const [rightSpellName, setRightSpellName] = useState<string | null>(null);
  const [leftColor, setLeftColor] = useState<string | null>(null);
  const [rightColor, setRightColor] = useState<string | null>(null);
  const [leftVisualEffect, setLeftVisualEffect] = useState<VisualEffect | null>(null);
  const [rightVisualEffect, setRightVisualEffect] = useState<VisualEffect | null>(null);
  const [screenShake, setScreenShake] = useState(false);

  // Judge state
  const [judgeVerdict, setJudgeVerdict] = useState<Verdict | null>(null);
  const [judgeComment, setJudgeComment] = useState<string | null>(null);
  const [judgeWaiting, setJudgeWaiting] = useState(false);
  const [judgeSpellName, setJudgeSpellName] = useState<string | null>(null);
  const [judgeDamage, setJudgeDamage] = useState<number | null>(null);

  // Processing state (waiting for transcription)
  const [leftProcessing, setLeftProcessing] = useState(false);
  const [rightProcessing, setRightProcessing] = useState(false);

  // Push-to-talk: track which player is currently recording
  const activePlayerRef = useRef<PlayerSide | null>(null);

  // Refs for latest state (needed in callbacks)
  const leftSelectedEmojisRef = useRef(leftSelectedEmojis);
  leftSelectedEmojisRef.current = leftSelectedEmojis;
  const rightSelectedEmojisRef = useRef(rightSelectedEmojis);
  rightSelectedEmojisRef.current = rightSelectedEmojis;
  const leftDeviceIdRef = useRef(leftDeviceId);
  leftDeviceIdRef.current = leftDeviceId;
  const rightDeviceIdRef = useRef(rightDeviceId);
  rightDeviceIdRef.current = rightDeviceId;

  const handleServerMessage = useCallback((msg: ServerMessage) => {
    if (msg.type === "transcription") {
      if (msg.player === "left") {
        setLeftTranscription(msg.text);
        setLeftProcessing(false);
      } else {
        setRightTranscription(msg.text);
        setRightProcessing(false);
      }
      // STT done — now the LLM judge is evaluating
      setJudgeWaiting(true);
      setJudgeVerdict(null);
      setJudgeComment(null);
      setJudgeSpellName(null);
      setJudgeDamage(null);
    } else if (msg.type === "spell_fizzle") {
      const fizzleMsg = msg.reason ?? "Ton sort s'est dissipe...";
      if (msg.player === "left") {
        setLeftTranscription(fizzleMsg);
        setLeftProcessing(false);
      } else {
        setRightTranscription(fizzleMsg);
        setRightProcessing(false);
      }
      setJudgeWaiting(false);
    } else if (msg.type === "judge_verdict") {
      setJudgeWaiting(false);
      setJudgeVerdict(msg.verdict);
      setJudgeComment(msg.comment);
      setJudgeSpellName(msg.spell_name);
      setJudgeDamage(msg.damage);

      if (msg.verdict === "YES" && msg.visual_effect) {
        const primaryColor = msg.visual_effect.primary_color;
        if (msg.caster === "left") {
          setLeftSpellName(msg.spell_name);
        } else {
          setRightSpellName(msg.spell_name);
        }
        if (msg.target === "left") {
          setLeftColor(primaryColor);
          setLeftVisualEffect(msg.visual_effect);
          const cleanupMs = (msg.visual_effect.duration_s + 1) * 1000;
          setTimeout(() => {
            setLeftVisualEffect(null);
            setLeftColor(null);
            setLeftSpellName(null);
          }, cleanupMs);
        } else {
          setRightColor(primaryColor);
          setRightVisualEffect(msg.visual_effect);
          const cleanupMs = (msg.visual_effect.duration_s + 1) * 1000;
          setTimeout(() => {
            setRightVisualEffect(null);
            setRightColor(null);
            setRightSpellName(null);
          }, cleanupMs);
        }

        if (msg.damage >= 20) {
          setScreenShake(true);
          setTimeout(() => setScreenShake(false), 500);
        }
      }

      if (msg.verdict === "EXPLAIN" && explainPlayerRef.current === null) {
        // Store which player needs to explain
        explainPlayerRef.current = msg.caster;
      } else {
        // Verdict resolved — clear that player's selected emojis
        const caster = msg.caster;
        explainPlayerRef.current = null;
        setTimeout(() => {
          if (caster === "left") {
            setLeftSelectedEmojis([]);
            setLeftTranscription(null);
          } else {
            setRightSelectedEmojis([]);
            setRightTranscription(null);
          }
        }, 4000);
      }
    } else if (msg.type === "game_state") {
      setLeftHealth(msg.left.health);
      setRightHealth(msg.right.health);
      setLeftHand(msg.left.emoji_hand);
      setRightHand(msg.right.emoji_hand);
      setWinner(msg.winner);
    }
  }, []);

  const { send, connected } = useWebSocket(handleServerMessage, roomCode, "both");
  const sendRef = useRef(send);
  sendRef.current = send;

  // Clear stuck states when connection drops
  useEffect(() => {
    if (!connected) {
      setJudgeWaiting(false);
      setLeftProcessing(false);
      setRightProcessing(false);
    }
  }, [connected]);

  const handleRecordingComplete = useCallback(
    (audioBase64: string) => {
      const player = activePlayerRef.current;
      if (!player) return;

      if (player === "left") setLeftProcessing(true);
      else setRightProcessing(true);

      if (explainPlayerRef.current === player) {
        sendRef.current({ type: "explain_spell", audio: audioBase64 });
      } else {
        const emojis = player === "left" ? leftSelectedEmojisRef.current : rightSelectedEmojisRef.current;
        sendRef.current({ type: "cast_spell", player, selected_emojis: emojis, audio: audioBase64 });
      }
    },
    [],
  );

  const { recording, startRecording, stopRecording } = useMicrophone(handleRecordingComplete);

  const handleTextSpell = useCallback(
    (player: PlayerSide, text: string) => {
      if (player === "left") setLeftProcessing(true);
      else setRightProcessing(true);

      if (explainPlayerRef.current === player) {
        send({ type: "explain_spell", text });
      } else {
        const emojis = player === "left" ? leftSelectedEmojisRef.current : rightSelectedEmojisRef.current;
        send({ type: "text_spell", player, selected_emojis: emojis, text });
      }
    },
    [send],
  );

  const handleLeftEmojiToggle = useCallback((emoji: string) => {
    setLeftSelectedEmojis((prev) =>
      prev.includes(emoji) ? prev.filter((e) => e !== emoji) : [...prev, emoji],
    );
  }, []);

  const handleRightEmojiToggle = useCallback((emoji: string) => {
    setRightSelectedEmojis((prev) =>
      prev.includes(emoji) ? prev.filter((e) => e !== emoji) : [...prev, emoji],
    );
  }, []);

  // Push-to-talk: Q for left, P for right
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if typing in an input/textarea
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (winner) return;
      if (recording) return; // Already recording

      const key = e.key.toLowerCase();
      if (key === "q") {
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
        (key === "q" && activePlayerRef.current === "left") ||
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
  }, [recording, winner, startRecording, stopRecording]);

  // Controls for each player — always visible
  const renderControls = (side: PlayerSide) => {
    if (winner) return null;

    const hand = side === "left" ? leftHand : rightHand;
    const selectedEmojis = side === "left" ? leftSelectedEmojis : rightSelectedEmojis;
    const onToggle = side === "left" ? handleLeftEmojiToggle : handleRightEmojiToggle;
    const isExplaining = explainPlayerRef.current === side;
    const deviceId = side === "left" ? leftDeviceId : rightDeviceId;
    const onDeviceChange = side === "left" ? setLeftDeviceId : setRightDeviceId;

    return (
      <div className="flex flex-col gap-3 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
        {/* Mic selector */}
        {devices.length > 1 && (
          <MicSelector
            devices={devices}
            value={deviceId}
            onChange={onDeviceChange}
          />
        )}

        <EmojiHand
          emojis={hand}
          selectedEmojis={selectedEmojis}
          onToggle={onToggle}
          disabled={false}
        />

        {/* Explain prompt */}
        {isExplaining && (
          <p
            className="text-sm text-center"
            style={{ fontFamily: "'Crimson Pro', serif", fontStyle: "italic", color: "var(--amber-warn)" }}
          >
            Le juge veut une explication ! Maintiens [{side === "left" ? "Q" : "P"}] pour justifier ton sort.
          </p>
        )}

        {/* Text input */}
        <TextSpellInput
          side={side}
          onCast={handleTextSpell}
          disabled={selectedEmojis.length < 2 && !isExplaining}
        />
      </div>
    );
  };

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
              {connected ? "Connected" : "Disconnected"}
            </span>
          </div>
        </div>
        {/* Ornamental rule */}
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
            {winner === "left" ? "Wizard 1" : "Wizard 2"} Triomphe !
          </p>
        </div>
      )}

      {/* Arena */}
      <main className="flex-1 flex items-start justify-center px-6 pb-8 relative z-10">
        <div className="grid grid-cols-[1fr_auto_1fr] gap-6 w-full max-w-6xl items-start">
          {/* Player 1 column */}
          <div className="flex flex-col gap-4">
            <WizardPanel
              side="left"
              name="Wizard 1"
              keyBind="Q"
              recording={recording && activePlayerRef.current === "left"}
              transcription={leftTranscription}
              processing={leftProcessing}
              spellName={leftSpellName}
              hitColor={leftColor}
              health={leftHealth}
              visualEffect={leftVisualEffect}
            />
            {renderControls("left")}
          </div>

          {/* Judge Panel (center) */}
          <JudgePanel
            verdict={judgeVerdict}
            comment={judgeComment}
            waiting={judgeWaiting}
            spellName={judgeSpellName}
            damage={judgeDamage}
          />

          {/* Player 2 column */}
          <div className="flex flex-col gap-4">
            <WizardPanel
              side="right"
              name="Wizard 2"
              keyBind="P"
              recording={recording && activePlayerRef.current === "right"}
              transcription={rightTranscription}
              processing={rightProcessing}
              spellName={rightSpellName}
              hitColor={rightColor}
              health={rightHealth}
              visualEffect={rightVisualEffect}
            />
            {renderControls("right")}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
