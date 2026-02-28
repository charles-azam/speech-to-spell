interface EmojiHandProps {
  emojis: string[];
  selectedEmojis: string[];
  onToggle: (emoji: string) => void;
  disabled: boolean;
}

export function EmojiHand({
  emojis,
  selectedEmojis,
  onToggle,
  disabled,
}: EmojiHandProps) {
  const selectedCount = selectedEmojis.length;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between items-center px-1">
        <span className="text-xs text-white/40 font-medium tracking-wide uppercase">
          Emoji Hand
        </span>
        <span
          className={`text-xs font-mono ${
            selectedCount >= 2 ? "text-green-400" : "text-amber-400"
          }`}
        >
          {selectedCount} selected {selectedCount < 2 && "(min 2)"}
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5 justify-center">
        {emojis.map((emoji, idx) => {
          const isSelected = selectedEmojis.includes(emoji);
          return (
            <button
              key={`${emoji}-${idx}`}
              onClick={() => onToggle(emoji)}
              disabled={disabled}
              className={`
                w-11 h-11 text-2xl rounded-lg flex items-center justify-center
                transition-all duration-150 select-none
                ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer hover:scale-110 active:scale-95"}
                ${
                  isSelected
                    ? "bg-purple-500/30 ring-2 ring-purple-400 scale-110 shadow-[0_0_12px_rgba(168,85,247,0.4)]"
                    : "bg-white/5 hover:bg-white/10"
                }
              `}
            >
              {emoji}
            </button>
          );
        })}
      </div>
    </div>
  );
}
