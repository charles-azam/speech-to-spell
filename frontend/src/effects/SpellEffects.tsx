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

// Safe CSS injection with validation
const safeInjectCSS = (css: string): boolean => {
  try {
    // Basic validation - reject suspicious patterns
    if (/[<>"'`;{}]/.test(css)) {
      return false
    }
    return true
  } catch {
    return false
  }
}

// Safe SVG injection with validation
const safeInjectSVG = (svg: string): boolean => {
  try {
    // Basic validation - reject script tags and suspicious patterns
    if (/<script|javascript:|onerror|onload/i.test(svg)) {
      return false
    }
    return true
  } catch {
    return false
  }
}

export default function SpellEffects({ spell, onComplete }: SpellEffectsProps) {
  const [showName, setShowName] = useState(false);
  const [showParticles, setShowParticles] = useState(false);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [shake, setShake] = useState(false);
  const [tint, setTint] = useState<string | null>(null);

  const [metaEffect, setMetaEffect] = useState<string | null>(null)
  const [customCSS, setCustomCSS] = useState<string | null>(null)
  const [customSVG, setCustomSVG] = useState<string | null>(null)

  useEffect(() => {
    if (!spell) return;

    // Meta effects (high creativity spells)
    if (spell.meta_effect && spell.creativity_score >= 9) {
      setMetaEffect(spell.meta_effect)
      setTimeout(() => setMetaEffect(null), 3000)
    }

    // Custom CSS animations (creative spells)
    if (spell.css_animation && spell.creativity_score >= 7 && safeInjectCSS(spell.css_animation)) {
      setCustomCSS(spell.css_animation)
      setTimeout(() => setCustomCSS(null), 3000)
    }

    // Custom SVG filters (creative spells)
    if (spell.svg_filter && spell.creativity_score >= 7 && safeInjectSVG(spell.svg_filter)) {
      setCustomSVG(spell.svg_filter)
      setTimeout(() => setCustomSVG(null), 3000)
    }

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
      setCustomCSS(null)
      setCustomSVG(null)
      setMetaEffect(null)
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

      {/* Custom CSS Animation */}
      {customCSS && (
        <style dangerouslySetInnerHTML={{ __html: customCSS }} />
      )}

      {/* Custom SVG Filter */}
      {customSVG && (
        <svg style={{ display: 'none' }}>
          <defs dangerouslySetInnerHTML={{ __html: customSVG }} />
        </svg>
      )}

      {/* Meta Effects */}
      {metaEffect === 'invert' && (
        <style>{`
          .game-screen {
            filter: invert(100%);
            transition: filter 0.3s ease;
          }
        `}</style>
      )}
      {metaEffect === 'pixelate' && (
        <style>{`
          .game-screen {
            filter: blur(2px);
            transition: filter 0.3s ease;
          }
        `}</style>
      )}
      {metaEffect === 'glitch' && (
        <style>{`
          .game-screen {
            animation: glitchEffect 0.1s infinite alternate;
          }
          @keyframes glitchEffect {
            0% { transform: translate(0, 0); }
            20% { transform: translate(-2px, 2px); }
            40% { transform: translate(-2px, -2px); }
            60% { transform: translate(2px, 2px); }
            80% { transform: translate(2px, -2px); }
            100% { transform: translate(0, 0); }
          }
        `}</style>
      )}
    </>
  );
}
