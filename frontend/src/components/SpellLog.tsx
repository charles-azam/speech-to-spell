import React, { useRef, useEffect } from 'react'

interface SpellLogEntry {
  spell: {
    spell_name: string;
    emojis: string[];
    damage: number;
    actual_damage?: number;
    commentary: string;
    creativity_score: number;
  };
  transcription: string;
  caster: string;
}

interface SpellLogProps {
  entries: SpellLogEntry[];
}

export default function SpellLog({ entries }: SpellLogProps) {
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [entries]);

  if (entries.length === 0) {
    return (
      <div className="spell-log" ref={logRef}>
        <div className="spell-log-empty">The duel begins... Cast the first spell!</div>
      </div>
    );
  }

  return (
    <div className="spell-log" ref={logRef}>
      {entries.map((entry, i) => (
        <div key={i} className="spell-log-entry">
          <div className="spell-log-header">
            <span className="spell-log-caster">{entry.caster}</span>
            <span className="spell-log-emojis">{entry.spell.emojis.join('')}</span>
            <span className="spell-log-name">{entry.spell.spell_name}</span>
            <span className="spell-log-damage">-{entry.spell.actual_damage ?? entry.spell.damage} HP</span>
          </div>
          <div className="spell-log-commentary">{entry.spell.commentary}</div>
        </div>
      ))}
    </div>
  );
}
