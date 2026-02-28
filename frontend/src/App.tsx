import { useState, useCallback, useEffect, useRef } from "react";
import { WizardPanel } from "./components/WizardPanel";
import { MicSelector } from "./components/MicSelector";
import { TextSpellInput } from "./components/TextSpellInput";
import { useWebSocket } from "./hooks/useWebSocket";
import { useMicrophone } from "./hooks/useMicrophone";
import { useAudioDevices } from "./hooks/useAudioDevices";
import type { PlayerSide, ServerMessage, VisualEffect } from "./types";

const PLAYER_LEFT_KEY = "q";
const PLAYER_RIGHT_KEY = "p";

function App() {
  const [leftTranscription, setLeftTranscription] = useState<string | null>(
    null,
  );
  const [rightTranscription, setRightTranscription] = useState<string | null>(
    null,
  );
  const [leftProcessing, setLeftProcessing] = useState(false);
  const [rightProcessing, setRightProcessing] = useState(false);
  const [leftSpellName, setLeftSpellName] = useState<string | null>(null);
  const [rightSpellName, setRightSpellName] = useState<string | null>(null);
  const [leftColor, setLeftColor] = useState<string | null>(null);
  const [rightColor, setRightColor] = useState<string | null>(null);
  const [leftVisualEffect, setLeftVisualEffect] = useState<VisualEffect | null>(null);
  const [rightVisualEffect, setRightVisualEffect] = useState<VisualEffect | null>(null);
  const [leftHealth, setLeftHealth] = useState(100);
  const [rightHealth, setRightHealth] = useState(100);
  const [leftMana, setLeftMana] = useState(100);
  const [rightMana, setRightMana] = useState(100);
  const [winner, setWinner] = useState<string | null>(null);
  const activePlayerRef = useRef<PlayerSide | null>(null);

  const { devices } = useAudioDevices();
  const [leftDeviceId, setLeftDeviceId] = useState("");
  const [rightDeviceId, setRightDeviceId] = useState("");

  // Auto-select first device when devices load
  useEffect(() => {
    if (devices.length > 0 && !leftDeviceId) {
      setLeftDeviceId(devices[0].deviceId);
    }
    if (devices.length > 1 && !rightDeviceId) {
      setRightDeviceId(devices[1].deviceId);
    } else if (devices.length > 0 && !rightDeviceId) {
      setRightDeviceId(devices[0].deviceId);
    }
  }, [devices, leftDeviceId, rightDeviceId]);

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
      const fizzleMsg = "Your wand does not respect you, speak louder!";
      if (msg.player === "left") {
        setLeftTranscription(fizzleMsg);
        setLeftProcessing(false);
      } else {
        setRightTranscription(fizzleMsg);
        setRightProcessing(false);
      }
    } else if (msg.type === "spell_result") {
      // Spell name goes on the caster's side, color on the target's side
      if (msg.caster === "left") {
        setLeftSpellName(msg.spell_name);
      } else {
        setRightSpellName(msg.spell_name);
      }
      if (msg.target === "left") {
        setLeftColor(msg.color);
        if (msg.visual_effect) {
          setLeftVisualEffect(msg.visual_effect);
          const cleanupMs = (msg.visual_effect.duration_s + 1) * 1000;
          setTimeout(() => setLeftVisualEffect(null), cleanupMs);
        }
      } else {
        setRightColor(msg.color);
        if (msg.visual_effect) {
          setRightVisualEffect(msg.visual_effect);
          const cleanupMs = (msg.visual_effect.duration_s + 1) * 1000;
          setTimeout(() => setRightVisualEffect(null), cleanupMs);
        }
      }
    } else if (msg.type === "game_state") {
      setLeftHealth(msg.left.health);
      setLeftMana(msg.left.mana);
      setRightHealth(msg.right.health);
      setRightMana(msg.right.mana);
      setWinner(msg.winner);
    }
  }, []);

  const { send, connected } = useWebSocket(handleServerMessage);

  const handleTextSpell = useCallback(
    (player: PlayerSide, text: string) => {
      if (player === "left") {
        setLeftProcessing(true);
      } else {
        setRightProcessing(true);
      }
      send({ type: "text_spell", player, text });
    },
    [send],
  );

  const handleRecordingComplete = useCallback(
    (audioBase64: string) => {
      const player = activePlayerRef.current;
      if (!player) return;

      if (player === "left") {
        setLeftProcessing(true);
      } else {
        setRightProcessing(true);
      }

      send({
        type: "audio",
        player,
        audio: audioBase64,
      });
      activePlayerRef.current = null;
    },
    [send],
  );

  const { recording, startRecording, stopRecording } = useMicrophone(
    handleRecordingComplete,
  );

  const leftRecording = recording && activePlayerRef.current === "left";
  const rightRecording = recording && activePlayerRef.current === "right";

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (recording) return;
      // Don't trigger push-to-talk when typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const key = e.key.toLowerCase();
      if (key === PLAYER_LEFT_KEY) {
        activePlayerRef.current = "left";
        startRecording(leftDeviceId || undefined);
      } else if (key === PLAYER_RIGHT_KEY) {
        activePlayerRef.current = "right";
        startRecording(rightDeviceId || undefined);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (
        (key === PLAYER_LEFT_KEY && activePlayerRef.current === "left") ||
        (key === PLAYER_RIGHT_KEY && activePlayerRef.current === "right")
      ) {
        stopRecording();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [recording, startRecording, stopRecording, leftDeviceId, rightDeviceId]);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="text-center py-6">
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
        <div className="text-center py-4">
          <p className="text-3xl font-black text-yellow-400 animate-pulse">
            {winner === "left" ? "Wizard 1" : "Wizard 2"} wins!
          </p>
        </div>
      )}

      {/* Arena */}
      <main className="flex-1 flex items-center justify-center px-8 pb-8">
        <div className="grid grid-cols-[1fr_auto_1fr] gap-8 w-full max-w-5xl items-stretch">
          {/* Player 1 */}
          <div className="flex flex-col gap-3">
            <MicSelector
              devices={devices}
              value={leftDeviceId}
              onChange={setLeftDeviceId}
            />
            <WizardPanel
              side="left"
              name="Wizard 1"
              keyBind={PLAYER_LEFT_KEY}
              recording={leftRecording}
              transcription={leftTranscription}
              processing={leftProcessing}
              spellName={leftSpellName}
              hitColor={leftColor}
              health={leftHealth}
              mana={leftMana}
              visualEffect={leftVisualEffect}
            />
            <TextSpellInput
              side="left"
              onCast={handleTextSpell}
              disabled={leftProcessing}
            />
          </div>

          {/* VS divider */}
          <div className="flex items-center">
            <span className="text-3xl font-black text-white/20 tracking-widest">
              VS
            </span>
          </div>

          {/* Player 2 */}
          <div className="flex flex-col gap-3">
            <MicSelector
              devices={devices}
              value={rightDeviceId}
              onChange={setRightDeviceId}
            />
            <WizardPanel
              side="right"
              name="Wizard 2"
              keyBind={PLAYER_RIGHT_KEY}
              recording={rightRecording}
              transcription={rightTranscription}
              processing={rightProcessing}
              spellName={rightSpellName}
              hitColor={rightColor}
              health={rightHealth}
              mana={rightMana}
              visualEffect={rightVisualEffect}
            />
            <TextSpellInput
              side="right"
              onCast={handleTextSpell}
              disabled={rightProcessing}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
