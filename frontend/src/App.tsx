import { useState, useCallback, useEffect, useRef } from "react";
import { WizardPanel } from "./components/WizardPanel";
import { useWebSocket } from "./hooks/useWebSocket";
import { useMicrophone } from "./hooks/useMicrophone";
import type { PlayerSide, TranscriptionMessage } from "./types";

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
  const activePlayerRef = useRef<PlayerSide | null>(null);

  const handleServerMessage = useCallback((msg: TranscriptionMessage) => {
    if (msg.type === "transcription") {
      if (msg.player === "left") {
        setLeftTranscription(msg.text);
        setLeftProcessing(false);
      } else {
        setRightTranscription(msg.text);
        setRightProcessing(false);
      }
    }
  }, []);

  const { send, connected } = useWebSocket(handleServerMessage);

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

  // Determine which player is recording
  const leftRecording = recording && activePlayerRef.current === "left";
  const rightRecording = recording && activePlayerRef.current === "right";

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (recording) return; // only one player at a time

      const key = e.key.toLowerCase();
      if (key === PLAYER_LEFT_KEY) {
        activePlayerRef.current = "left";
        startRecording();
      } else if (key === PLAYER_RIGHT_KEY) {
        activePlayerRef.current = "right";
        startRecording();
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
  }, [recording, startRecording, stopRecording]);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="text-center py-6">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-amber-400 bg-clip-text text-transparent">
          Speech to Spell
        </h1>
        <div className="mt-2 flex items-center justify-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${connected ? "bg-green-500" : "bg-red-500"}`}
          />
          <span className="text-xs text-white/40">
            {connected ? "Connected" : "Disconnected"}
          </span>
        </div>
      </header>

      {/* Arena */}
      <main className="flex-1 flex items-center justify-center px-8 pb-8">
        <div className="grid grid-cols-[1fr_auto_1fr] gap-8 w-full max-w-5xl items-stretch">
          {/* Player 1 */}
          <WizardPanel
            side="left"
            name="Wizard 1"
            keyBind={PLAYER_LEFT_KEY}
            recording={leftRecording}
            transcription={leftTranscription}
            processing={leftProcessing}
          />

          {/* VS divider */}
          <div className="flex items-center">
            <span className="text-3xl font-black text-white/20 tracking-widest">
              VS
            </span>
          </div>

          {/* Player 2 */}
          <WizardPanel
            side="right"
            name="Wizard 2"
            keyBind={PLAYER_RIGHT_KEY}
            recording={rightRecording}
            transcription={rightTranscription}
            processing={rightProcessing}
          />
        </div>
      </main>
    </div>
  );
}

export default App;
