import React, { useState, useEffect, useCallback } from 'react'
import { SpellData } from '../hooks/useGame'

interface SpellEffectsProps {
  spell: SpellData | null;
  onComplete: () => void;
}

interface Particle {
  id: number;
  emoji: string;
  x: number;
  y: number;
  delay: number;
  duration: number;
  size: number;
}

export default function SpellEffects({ spell, onComplete }: SpellEffectsProps) {
  const [showName, setShowName] = useState(false);
  const [showParticles, setShowParticles] = useState(false);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [shake, setShake] = useState(false);
  const [tint, setTint] = useState<string | null>(null);

  useEffect(() => {
    if (!spell) return;

    // Screen shake
    if (spell.screen_shake > 0.1) {
      setShake(true);
      document.documentElement.style.setProperty('--shake-intensity', `${spell.screen_shake * 15}px`);
      setTimeout(() => setShake(false), 500);
    }

    // Color tint
    setTint(spell.color_tint);
    setTimeout(() => setTint(null), 600);

    // Spell name text
    setShowName(true);
    setTimeout(() => setShowName(false), 2000);

    // Emoji particles
    const count = Math.max(10, spell.creativity_score * 4);
    const newParticles: Particle[] = [];
    for (let i = 0; i < count; i++) {
      const emoji = spell.emojis[i % spell.emojis.length];
      newParticles.push({
        id: i,
        emoji,
        x: 10 + Math.random() * 80,
        y: -10 - Math.random() * 20,
        delay: Math.random() * 0.5,
        duration: 1.5 + Math.random() * 1.5,
        size: 1.2 + Math.random() * 1.5,
      });
    }
    setParticles(newParticles);
    setShowParticles(true);

    // Cleanup
    const timer = setTimeout(() => {
      setShowParticles(false);
      setParticles([]);
      onComplete();
    }, 3000);

    return () => clearTimeout(timer);
  }, [spell]);

  if (!spell) return null;

  return (
    <>
      {/* Screen shake */}
      {shake && <style>{`
        .game-screen {
          animation: screenShake 0.5s ease-out;
        }
        @keyframes screenShake {
          0%, 100% { transform: translate(0, 0); }
          10% { transform: translate(var(--shake-intensity), calc(var(--shake-intensity) * -0.5)); }
          20% { transform: translate(calc(var(--shake-intensity) * -0.8), var(--shake-intensity)); }
          30% { transform: translate(var(--shake-intensity), calc(var(--shake-intensity) * -0.3)); }
          40% { transform: translate(calc(var(--shake-intensity) * -0.5), calc(var(--shake-intensity) * 0.8)); }
          50% { transform: translate(calc(var(--shake-intensity) * 0.3), calc(var(--shake-intensity) * -0.6)); }
          60% { transform: translate(calc(var(--shake-intensity) * -0.2), calc(var(--shake-intensity) * 0.4)); }
          70% { transform: translate(calc(var(--shake-intensity) * 0.1), calc(var(--shake-intensity) * -0.2)); }
        }
      `}</style>}

      {/* Color tint overlay */}
      {tint && (
        <div
          className="tint-overlay"
          style={{
            backgroundColor: tint,
            animation: 'tintFlash 0.6s ease-out forwards',
          }}
        />
      )}

      {/* Spell name text */}
      {showName && (
        <div className="spell-name-display" style={{ textShadow: `0 0 30px ${spell.color_tint}, 0 0 60px ${spell.color_tint}` }}>
          <div className="spell-name-text">{spell.spell_name.toUpperCase()}</div>
          <div className="spell-damage-text">-{spell.actual_damage ?? spell.damage} HP</div>
          <div className="spell-commentary">{spell.commentary}</div>
        </div>
      )}

      {/* Emoji particles */}
      {showParticles && (
        <div className="particles-container">
          {particles.map(p => (
            <div
              key={p.id}
              className="particle"
              style={{
                left: `${p.x}%`,
                top: `${p.y}%`,
                fontSize: `${p.size}rem`,
                animationDelay: `${p.delay}s`,
                animationDuration: `${p.duration}s`,
              }}
            >
              {p.emoji}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
