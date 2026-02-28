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

  // Ref to track if we're in explain flow
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
        // Show spell effects on target
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

        // Screen shake on big damage
        if (msg.damage >= 20) {
          setScreenShake(true);
          setTimeout(() => setScreenShake(false), 500);
        }
      }

      if (msg.verdict === "EXPLAIN" && !isExplainPhaseRef.current) {
        // Judge wants an explanation
        isExplainPhaseRef.current = true;
        setTurnPhase("explain");
      } else {
        // YES or NO or second EXPLAIN verdict — show result then switch turn
        isExplainPhaseRef.current = false;
        setTurnPhase("result");
        // Auto-advance to next turn after delay
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

  // Recording complete callback
  const handleRecordingComplete = useCallback(
    (audioBase64: string) => {
      const player = currentTurn;

      if (player === "left") {
        setLeftProcessing(true);
      } else {
        setRightProcessing(true);
      }

      if (isExplainPhaseRef.current && turnPhase === "record_explain") {
        // Send explanation audio
        send({
          type: "explain_spell",
          audio: audioBase64,
        });
        setTurnPhase("waiting_judge_explain");
      } else {
        // Send cast spell with audio
        send({
          type: "cast_spell",
          player,
          selected_emojis: selectedEmojis,
          target,
          audio: audioBase64,
        });
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

  // Text spell handler (testing bypass)
  const handleTextSpell = useCallback(
    (player: PlayerSide, text: string) => {
      if (player !== currentTurn) return;

      if (player === "left") {
        setLeftProcessing(true);
      } else {
        setRightProcessing(true);
      }

      if (isExplainPhaseRef.current && turnPhase === "explain") {
        send({
          type: "explain_spell",
          text,
        });
        setTurnPhase("waiting_judge_explain");
      } else {
        send({
          type: "text_spell",
          player,
          selected_emojis: selectedEmojis,
          target,
          text,
        });
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

  const handleEmojiToggle = useCallback(
    (emoji: string) => {
      setSelectedEmojis((prev) => {
        if (prev.includes(emoji)) {
          return prev.filter((e) => e !== emoji);
        }
        return [...prev, emoji];
      });
    },
    [],
  );

  const canCast =
    selectedEmojis.length >= 2 &&
    turnPhase === "select_emojis" &&
    !winner;

  const handleCastClick = useCallback(() => {
    if (!canCast) return;
    setTurnPhase("record_spell");
  }, [canCast]);

  const handleRecordClick = useCallback(() => {
    if (recording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [recording, startRecording, stopRecording]);

  const handleExplainRecordClick = useCallback(() => {
    if (recording) {
      stopRecording();
    } else {
      setTurnPhase("record_explain");
      startRecording();
    }
  }, [recording, startRecording, stopRecording]);

  // Reset judge display on turn change
  useEffect(() => {
    if (turnPhase === "select_emojis") {
      // Keep judge verdict visible briefly, it will be cleared by the timeout in judge_verdict handler
    }
  }, [turnPhase]);

  const activeHand = currentTurn === "left" ? leftHand : rightHand;
  const isSelectPhase = turnPhase === "select_emojis" && !winner;
  const isRecordPhase = turnPhase === "record_spell" || turnPhase === "record_explain";
  const isExplainPhase = turnPhase === "explain";
  const isWaiting = turnPhase === "waiting_judge" || turnPhase === "waiting_judge_explain";

  return (
    <div className={`min-h-screen flex flex-col ${screenShake ? "animate-screen-shake" : ""}`}>
      <AmbientSparkles />

      {/* Header */}
      <header className="text-center py-5 relative z-10">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-amber-400 bg-clip-text text-transparent">
          Speech to Spell
        </h1>
        <div className="mt-2 flex items-center justify-center gap-4">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${connected ? "bg-green-500" : "bg-red-500"}`}
            />
            <span className="text-xs text-white/40">
              {connected ? "Connected" : "Disconnected"}
            </span>
          </div>
        </div>
      </header>

      {/* Winner banner */}
      {winner && (
        <div className="text-center py-4 relative z-10">
          <p className="text-3xl font-black text-yellow-400 animate-pulse">
            {winner === "left" ? "Wizard 1" : "Wizard 2"} wins!
          </p>
        </div>
      )}

      {/* Arena */}
      <main className="flex-1 flex items-start justify-center px-6 pb-6 relative z-10">
        <div className="grid grid-cols-[1fr_auto_1fr] gap-6 w-full max-w-6xl items-start">
          {/* Player 1 */}
          <div className="flex flex-col gap-3">
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

            {/* Emoji hand + controls for left player */}
            {currentTurn === "left" && !winner && (
              <div className="flex flex-col gap-3">
                <EmojiHand
                  emojis={leftHand}
                  selectedEmojis={selectedEmojis}
                  onToggle={handleEmojiToggle}
                  disabled={!isSelectPhase}
                />
                <TargetSelector
                  target={target}
                  onSelect={setTarget}
                  disabled={!isSelectPhase}
                />

                {/* Cast / Record / Explain buttons */}
                {isSelectPhase && (
                  <button
                    onClick={handleCastClick}
                    disabled={!canCast}
                    className={`
                      w-full py-3 rounded-xl text-lg font-bold uppercase tracking-wider
                      transition-all duration-200
                      ${canCast
                        ? "bg-purple-600 hover:bg-purple-500 text-white shadow-[0_0_20px_rgba(168,85,247,0.4)] hover:shadow-[0_0_30px_rgba(168,85,247,0.6)]"
                        : "bg-white/5 text-white/20 cursor-not-allowed"
                      }
                    `}
                  >
                    Lancer le sort
                  </button>
                )}
                {isRecordPhase && (
                  <button
                    onClick={handleRecordClick}
                    className={`
                      w-full py-3 rounded-xl text-lg font-bold uppercase tracking-wider
                      transition-all duration-200
                      ${recording
                        ? "bg-red-600 text-white animate-record-pulse"
                        : "bg-red-500/80 hover:bg-red-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.3)]"
                      }
                    `}
                  >
                    {recording ? "Relacher pour envoyer" : "Maintenir pour incanter"}
                  </button>
                )}
                {isExplainPhase && (
                  <div className="flex flex-col gap-2">
                    <p className="text-amber-400 text-sm text-center font-medium">
                      Le juge veut une explication ! Justifie ton sort.
                    </p>
                    <button
                      onClick={handleExplainRecordClick}
                      className={`
                        w-full py-3 rounded-xl text-lg font-bold uppercase tracking-wider
                        transition-all duration-200
                        ${recording
                          ? "bg-amber-600 text-white animate-record-pulse"
                          : "bg-amber-500/80 hover:bg-amber-500 text-white shadow-[0_0_20px_rgba(245,158,11,0.3)]"
                        }
                      `}
                    >
                      {recording ? "Relacher pour envoyer" : "Expliquer"}
                    </button>
                  </div>
                )}

                {/* Text input for testing */}
                <TextSpellInput
                  side="left"
                  onCast={handleTextSpell}
                  disabled={!(isSelectPhase || isExplainPhase) || selectedEmojis.length < 2}
                />
              </div>
            )}
          </div>

          {/* Judge Panel (center) */}
          <JudgePanel
            verdict={judgeVerdict}
            comment={judgeComment}
            waiting={judgeWaiting || isWaiting}
            spellName={judgeSpellName}
            damage={judgeDamage}
          />

          {/* Player 2 */}
          <div className="flex flex-col gap-3">
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

            {/* Emoji hand + controls for right player */}
            {currentTurn === "right" && !winner && (
              <div className="flex flex-col gap-3">
                <EmojiHand
                  emojis={rightHand}
                  selectedEmojis={selectedEmojis}
                  onToggle={handleEmojiToggle}
                  disabled={!isSelectPhase}
                />
                <TargetSelector
                  target={target}
                  onSelect={setTarget}
                  disabled={!isSelectPhase}
                />

                {/* Cast / Record / Explain buttons */}
                {isSelectPhase && (
                  <button
                    onClick={handleCastClick}
                    disabled={!canCast}
                    className={`
                      w-full py-3 rounded-xl text-lg font-bold uppercase tracking-wider
                      transition-all duration-200
                      ${canCast
                        ? "bg-purple-600 hover:bg-purple-500 text-white shadow-[0_0_20px_rgba(168,85,247,0.4)] hover:shadow-[0_0_30px_rgba(168,85,247,0.6)]"
                        : "bg-white/5 text-white/20 cursor-not-allowed"
                      }
                    `}
                  >
                    Lancer le sort
                  </button>
                )}
                {isRecordPhase && (
                  <button
                    onClick={handleRecordClick}
                    className={`
                      w-full py-3 rounded-xl text-lg font-bold uppercase tracking-wider
                      transition-all duration-200
                      ${recording
                        ? "bg-red-600 text-white animate-record-pulse"
                        : "bg-red-500/80 hover:bg-red-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.3)]"
                      }
                    `}
                  >
                    {recording ? "Relacher pour envoyer" : "Maintenir pour incanter"}
                  </button>
                )}
                {isExplainPhase && (
                  <div className="flex flex-col gap-2">
                    <p className="text-amber-400 text-sm text-center font-medium">
                      Le juge veut une explication ! Justifie ton sort.
                    </p>
                    <button
                      onClick={handleExplainRecordClick}
                      className={`
                        w-full py-3 rounded-xl text-lg font-bold uppercase tracking-wider
                        transition-all duration-200
                        ${recording
                          ? "bg-amber-600 text-white animate-record-pulse"
                          : "bg-amber-500/80 hover:bg-amber-500 text-white shadow-[0_0_20px_rgba(245,158,11,0.3)]"
                        }
                      `}
                    >
                      {recording ? "Relacher pour envoyer" : "Expliquer"}
                    </button>
                  </div>
                )}

                {/* Text input for testing */}
                <TextSpellInput
                  side="right"
                  onCast={handleTextSpell}
                  disabled={!(isSelectPhase || isExplainPhase) || selectedEmojis.length < 2}
                />
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
