interface ArchitecturePageProps {
  onBack: () => void;
}

function FlowNode({
  icon,
  label,
  sublabel,
  badge,
  badgeColor,
  glowColor,
  delay,
}: {
  icon: string;
  label: string;
  sublabel: string;
  badge?: string;
  badgeColor?: string;
  glowColor?: string;
  delay: number;
}) {
  return (
    <div
      className="animate-fade-in-up flex flex-col items-center gap-2"
      style={{ animationDelay: `${delay}s` }}
    >
      <div
        className="relative flex flex-col items-center justify-center rounded-xl px-5 py-4 min-w-[140px]"
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border-subtle)",
          boxShadow: glowColor
            ? `0 0 24px ${glowColor}, 0 0 48px ${glowColor}`
            : "0 0 20px rgba(0,0,0,0.3)",
        }}
      >
        <span className="text-3xl mb-1">{icon}</span>
        <span
          className="text-sm font-semibold tracking-wide text-center"
          style={{ color: "var(--text-primary)", fontFamily: "'Cinzel', serif" }}
        >
          {label}
        </span>
        <span
          className="text-xs text-center mt-0.5"
          style={{ color: "var(--text-dim)", fontFamily: "'Crimson Pro', serif" }}
        >
          {sublabel}
        </span>
        {badge && (
          <span
            className="absolute -top-2.5 right-2 text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full"
            style={{
              background: badgeColor ?? "var(--gold)",
              color: "#0a0a14",
              fontFamily: "'Cinzel', serif",
            }}
          >
            {badge}
          </span>
        )}
      </div>
    </div>
  );
}

function FlowArrow({ delay }: { delay: number }) {
  return (
    <div
      className="animate-fade-in-up flex items-center mx-1"
      style={{ animationDelay: `${delay}s` }}
    >
      <div
        className="h-[2px] w-8 sm:w-12"
        style={{
          background: "linear-gradient(90deg, var(--gold-dim), var(--gold))",
        }}
      />
      <span
        className="text-sm -ml-1"
        style={{ color: "var(--gold)" }}
      >
        ›
      </span>
    </div>
  );
}

function ModelCard({
  icon,
  title,
  modelId,
  badgeLabel,
  badgeColor,
  glowColor,
  bullets,
  delay,
}: {
  icon: string;
  title: string;
  modelId: string;
  badgeLabel: string;
  badgeColor: string;
  glowColor: string;
  bullets: string[];
  delay: number;
}) {
  return (
    <div
      className="animate-fade-in-up ornate-card rounded-xl p-5 flex flex-col gap-3"
      style={{
        animationDelay: `${delay}s`,
        boxShadow: `0 0 20px ${glowColor}`,
      }}
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl">{icon}</span>
        <div className="flex flex-col">
          <span
            className="text-base font-semibold tracking-wide"
            style={{ color: "var(--text-primary)", fontFamily: "'Cinzel', serif" }}
          >
            {title}
          </span>
          <code
            className="text-[11px] mt-0.5"
            style={{ color: "var(--text-dim)" }}
          >
            {modelId}
          </code>
        </div>
        <span
          className="ml-auto text-[10px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-full"
          style={{
            background: badgeColor,
            color: "#0a0a14",
            fontFamily: "'Cinzel', serif",
          }}
        >
          {badgeLabel}
        </span>
      </div>
      <ul className="flex flex-col gap-1.5">
        {bullets.map((b, i) => (
          <li
            key={i}
            className="text-sm leading-relaxed"
            style={{ color: "var(--text-secondary)", fontFamily: "'Crimson Pro', serif" }}
          >
            <span style={{ color: "var(--gold-dim)", marginRight: "6px" }}>
              -
            </span>
            <span dangerouslySetInnerHTML={{ __html: b }} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function TechBadge({ label }: { label: string }) {
  return (
    <span
      className="text-[11px] tracking-wider px-3 py-1 rounded-full"
      style={{
        background: "rgba(201, 168, 76, 0.08)",
        border: "1px solid var(--border-subtle)",
        color: "var(--text-dim)",
        fontFamily: "'Cinzel', serif",
      }}
    >
      {label}
    </span>
  );
}

export function ArchitecturePage({ onBack }: ArchitecturePageProps) {
  const latencyPoints = [
    "<b>Voxtral Mini</b> — Fastest SOTA multilingual STT. Transcription in ~500ms.",
    "<b>Ministral 8B</b> — Chosen over larger models for speed. Fast multilingual inference, single tool call per task (no multi-turn). 3 independent tasks (judge, emoji inference, commentary) all use the same lightweight model.",
    "<b>Minimalist commentator agent</b> — Homemade agent pattern: each call sends only a system prompt + 1 user message with the last 5 events. No conversation history accumulates — context is manually managed to stay tiny.",
    "<b>Single tool calls everywhere</b> — Judge = 1 tool call. Emoji inference = 1 tool call. No agentic loops, no back-and-forth. Minimizes round trips.",
    "<b>EC2 in Europe</b> — Server co-located with Mistral's EU inference endpoints. Minimal network latency.",
    "<b>Pre-generated sound bank</b> — 25 sounds generated offline. Instant disk lookup at runtime, zero generation latency.",
    "<b>Fire-and-forget commentary</b> — Commentator runs asynchronously after the judge, never blocks the game loop.",
    "<b>TTS caching</b> — In-memory cache (500 entries) avoids redundant ElevenLabs calls for repeated phrases.",
  ];

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-12 relative z-10">
      {/* Header */}
      <h1
        className="animate-fade-in-up text-4xl sm:text-5xl font-bold tracking-[0.08em] mb-2 text-center"
        style={{
          fontFamily: "'Cinzel Decorative', 'Cinzel', serif",
          color: "var(--gold-bright)",
          textShadow:
            "0 0 40px rgba(201, 168, 76, 0.25), 0 2px 4px rgba(0,0,0,0.5)",
        }}
      >
        Speech to Spell
      </h1>
      <p
        className="animate-fade-in-up text-sm mb-12"
        style={{
          color: "var(--text-dim)",
          fontFamily: "'Crimson Pro', serif",
          animationDelay: "0.1s",
        }}
      >
        Technical Architecture
      </p>

      {/* Flow Diagram */}
      <div className="flex flex-wrap items-center justify-center gap-y-4 mb-14">
        <FlowNode
          icon="🎙️"
          label="Player Voice"
          sublabel="Browser mic"
          delay={0.2}
        />
        <FlowArrow delay={0.3} />
        <FlowNode
          icon="🗣️"
          label="Voxtral Mini"
          sublabel="SOTA STT · ~500ms"
          badge="Mistral"
          badgeColor="var(--gold)"
          glowColor="rgba(201, 168, 76, 0.15)"
          delay={0.4}
        />
        <FlowArrow delay={0.5} />
        {/* Two agents stacked — Judge + Commentator in parallel */}
        <div
          className="animate-fade-in-up flex flex-col items-center gap-2"
          style={{ animationDelay: "0.6s" }}
        >
          <div className="flex flex-col items-center gap-3">
            <FlowNode
              icon="⚖️"
              label="Judge Agent"
              sublabel="Verdict + Damage + Emoji inference"
              badge="Mistral"
              badgeColor="var(--gold)"
              glowColor="rgba(201, 168, 76, 0.15)"
              delay={0.6}
            />
            <FlowNode
              icon="🎭"
              label="Commentator Agent"
              sublabel="Marc & Sophie · Last 5 events"
              badge="Mistral"
              badgeColor="var(--gold)"
              glowColor="rgba(201, 168, 76, 0.15)"
              delay={0.7}
            />
          </div>
          <span
            className="text-[10px] tracking-widest uppercase"
            style={{ color: "var(--text-dim)", fontFamily: "'Cinzel', serif" }}
          >
            2 agents · Ministral 8B
          </span>
        </div>
        <FlowArrow delay={0.8} />
        <FlowNode
          icon="🔊"
          label="ElevenLabs"
          sublabel="TTS voices · Judge & Duo"
          badge="ElevenLabs"
          badgeColor="#7c3aed"
          glowColor="rgba(124, 58, 237, 0.15)"
          delay={0.9}
        />
        <FlowArrow delay={1.0} />
        <FlowNode
          icon="✨"
          label="Game Effects"
          sublabel="Visual + Sound + Verdict"
          delay={1.1}
        />
      </div>

      {/* Latency is King */}
      <div
        className="animate-fade-in-up w-full max-w-3xl rounded-xl p-6 sm:p-8 mb-14 ornate-card"
        style={{
          animationDelay: "1.2s",
          boxShadow:
            "0 0 30px rgba(201, 168, 76, 0.12), 0 0 60px rgba(201, 168, 76, 0.06), inset 0 0 30px rgba(201, 168, 76, 0.03)",
          borderColor: "var(--gold-dim)",
        }}
      >
        <h2
          className="text-xl sm:text-2xl font-bold mb-1"
          style={{
            fontFamily: "'MedievalSharp', cursive",
            color: "var(--gold-bright)",
          }}
        >
          "Latency is King"
        </h2>
        <p
          className="text-sm mb-5"
          style={{
            color: "var(--text-secondary)",
            fontFamily: "'Crimson Pro', serif",
          }}
        >
          Every design decision optimizes for real-time gameplay:
        </p>
        <ul className="flex flex-col gap-2.5">
          {latencyPoints.map((point, i) => (
            <li
              key={i}
              className="text-sm leading-relaxed flex items-start gap-2"
              style={{
                color: "var(--text-secondary)",
                fontFamily: "'Crimson Pro', serif",
              }}
            >
              <span
                className="mt-0.5 text-xs shrink-0"
                style={{ color: "var(--gold-dim)" }}
              >
                ⚡
              </span>
              <span dangerouslySetInnerHTML={{ __html: point }} />
            </li>
          ))}
        </ul>
      </div>

      {/* Model Detail Cards */}
      <div className="w-full max-w-5xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-14">
        <ModelCard
          icon="🗣️"
          title="Voxtral Mini"
          modelId="voxtral-mini-latest"
          badgeLabel="STT"
          badgeColor="var(--gold)"
          glowColor="rgba(201, 168, 76, 0.1)"
          bullets={[
            "Fastest SOTA multilingual STT",
            "Every spell passes through Voxtral",
            "~500ms per transcription",
            "Retry logic (3 attempts)",
          ]}
          delay={1.4}
        />
        <ModelCard
          icon="⚖️"
          title="Judge Agent"
          modelId="ministral-8b-latest"
          badgeLabel="Agent"
          badgeColor="var(--gold)"
          glowColor="rgba(201, 168, 76, 0.1)"
          bullets={[
            "Single tool call → verdict + damage + visual effects",
            "Emoji inference: 1 tool call, picks emojis from hand",
            "No multi-turn, no agentic loops",
            "Blocks the game loop (verdict is needed)",
          ]}
          delay={1.5}
        />
        <ModelCard
          icon="🎭"
          title="Commentator Agent"
          modelId="ministral-8b-latest"
          badgeLabel="Agent"
          badgeColor="var(--gold)"
          glowColor="rgba(201, 168, 76, 0.1)"
          bullets={[
            "Minimalist homemade agent pattern",
            "System prompt + 1 user message (last 5 events only)",
            "No conversation history — context manually managed",
            "Fire-and-forget: never blocks the game loop",
          ]}
          delay={1.6}
        />
        <ModelCard
          icon="🎤"
          title="ElevenLabs"
          modelId="eleven_multilingual_v2"
          badgeLabel="Voice"
          badgeColor="#7c3aed"
          glowColor="rgba(124, 58, 237, 0.1)"
          bullets={[
            "Judge voice (theatrical French roasts)",
            "Commentator duo (Marc & Sophie)",
            "In-memory TTS cache (500 entries)",
            "Multilingual (29 languages)",
          ]}
          delay={1.7}
        />
      </div>

      {/* Tech Stack Footer */}
      <div
        className="animate-fade-in-up flex flex-wrap items-center justify-center gap-2 mb-12"
        style={{ animationDelay: "1.8s" }}
      >
        {[
          "React 19",
          "TypeScript",
          "Vite",
          "FastAPI",
          "WebSockets",
          "Tailwind CSS",
          "EC2 Europe",
          "Docker",
        ].map((tech) => (
          <TechBadge key={tech} label={tech} />
        ))}
      </div>

      {/* Back button */}
      <button
        onClick={onBack}
        className="animate-fade-in-up btn-arcane rounded-lg"
        style={{ animationDelay: "1.9s" }}
      >
        Back to Lobby
      </button>
    </div>
  );
}
