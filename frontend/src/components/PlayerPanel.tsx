import React from 'react'

interface PlayerPanelProps {
  name: string;
  hp: number;
  mana: number;
  isCurrentTurn: boolean;
  side: 'left' | 'right';
}

function getHPColor(hp: number): string {
  if (hp > 60) return '#44ff44';
  if (hp > 30) return '#ffcc00';
  return '#ff4444';
}

export default function PlayerPanel({ name, hp, mana, isCurrentTurn, side }: PlayerPanelProps) {
  return (
    <div className={`player-panel ${side} ${isCurrentTurn ? 'active-turn' : ''}`}>
      <div className="player-wizard">{side === 'left' ? '🧙' : '🧙‍♂️'}</div>
      <div className="player-name">{name}</div>

      <div className="stat-bar">
        <div className="stat-label">HP</div>
        <div className="bar-bg">
          <div
            className="bar-fill hp-bar"
            style={{
              width: `${hp}%`,
              backgroundColor: getHPColor(hp),
            }}
          />
        </div>
        <div className="stat-value">{hp}</div>
      </div>

      <div className="stat-bar">
        <div className="stat-label">MP</div>
        <div className="bar-bg">
          <div
            className="bar-fill mana-bar"
            style={{ width: `${mana}%` }}
          />
        </div>
        <div className="stat-value">{mana}</div>
      </div>

      {isCurrentTurn && <div className="turn-indicator">⚡ YOUR TURN ⚡</div>}
    </div>
  );
}
