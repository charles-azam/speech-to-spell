import React from 'react'
import { useGame } from './hooks/useGame'
import LobbyScreen from './screens/LobbyScreen'
import GameScreen from './screens/GameScreen'

export default function App() {
  const {
    phase,
    roomCode,
    gameState,
    myPlayerIndex,
    lastSpell,
    spellLog,
    processing,
    transcription,
    error,
    isMyTurn,
    createGame,
    joinGame,
    sendAudio,
    resetGame,
    setLastSpell,
  } = useGame();

  if (phase === 'lobby' || phase === 'waiting') {
    return (
      <LobbyScreen
        onCreateGame={createGame}
        onJoinGame={joinGame}
        roomCode={roomCode}
        waiting={phase === 'waiting'}
        error={error}
      />
    );
  }

  if ((phase === 'playing' || phase === 'finished') && gameState) {
    return (
      <GameScreen
        gameState={gameState}
        myPlayerIndex={myPlayerIndex}
        isMyTurn={isMyTurn}
        lastSpell={lastSpell}
        spellLog={spellLog}
        processing={processing}
        transcription={transcription}
        onAudio={sendAudio}
        onSpellEffectComplete={() => setLastSpell(null)}
        onPlayAgain={resetGame}
      />
    );
  }

  return (
    <div className="app">
      <h1>Speech to Spell</h1>
      <p>Loading...</p>
    </div>
  );
}
