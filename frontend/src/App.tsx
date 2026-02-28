import { useState, useCallback, useEffect, useRef } from "react";
import { WizardPanel } from "./components/WizardPanel";
import { EmojiHand } from "./components/EmojiHand";
import { TargetSelector } from "./components/TargetSelector";
import { JudgePanel } from "./components/JudgePanel";
import { AmbientSparkles } from "./components/AmbientSparkles";
import { TextSpellInput } from "./components/TextSpellInput";
import { useWebSocket } from "./hooks/useWebSocket";
import { useMicrophone } from "./hooks/useMicrophone";
import type {
  PlayerSide,
  ServerMessage,
  VisualEffect,
  Verdict,
} from "./types";

type TurnPhase =
  | "select_emojis"
  | "record_spell"
  | "waiting_judge"
  | "explain"
  | "record_explain"
  | "waiting_judge_explain"
  | "result";

function App() {
  // Game state from server
  const [leftHealth, setLeftHealth] = useState(100);
  const [rightHealth, setRightHealth] = useState(100);
  const [leftHand, setLeftHand] = useState<string[]>([]);
  const [rightHand, setRightHand] = useState<string[]>([]);
  const [currentTurn, setCurrentTurn] = useState<PlayerSide>("left");
  const [winner, setWinner] = useState<string | null>(null);

  // Turn state machine
  const [turnPhase, setTurnPhase] = useState<TurnPhase>("select_emojis");
  const [selectedEmojis, setSelectedEmojis] = useState<string[]>([]);
  const [target, setTarget] = useState<"attack" | "heal">("attack");

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

  // Processing state
  const [leftProcessing, setLeftProcessing] = useState(false);
  const [rightProcessing, setRightProcessing] = useState(false);

  const isExplainPhaseRef = useRef(false);

  const handleServerMessage = useCallback((msg: ServerMessage) => {
    if (msg.type === "transcription") {
      if (msg.player === "left") {
        setLeftTranscription(msg.text);
        setLeftProcessing(false);
      } else {
        setRightTranscription(msg.text);
        setRightProcessing(false);
      }
    } else if (msg.type === "spell_fizzle") {
      const fizzleMsg = msg.reason ?? "Ton sort s'est dissipe...";
      if (msg.player === "left") {
        setLeftTranscription(fizzleMsg);
        setLeftProcessing(false);
      } else {
        setRightTranscription(fizzleMsg);
        setRightProcessing(false);
      }
      setTurnPhase("select_emojis");
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

      if (msg.verdict === "EXPLAIN" && !isExplainPhaseRef.current) {
        isExplainPhaseRef.current = true;
        setTurnPhase("explain");
      } else {
        isExplainPhaseRef.current = false;
        setTurnPhase("result");
        setTimeout(() => {
          setTurnPhase("select_emojis");
          setSelectedEmojis([]);
          setTarget("attack");
          setLeftTranscription(null);
          setRightTranscription(null);
        }, 4000);
      }
    } else if (msg.type === "game_state") {
      setLeftHealth(msg.left.health);
      setRightHealth(msg.right.health);
      setLeftHand(msg.left.emoji_hand);
      setRightHand(msg.right.emoji_hand);
      setCurrentTurn(msg.current_turn);
      setWinner(msg.winner);
    }
  }, []);

  const { send, connected } = useWebSocket(handleServerMessage);

  const handleRecordingComplete = useCallback(
    (audioBase64: string) => {
      const player = currentTurn;
      if (player === "left") setLeftProcessing(true);
      else setRightProcessing(true);

      if (isExplainPhaseRef.current && turnPhase === "record_explain") {
        send({ type: "explain_spell", audio: audioBase64 });
        setTurnPhase("waiting_judge_explain");
      } else {
        send({ type: "cast_spell", player, selected_emojis: selectedEmojis, target, audio: audioBase64 });
        setTurnPhase("waiting_judge");
      }
      setJudgeWaiting(true);
      setJudgeVerdict(null);
      setJudgeComment(null);
      setJudgeSpellName(null);
      setJudgeDamage(null);
    },
    [send, currentTurn, selectedEmojis, target, turnPhase],
  );

  const { recording, startRecording, stopRecording } = useMicrophone(handleRecordingComplete);

  const handleTextSpell = useCallback(
    (player: PlayerSide, text: string) => {
      if (player !== currentTurn) return;
      if (player === "left") setLeftProcessing(true);
      else setRightProcessing(true);

      if (isExplainPhaseRef.current && turnPhase === "explain") {
        send({ type: "explain_spell", text });
        setTurnPhase("waiting_judge_explain");
      } else {
        send({ type: "text_spell", player, selected_emojis: selectedEmojis, target, text });
        setTurnPhase("waiting_judge");
      }
      setJudgeWaiting(true);
      setJudgeVerdict(null);
      setJudgeComment(null);
      setJudgeSpellName(null);
      setJudgeDamage(null);
    },
    [send, currentTurn, selectedEmojis, target, turnPhase],
  );

  const handleEmojiToggle = useCallback((emoji: string) => {
    setSelectedEmojis((prev) =>
      prev.includes(emoji) ? prev.filter((e) => e !== emoji) : [...prev, emoji],
    );
  }, []);

  const canCast = selectedEmojis.length >= 2 && turnPhase === "select_emojis" && !winner;

  const handleCastClick = useCallback(() => {
    if (!canCast) return;
    setTurnPhase("record_spell");
  }, [canCast]);

  const handleRecordClick = useCallback(() => {
    if (recording) stopRecording();
    else startRecording();
  }, [recording, startRecording, stopRecording]);

  const handleExplainRecordClick = useCallback(() => {
    if (recording) {
      stopRecording();
    } else {
      setTurnPhase("record_explain");
      startRecording();
    }
  }, [recording, startRecording, stopRecording]);

  useEffect(() => { /* turnPhase watcher — no-op, judge timeout handles reset */ }, [turnPhase]);

  const isSelectPhase = turnPhase === "select_emojis" && !winner;
  const isRecordPhase = turnPhase === "record_spell" || turnPhase === "record_explain";
  const isExplainPhase = turnPhase === "explain";
  const isWaiting = turnPhase === "waiting_judge" || turnPhase === "waiting_judge_explain";

  // Active player's controls
  const renderControls = (side: PlayerSide) => {
    if (currentTurn !== side || winner) return null;

    const hand = side === "left" ? leftHand : rightHand;

    return (
      <div className="flex flex-col gap-3 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
        <EmojiHand
          emojis={hand}
          selectedEmojis={selectedEmojis}
          onToggle={handleEmojiToggle}
          disabled={!isSelectPhase}
        />
        <TargetSelector
          target={target}
          onSelect={setTarget}
          disabled={!isSelectPhase}
        />

        {/* Cast button */}
        {isSelectPhase && (
          <button
            onClick={handleCastClick}
            disabled={!canCast}
            className="btn-arcane w-full py-3 text-center"
            style={{
              borderRadius: "4px",
              fontSize: "1.15rem",
              background: canCast
                ? "linear-gradient(180deg, rgba(201, 168, 76, 0.18) 0%, rgba(201, 168, 76, 0.05) 100%)"
                : undefined,
              boxShadow: canCast
                ? "0 0 25px rgba(201, 168, 76, 0.2), inset 0 0 20px rgba(201, 168, 76, 0.05)"
                : undefined,
            }}
          >
            Lancer le Sort
          </button>
        )}

        {/* Record button */}
        {isRecordPhase && (
          <button
            onClick={handleRecordClick}
            className={`w-full py-3 transition-all duration-200 ${recording ? "animate-record-pulse" : ""}`}
            style={{
              fontFamily: "'MedievalSharp', cursive",
              fontSize: "1.1rem",
              letterSpacing: "0.05em",
              background: recording
                ? "linear-gradient(180deg, rgba(198, 40, 40, 0.3) 0%, rgba(198, 40, 40, 0.1) 100%)"
                : "linear-gradient(180deg, rgba(198, 40, 40, 0.15) 0%, rgba(198, 40, 40, 0.05) 100%)",
              border: `1px solid ${recording ? "var(--crimson)" : "rgba(198, 40, 40, 0.4)"}`,
              color: recording ? "#ef5350" : "#e57373",
              borderRadius: "4px",
              boxShadow: recording
                ? "0 0 30px var(--crimson-glow)"
                : "0 0 15px rgba(198, 40, 40, 0.15)",
            }}
          >
            {recording ? "Relacher pour envoyer" : "Maintenir pour incanter"}
          </button>
        )}

        {/* Explain prompt */}
        {isExplainPhase && (
          <div className="flex flex-col gap-2">
            <p
              className="text-sm text-center"
              style={{ fontFamily: "'Crimson Pro', serif", fontStyle: "italic", color: "var(--amber-warn)" }}
            >
              Le juge veut une explication ! Justifie ton sort.
            </p>
            <button
              onClick={handleExplainRecordClick}
              className={`w-full py-3 transition-all duration-200 ${recording ? "animate-record-pulse" : ""}`}
              style={{
                fontFamily: "'MedievalSharp', cursive",
                fontSize: "1.1rem",
                letterSpacing: "0.05em",
                background: recording
                  ? "linear-gradient(180deg, rgba(217, 119, 6, 0.3) 0%, rgba(217, 119, 6, 0.1) 100%)"
                  : "linear-gradient(180deg, rgba(217, 119, 6, 0.15) 0%, rgba(217, 119, 6, 0.05) 100%)",
                border: `1px solid ${recording ? "var(--amber-warn)" : "rgba(217, 119, 6, 0.4)"}`,
                color: recording ? "#ffa726" : "#ffb74d",
                borderRadius: "4px",
              }}
            >
              {recording ? "Relacher pour envoyer" : "Expliquer"}
            </button>
          </div>
        )}

        {/* Text input */}
        <TextSpellInput
          side={side}
          onCast={handleTextSpell}
          disabled={!(isSelectPhase || isExplainPhase) || selectedEmojis.length < 2}
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
              isActive={currentTurn === "left" && !winner}
              recording={recording && currentTurn === "left"}
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
            waiting={judgeWaiting || isWaiting}
            spellName={judgeSpellName}
            damage={judgeDamage}
          />

          {/* Player 2 column */}
          <div className="flex flex-col gap-4">
            <WizardPanel
              side="right"
              name="Wizard 2"
              isActive={currentTurn === "right" && !winner}
              recording={recording && currentTurn === "right"}
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
