import { useMemo } from "react";

interface Sparkle {
  id: number;
  x: number;
  y: number;
  size: number;
  delay: number;
  duration: number;
  opacity: number;
  type: "orb" | "star";
  hue: number; // 35-50 range for warm gold tones
}

export function AmbientSparkles() {
  const sparkles = useMemo<Sparkle[]>(() => {
    return Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: i < 10 ? 1.5 + Math.random() * 2 : 3 + Math.random() * 5,
      delay: Math.random() * 10,
      duration: 4 + Math.random() * 6,
      opacity: 0.1 + Math.random() * 0.3,
      type: i < 10 ? "star" as const : "orb" as const,
      hue: 35 + Math.random() * 15,
    }));
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {sparkles.map((s) => (
        <div
          key={s.id}
          className={s.type === "star" ? "absolute animate-sparkle-twinkle" : "absolute rounded-full animate-sparkle-float"}
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: `${s.size}px`,
            height: `${s.size}px`,
            backgroundColor: `hsla(${s.hue}, 60%, 55%, ${s.opacity})`,
            boxShadow: s.type === "orb"
              ? `0 0 ${s.size * 3}px hsla(${s.hue}, 60%, 55%, ${s.opacity * 0.4})`
              : `0 0 ${s.size * 2}px hsla(${s.hue}, 80%, 70%, ${s.opacity * 0.6})`,
            borderRadius: s.type === "star" ? "1px" : "50%",
            animationDelay: `${s.delay}s`,
            animationDuration: `${s.duration}s`,
          }}
        />
      ))}
    </div>
  );
}
