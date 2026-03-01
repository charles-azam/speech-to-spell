import { useState } from "react";
import { API_BASE } from "../config";
import { useLanguage } from "../hooks/useLanguage";
import { LanguageToggle } from "./LanguageToggle";

type GameMode = "same_computer" | "multi_computer";

interface LobbyProps {
  onRoomCreated: (roomCode: string, side: string, mode: GameMode, wizardName: string) => void;
  onShowArchitecture: () => void;
}

export function Lobby({ onRoomCreated, onShowArchitecture }: LobbyProps) {
  const { lang, t } = useLanguage();
  const [wizardName, setWizardName] = useState("");
  const [wizardNameRight, setWizardNameRight] = useState("");
  const [mode, setMode] = useState<GameMode>("same_computer");
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const createRoom = async () => {
    if (!wizardName.trim()) {
      setError(t("lobby.errorName"));
      return;
    }
    if (mode === "same_computer" && !wizardNameRight.trim()) {
      setError("Choose a name for the second wizard!");
      return;
    }
    setLoading(true);
    setError(null);

    const payload: Record<string, string> = { wizard_name: wizardName.trim(), mode, lang };
    if (mode === "same_computer" && wizardNameRight.trim()) {
      payload.wizard_name_right = wizardNameRight.trim();
    }

    const res = await fetch(`${API_BASE}/api/rooms`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      setError(t("lobby.errorCreate"));
      setLoading(false);
      return;
    }

    const data = await res.json();
    onRoomCreated(data.room_code, data.side, mode, wizardName.trim());
  };

  const joinRoom = async () => {
    if (!wizardName.trim()) {
      setError(t("lobby.errorName"));
      return;
    }
    if (!joinCode.trim()) {
      setError(t("lobby.errorCode"));
      return;
    }
    setLoading(true);
    setError(null);

    const res = await fetch(`${API_BASE}/api/rooms/${joinCode.trim().toUpperCase()}/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wizard_name: wizardName.trim() }),
    });

    if (!res.ok) {
      const text = await res.text();
      setError(text.includes("not found") ? t("lobby.errorNotFound") : text.includes("full") ? t("lobby.errorFull") : t("lobby.errorJoin"));
      setLoading(false);
      return;
    }

    const data = await res.json();
    onRoomCreated(data.room_code, data.side, "multi_computer", wizardName.trim());
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      {/* Language toggle — top right */}
      <div className="fixed top-4 right-4 z-50">
        <LanguageToggle />
      </div>

      <h1
        className="text-5xl font-bold tracking-[0.08em] mb-2"
        style={{
          fontFamily: "'Cinzel Decorative', 'Cinzel', serif",
          color: "var(--gold-bright)",
          textShadow: "0 0 40px rgba(201, 168, 76, 0.25), 0 2px 4px rgba(0,0,0,0.5)",
        }}
      >
        {t("lobby.title")}
      </h1>

      <p className="text-sm mb-10" style={{ color: "var(--text-dim)", fontFamily: "'Crimson Pro', serif" }}>
        {t("lobby.subtitle")}
      </p>

      {/* Card */}
      <div
        className="w-full max-w-md rounded-xl p-8 flex flex-col gap-6"
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border-subtle)",
          boxShadow: "0 0 60px rgba(0,0,0,0.5)",
        }}
      >
        {/* Wizard name */}
        <div className="flex flex-col gap-2">
          <label
            className="text-sm font-semibold tracking-wider uppercase"
            style={{ color: "var(--gold)", fontFamily: "'Cinzel', serif", fontSize: "11px" }}
          >
            {t("lobby.wizardName")}
          </label>
          <input
            type="text"
            value={wizardName}
            onChange={(e) => setWizardName(e.target.value)}
            placeholder={t("lobby.wizardNamePlaceholder")}
            maxLength={20}
            className="w-full px-4 py-3 rounded-lg text-base outline-none transition-colors"
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border-subtle)",
              color: "var(--text-primary)",
              fontFamily: "'MedievalSharp', cursive",
            }}
            onFocus={(e) => (e.target.style.borderColor = "var(--border-active)")}
            onBlur={(e) => (e.target.style.borderColor = "var(--border-subtle)")}
          />
        </div>

        {/* Second wizard name (same-computer only) */}
        {mode === "same_computer" && (
          <div className="flex flex-col gap-2">
            <label
              className="text-sm font-semibold tracking-wider uppercase"
              style={{ color: "var(--gold)", fontFamily: "'Cinzel', serif", fontSize: "11px" }}
            >
              Wizard Name (Right)
            </label>
            <input
              type="text"
              value={wizardNameRight}
              onChange={(e) => setWizardNameRight(e.target.value)}
              placeholder="Opponent's wizard name..."
              maxLength={20}
              className="w-full px-4 py-3 rounded-lg text-base outline-none transition-colors"
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border-subtle)",
                color: "var(--text-primary)",
                fontFamily: "'MedievalSharp', cursive",
              }}
              onFocus={(e) => (e.target.style.borderColor = "var(--border-active)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--border-subtle)")}
            />
          </div>
        )}

        {/* Mode toggle */}
        <div className="flex flex-col gap-2">
          <label
            className="text-sm font-semibold tracking-wider uppercase"
            style={{ color: "var(--gold)", fontFamily: "'Cinzel', serif", fontSize: "11px" }}
          >
            {t("lobby.gameMode")}
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => setMode("same_computer")}
              className="flex-1 py-2.5 px-3 rounded-lg text-sm transition-all"
              style={{
                background: mode === "same_computer" ? "var(--purple-magic)" : "var(--bg-surface)",
                border: `1px solid ${mode === "same_computer" ? "var(--purple-magic)" : "var(--border-subtle)"}`,
                color: mode === "same_computer" ? "#fff" : "var(--text-secondary)",
                fontFamily: "'Crimson Pro', serif",
              }}
            >
              {t("lobby.sameComputer")}
            </button>
            <button
              onClick={() => setMode("multi_computer")}
              className="flex-1 py-2.5 px-3 rounded-lg text-sm transition-all"
              style={{
                background: mode === "multi_computer" ? "var(--purple-magic)" : "var(--bg-surface)",
                border: `1px solid ${mode === "multi_computer" ? "var(--purple-magic)" : "var(--border-subtle)"}`,
                color: mode === "multi_computer" ? "#fff" : "var(--text-secondary)",
                fontFamily: "'Crimson Pro', serif",
              }}
            >
              {t("lobby.diffComputers")}
            </button>
          </div>
        </div>

        {/* Create room button */}
        <button
          onClick={createRoom}
          disabled={loading}
          className="w-full py-3 rounded-lg text-lg font-semibold tracking-wider transition-all"
          style={{
            background: "linear-gradient(135deg, var(--gold-dim), var(--gold))",
            color: "var(--bg-deep)",
            fontFamily: "'Cinzel', serif",
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? t("lobby.creating") : t("lobby.createRoom")}
        </button>

        {/* Divider */}
        <div className="flex items-center gap-4">
          <div className="flex-1 h-px" style={{ background: "var(--border-subtle)" }} />
          <span className="text-xs" style={{ color: "var(--text-dim)", fontFamily: "'Crimson Pro', serif" }}>{t("lobby.orJoin")}</span>
          <div className="flex-1 h-px" style={{ background: "var(--border-subtle)" }} />
        </div>

        {/* Join room */}
        <div className="flex gap-2">
          <input
            type="text"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            placeholder="ABCD"
            maxLength={4}
            className="flex-1 px-4 py-3 rounded-lg text-center text-xl tracking-[0.3em] uppercase outline-none"
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border-subtle)",
              color: "var(--text-primary)",
              fontFamily: "'Cinzel', serif",
            }}
            onFocus={(e) => (e.target.style.borderColor = "var(--border-active)")}
            onBlur={(e) => (e.target.style.borderColor = "var(--border-subtle)")}
            onKeyDown={(e) => { if (e.key === "Enter") joinRoom(); }}
          />
          <button
            onClick={joinRoom}
            disabled={loading}
            className="px-6 py-3 rounded-lg text-base font-semibold tracking-wider transition-all"
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border-active)",
              color: "var(--gold)",
              fontFamily: "'Cinzel', serif",
              opacity: loading ? 0.6 : 1,
            }}
          >
            {t("lobby.join")}
          </button>
        </div>

        {/* Error */}
        {error && (
          <p className="text-sm text-center" style={{ color: "var(--crimson)" }}>
            {error}
          </p>
        )}
      </div>

      {/* Footer links */}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={onShowArchitecture}
          className="btn-arcane rounded-lg text-xs tracking-wider px-4 py-2 flex items-center gap-2"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
          </svg>
          Architecture
        </button>
        <a
          href="https://github.com/charles-azam/speech-to-spell"
          target="_blank"
          rel="noopener noreferrer"
          className="btn-arcane rounded-lg text-xs tracking-wider px-4 py-2 no-underline flex items-center gap-2"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
          </svg>
          GitHub
        </a>
        <a
          href="https://worldwide-hackathon.mistral.ai"
          target="_blank"
          rel="noopener noreferrer"
          className="btn-arcane rounded-lg text-xs tracking-wider px-4 py-2 no-underline flex items-center gap-2"
        >
          <svg width="14" height="14" viewBox="0 0 32 32" fill="currentColor">
            <rect x="2" y="2" width="8" height="8" rx="1" /><rect x="12" y="2" width="8" height="8" rx="1" /><rect x="22" y="2" width="8" height="8" rx="1" /><rect x="2" y="12" width="8" height="8" rx="1" /><rect x="22" y="12" width="8" height="8" rx="1" /><rect x="2" y="22" width="8" height="8" rx="1" /><rect x="12" y="22" width="8" height="8" rx="1" /><rect x="22" y="22" width="8" height="8" rx="1" />
          </svg>
          Mistral Hackathon
        </a>
      </div>
    </div>
  );
}
