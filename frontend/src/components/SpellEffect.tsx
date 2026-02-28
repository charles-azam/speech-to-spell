import { useEffect, useState } from "react";
import type { VisualEffect, EffectTemplate } from "../types";

interface Particle {
  id: number;
  emoji: string;
  startX: number; // percentage 0-100
  startY: number; // percentage 0-100
  endX: number;
  endY: number;
  size: number; // rem
  delay: number; // ms
  rotation: number; // degrees
}

// --- Template particle generators ---
// Each returns an array of particles with start/end positions

function generateExplosion(effect: VisualEffect): Particle[] {
  return Array.from({ length: effect.particle_count }, (_, i) => {
    const angle = (Math.PI * 2 * i) / effect.particle_count + (Math.random() - 0.5) * 0.5;
    const distance = 30 + Math.random() * 40 * effect.scale;
    return {
      id: i,
      emoji: effect.emojis[i % effect.emojis.length] ?? "✨",
      startX: 50,
      startY: 50,
      endX: 50 + Math.cos(angle) * distance,
      endY: 50 + Math.sin(angle) * distance,
      size: 1.2 + Math.random() * 1.5 * effect.scale,
      delay: Math.random() * 200,
      rotation: Math.random() * 720,
    };
  });
}

function generateSwirl(effect: VisualEffect): Particle[] {
  return Array.from({ length: effect.particle_count }, (_, i) => {
    const t = i / effect.particle_count;
    const startAngle = t * Math.PI * 4;
    const endAngle = startAngle + Math.PI * 2;
    const startR = 5;
    const endR = 20 + 25 * effect.scale;
    return {
      id: i,
      emoji: effect.emojis[i % effect.emojis.length] ?? "✨",
      startX: 50 + Math.cos(startAngle) * startR,
      startY: 50 + Math.sin(startAngle) * startR,
      endX: 50 + Math.cos(endAngle) * endR,
      endY: 50 + Math.sin(endAngle) * endR,
      size: 1.0 + Math.random() * 1.5 * effect.scale,
      delay: t * 300,
      rotation: 360 + Math.random() * 360,
    };
  });
}

function generateRain(effect: VisualEffect): Particle[] {
  return Array.from({ length: effect.particle_count }, (_, i) => {
    const x = Math.random() * 100;
    return {
      id: i,
      emoji: effect.emojis[i % effect.emojis.length] ?? "✨",
      startX: x + (Math.random() - 0.5) * 10,
      startY: -10,
      endX: x + (Math.random() - 0.5) * 20,
      endY: 110,
      size: 1.2 + Math.random() * 1.8 * effect.scale,
      delay: Math.random() * effect.duration_s * 500,
      rotation: Math.random() * 360,
    };
  });
}

function generateWaveLeft(effect: VisualEffect): Particle[] {
  return Array.from({ length: effect.particle_count }, (_, i) => {
    const y = 10 + (Math.random() * 80);
    return {
      id: i,
      emoji: effect.emojis[i % effect.emojis.length] ?? "✨",
      startX: -10,
      startY: y + (Math.random() - 0.5) * 20,
      endX: 110,
      endY: y + (Math.random() - 0.5) * 20,
      size: 1.0 + Math.random() * 2.0 * effect.scale,
      delay: Math.random() * 400,
      rotation: Math.random() * 360,
    };
  });
}

function generateWaveRight(effect: VisualEffect): Particle[] {
  return Array.from({ length: effect.particle_count }, (_, i) => {
    const y = 10 + (Math.random() * 80);
    return {
      id: i,
      emoji: effect.emojis[i % effect.emojis.length] ?? "✨",
      startX: 110,
      startY: y + (Math.random() - 0.5) * 20,
      endX: -10,
      endY: y + (Math.random() - 0.5) * 20,
      size: 1.0 + Math.random() * 2.0 * effect.scale,
      delay: Math.random() * 400,
      rotation: -Math.random() * 360,
    };
  });
}

function generateShatter(effect: VisualEffect): Particle[] {
  return Array.from({ length: effect.particle_count }, (_, i) => {
    const angle = Math.random() * Math.PI * 2;
    const distance = 35 + Math.random() * 35 * effect.scale;
    return {
      id: i,
      emoji: effect.emojis[i % effect.emojis.length] ?? "✨",
      startX: 50 + (Math.random() - 0.5) * 10,
      startY: 50 + (Math.random() - 0.5) * 10,
      endX: 50 + Math.cos(angle) * distance,
      endY: 50 + Math.sin(angle) * distance,
      size: 0.8 + Math.random() * 1.5 * effect.scale,
      delay: Math.random() * 100,
      rotation: 360 + Math.random() * 720,
    };
  });
}

function generatePulse(effect: VisualEffect): Particle[] {
  return Array.from({ length: Math.min(effect.particle_count, 8) }, (_, i) => {
    const angle = (Math.PI * 2 * i) / Math.min(effect.particle_count, 8);
    const r = 10 + 5 * effect.scale;
    return {
      id: i,
      emoji: effect.emojis[i % effect.emojis.length] ?? "✨",
      startX: 50 + Math.cos(angle) * r,
      startY: 50 + Math.sin(angle) * r,
      endX: 50 + Math.cos(angle) * r,
      endY: 50 + Math.sin(angle) * r,
      size: 2.0 + Math.random() * 2.0 * effect.scale,
      delay: i * 100,
      rotation: 0,
    };
  });
}

function generateSpiral(effect: VisualEffect): Particle[] {
  return Array.from({ length: effect.particle_count }, (_, i) => {
    const t = i / effect.particle_count;
    const angle = t * Math.PI * 6;
    const endR = 15 + 30 * t * effect.scale;
    return {
      id: i,
      emoji: effect.emojis[i % effect.emojis.length] ?? "✨",
      startX: 50,
      startY: 50,
      endX: 50 + Math.cos(angle) * endR,
      endY: 50 + Math.sin(angle) * endR,
      size: 1.0 + Math.random() * 1.5 * effect.scale,
      delay: t * 500,
      rotation: angle * (180 / Math.PI),
    };
  });
}

function generateRise(effect: VisualEffect): Particle[] {
  return Array.from({ length: effect.particle_count }, (_, i) => {
    const x = 20 + Math.random() * 60;
    return {
      id: i,
      emoji: effect.emojis[i % effect.emojis.length] ?? "✨",
      startX: x,
      startY: 110,
      endX: x + (Math.random() - 0.5) * 30,
      endY: -10 - Math.random() * 10,
      size: 1.2 + Math.random() * 1.8 * effect.scale,
      delay: Math.random() * effect.duration_s * 400,
      rotation: (Math.random() - 0.5) * 180,
    };
  });
}

const TEMPLATE_GENERATORS: Record<EffectTemplate, (effect: VisualEffect) => Particle[]> = {
  explosion: generateExplosion,
  swirl: generateSwirl,
  rain: generateRain,
  wave_left: generateWaveLeft,
  wave_right: generateWaveRight,
  shatter: generateShatter,
  pulse: generatePulse,
  spiral: generateSpiral,
  rise: generateRise,
};

function buildKeyframes(effect: VisualEffect): string {
  if (effect.template === "pulse") {
    return `
      @keyframes spell-move {
        0% { transform: translate(0, 0) scale(1) rotate(0deg); opacity: 0; }
        20% { opacity: 1; transform: translate(0, 0) scale(${1.3 * effect.scale}) rotate(0deg); }
        50% { transform: translate(0, 0) scale(${0.8 * effect.scale}) rotate(0deg); opacity: 1; }
        80% { transform: translate(0, 0) scale(${1.5 * effect.scale}) rotate(0deg); opacity: 1; }
        100% { transform: translate(0, 0) scale(${0.5 * effect.scale}) rotate(0deg); opacity: 0; }
      }
    `;
  }
  return `
    @keyframes spell-move {
      0% {
        transform: translate(0, 0) rotate(0deg) scale(0.3);
        opacity: 0;
      }
      15% {
        opacity: 1;
        transform: translate(calc(var(--dx) * 0.15), calc(var(--dy) * 0.15)) rotate(calc(var(--rot) * 0.15)) scale(1);
      }
      75% {
        opacity: 1;
      }
      100% {
        transform: translate(var(--dx), var(--dy)) rotate(var(--rot)) scale(0.5);
        opacity: 0;
      }
    }
  `;
}

interface SpellEffectProps {
  effect: VisualEffect;
}

export function SpellEffect({ effect }: SpellEffectProps) {
  const [particles] = useState(() => {
    const generator = TEMPLATE_GENERATORS[effect.template] ?? TEMPLATE_GENERATORS.explosion;
    return generator(effect);
  });
  const [visible, setVisible] = useState(true);

  const durationMs = effect.duration_s * 1000;

  // Auto-cleanup
  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), durationMs + 500);
    return () => clearTimeout(timer);
  }, [durationMs]);

  if (!visible) return null;

  const keyframes = buildKeyframes(effect);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-30">
      {/* Layer 1: Template-based particles */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          filter: `drop-shadow(0 0 8px ${effect.primary_color}) drop-shadow(0 0 4px ${effect.secondary_color})`,
        }}
      >
        {particles.map((p) => {
          const dx = `${p.endX - p.startX}cqw`;
          const dy = `${p.endY - p.startY}cqh`;
          return (
            <span
              key={p.id}
              style={{
                position: "absolute",
                left: `${p.startX}%`,
                top: `${p.startY}%`,
                fontSize: `${p.size}rem`,
                animationName: "spell-move",
                animationDuration: `${durationMs}ms`,
                animationDelay: `${p.delay}ms`,
                animationTimingFunction: "cubic-bezier(0.25, 0.1, 0.25, 1)",
                animationFillMode: "forwards",
                opacity: 0,
                ["--dx" as string]: dx,
                ["--dy" as string]: dy,
                ["--rot" as string]: `${p.rotation}deg`,
              }}
            >
              {p.emoji}
            </span>
          );
        })}
      </div>

      <style>{keyframes}</style>
    </div>
  );
}
