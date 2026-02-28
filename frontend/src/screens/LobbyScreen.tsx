import React, { useState } from 'react'

interface LobbyScreenProps {
  onCreateGame: (name: string) => void;
  onJoinGame: (code: string, name: string) => void;
  roomCode: string;
  waiting: boolean;
  error: string;
}

export default function LobbyScreen({ onCreateGame, onJoinGame, roomCode, waiting, error }: LobbyScreenProps) {
  const [mode, setMode] = useState<'menu' | 'create' | 'join'>('menu');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');

  if (waiting) {
    return (
      <div className="lobby">
        <h1 className="title">⚡ Speech to Spell ⚡</h1>
        <div className="waiting-room">
          <div className="room-code-display">
            <div className="room-code-label">Room Code</div>
            <div className="room-code-value">{roomCode}</div>
          </div>
          <p className="waiting-text">Waiting for opponent to join...</p>
          <p className="waiting-hint">Share this code with your opponent</p>
        </div>
      </div>
    );
  }

  return (
    <div className="lobby">
      <h1 className="title">⚡ Speech to Spell ⚡</h1>
      <p className="subtitle">A Wizard Duel Game — Cast spells with your voice!</p>

      {error && <div className="error-banner">{error}</div>}

      {mode === 'menu' && (
        <div className="menu-buttons">
          <button className="btn btn-primary" onClick={() => setMode('create')}>
            Create Game
          </button>
          <button className="btn btn-secondary" onClick={() => setMode('join')}>
            Join Game
          </button>
        </div>
      )}

      {mode === 'create' && (
        <div className="form-panel">
          <h2>Create New Game</h2>
          <input
            className="input"
            placeholder="Your wizard name"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && name.trim() && onCreateGame(name.trim())}
            autoFocus
          />
          <div className="form-buttons">
            <button className="btn btn-secondary" onClick={() => setMode('menu')}>Back</button>
            <button
              className="btn btn-primary"
              onClick={() => name.trim() && onCreateGame(name.trim())}
              disabled={!name.trim()}
            >
              Create
            </button>
          </div>
        </div>
      )}

      {mode === 'join' && (
        <div className="form-panel">
          <h2>Join Game</h2>
          <input
            className="input"
            placeholder="Room code (4 letters)"
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase().slice(0, 4))}
            autoFocus
          />
          <input
            className="input"
            placeholder="Your wizard name"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && name.trim() && code.length === 4 && onJoinGame(code, name.trim())}
          />
          <div className="form-buttons">
            <button className="btn btn-secondary" onClick={() => setMode('menu')}>Back</button>
            <button
              className="btn btn-primary"
              onClick={() => onJoinGame(code, name.trim())}
              disabled={!name.trim() || code.length !== 4}
            >
              Join
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
