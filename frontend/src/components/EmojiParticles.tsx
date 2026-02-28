import { useEffect, useState } from "react";

interface Particle {
  id: number;
  emoji: string;
  left: number; // percentage 0-100
  size: number; // rem
  delay: number; // ms
  drift: number; // horizontal drift in px
  rotation: number; // degrees
}

interface EmojiParticlesProps {
  emojis: string[];
  color: string | null;
}

const PARTICLE_COUNT = 30;
const ANIMATION_DURATION_MS = 2000;

function createParticles(emojis: string[]): Particle[] {
  return Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
    id: i,
    emoji: emojis[Math.floor(Math.random() * emojis.length)],
    left: Math.random() * 100,
    size: 1.5 + Math.random() * 2.5,
    delay: Math.random() * 500,
    drift: (Math.random() - 0.5) * 60,
    rotation: Math.random() * 360,
  }));
}

export function EmojiParticles({ emojis, color }: EmojiParticlesProps) {
  const [particles] = useState(() => createParticles(emojis));
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(
      () => setVisible(false),
      ANIMATION_DURATION_MS + 500,
    );
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div
      className="absolute inset-0 pointer-events-none overflow-hidden z-30"
      style={
        color
          ? { filter: `drop-shadow(0 0 6px ${color})` }
          : undefined
      }
    >
      {particles.map((p) => (
        <span
          key={p.id}
          style={{
            position: "absolute",
            left: `${p.left}%`,
            top: "-10%",
            fontSize: `${p.size}rem`,
            animationName: "emoji-fall",
            animationDuration: `${ANIMATION_DURATION_MS}ms`,
            animationDelay: `${p.delay}ms`,
            animationTimingFunction: "ease-in",
            animationFillMode: "forwards",
            opacity: 0,
            ["--drift" as string]: `${p.drift}px`,
            ["--rotation" as string]: `${p.rotation}deg`,
          }}
        >
          {p.emoji}
        </span>
      ))}
      <style>{`
        @keyframes emoji-fall {
          0% {
            transform: translateX(0) rotate(0deg);
            opacity: 1;
          }
          80% {
            opacity: 1;
          }
          100% {
            transform: translateX(var(--drift)) translateY(110vh) rotate(var(--rotation));
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
