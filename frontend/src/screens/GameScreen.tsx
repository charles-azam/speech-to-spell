import React from 'react'
import PlayerPanel from '../components/PlayerPanel'
import SpellLog from '../components/SpellLog'
import Arena from '../components/Arena'
import VoiceCapture from '../components/VoiceCapture'
import SpellEffects from '../effects/SpellEffects'
import { GameStateData, SpellData } from '../hooks/useGame'

interface SpellLogEntry {
  spell: SpellData;
  transcription: string;
  caster: string;
}

interface GameScreenProps {
  gameState: GameStateData;
  myPlayerIndex: number;
  isMyTurn: boolean;
  lastSpell: SpellData | null;
  spellLog: SpellLogEntry[];
  processing: boolean;
  transcription: string;
  onAudio: (buffer: ArrayBuffer) => void;
  onSpellEffectComplete: () => void;
  onPlayAgain: () => void;
}

export default function GameScreen({
  gameState,
  myPlayerIndex,
  isMyTurn,
  lastSpell,
  spellLog,
  processing,
  transcription,
  onAudio,
  onSpellEffectComplete,
  onPlayAgain,
}: GameScreenProps) {
  const p1 = gameState.players[0];
  const p2 = gameState.players[1];
  const isFinished = gameState.phase === 'finished';

  return (
    <div className="game-screen">
      <div className="game-header">
        <PlayerPanel
          name={p1?.name || '???'}
          hp={p1?.hp || 0}
          mana={p1?.mana || 0}
          isCurrentTurn={gameState.current_turn === 0 && !isFinished}
          side="left"
        />

        <div className="arena-section">
          <Arena>
            <SpellEffects spell={lastSpell} onComplete={onSpellEffectComplete} />
          </Arena>
        </div>

        <PlayerPanel
          name={p2?.name || '???'}
          hp={p2?.hp || 0}
          mana={p2?.mana || 0}
          isCurrentTurn={gameState.current_turn === 1 && !isFinished}
          side="right"
        />
      </div>

      <div className="game-footer">
        <div className="voice-section">
          {processing && (
            <div className="processing-indicator">
              <span className="processing-spinner">✨</span>
              <span>Interpreting spell...</span>
              {transcription && <span className="processing-text">"{transcription}"</span>}
            </div>
          )}

          {!processing && !isFinished && (
            <VoiceCapture active={isMyTurn} onAudio={onAudio} />
          )}

          {isFinished && (
            <div className="game-over-overlay">
              <div className="game-over-text">
                {gameState.winner === gameState.players[myPlayerIndex]?.name
                  ? '🏆 VICTORY! 🏆'
                  : '💀 DEFEAT 💀'
                }
              </div>
              <div className="game-over-winner">{gameState.winner} wins!</div>
              <button className="btn btn-primary" onClick={onPlayAgain}>Play Again</button>
            </div>
          )}
        </div>

        <SpellLog entries={spellLog} />
      </div>
    </div>
  );
}
