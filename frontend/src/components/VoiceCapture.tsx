import React, { useEffect } from 'react'
import { useMicVAD } from '@ricky0123/vad-react'
import { encodeWAV } from '../utils/audio'

interface VoiceCaptureProps {
  active: boolean;
  onAudio: (buffer: ArrayBuffer) => void;
}

export default function VoiceCapture({ active, onAudio }: VoiceCaptureProps) {
  const vad = useMicVAD({
    startOnLoad: false,
    model: "legacy",
    baseAssetPath: "/",
    onnxWASMBasePath: "/",
    onSpeechEnd: (audio: Float32Array) => {
      if (!active) return;
      const wavBuffer = encodeWAV(audio, 16000);
      onAudio(wavBuffer);
    },
    positiveSpeechThreshold: 0.6,
    negativeSpeechThreshold: 0.35,
    minSpeechFrames: 3,
    redemptionFrames: 8,
  });

  useEffect(() => {
    if (active && !vad.loading && !vad.errored) {
      vad.start();
    } else {
      vad.pause();
    }
  }, [active, vad.loading, vad.errored]);

  if (vad.loading) {
    return (
      <div className="voice-capture">
        <div className="mic-indicator inactive">
          <span className="mic-icon">🎤</span>
          <span className="mic-text">Loading voice detection...</span>
        </div>
      </div>
    );
  }

  if (vad.errored) {
    return (
      <div className="voice-capture">
        <div className="mic-indicator inactive">
          <span className="mic-icon">❌</span>
          <span className="mic-text">Mic error: {vad.errored}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="voice-capture">
      {active ? (
        <div className={`mic-indicator ${vad.userSpeaking ? 'speaking' : 'listening'}`}>
          <span className="mic-icon">🎤</span>
          <span className="mic-text">
            {vad.userSpeaking ? 'Casting spell...' : 'Speak your spell!'}
          </span>
        </div>
      ) : (
        <div className="mic-indicator inactive">
          <span className="mic-icon">🎤</span>
          <span className="mic-text">Opponent's turn...</span>
        </div>
      )}
    </div>
  );
}
