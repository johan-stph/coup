import { useState } from 'react';

interface ExchangeModalProps {
  currentCards: string[];
  drawnCards: string[];
  mustKeep: number;
  onExchange: (chosenIndices: number[]) => void;
}

export default function ExchangeModal({
  currentCards,
  drawnCards,
  mustKeep,
  onExchange,
}: ExchangeModalProps) {
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);

  // All available cards: hand first (0..mustKeep-1), then drawn (mustKeep..mustKeep+1)
  const allCards = [
    ...currentCards.map((card) => ({ card, source: 'hand' as const })),
    ...drawnCards.map((card) => ({ card, source: 'drawn' as const })),
  ];

  function toggleCard(index: number) {
    setSelectedIndices((prev) => {
      if (prev.includes(index)) {
        return prev.filter((i) => i !== index);
      }
      if (prev.length >= mustKeep) return prev;
      return [...prev, index];
    });
  }

  function handleConfirm() {
    if (selectedIndices.length === mustKeep) {
      onExchange(selectedIndices);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="corner-brackets">
        <div className="flex w-[560px] flex-col items-center gap-6 bg-void p-8">
          {/* Title */}
          <div className="flex flex-col items-center gap-2">
            <span className="font-mono text-[10px] tracking-[0.3em] text-neon-cyan">
              AMBASSADOR EXCHANGE
            </span>
            <h2 className="font-display text-2xl font-bold tracking-wider text-white">
              CHOOSE {mustKeep} CARD{mustKeep !== 1 ? 'S' : ''} TO KEEP
            </h2>
            <p className="text-center font-mono text-xs text-text-muted">
              {selectedIndices.length}/{mustKeep} selected — unchosen cards
              return to the deck
            </p>
          </div>

          {/* Cards */}
          <div className="flex flex-wrap justify-center gap-4">
            {allCards.map(({ card, source }, index) => {
              const isSelected = selectedIndices.includes(index);
              const isDisabled =
                !isSelected && selectedIndices.length >= mustKeep;
              return (
                <button
                  key={index}
                  onClick={() => toggleCard(index)}
                  disabled={isDisabled}
                  className={`corner-brackets transition-all hover:scale-105 ${
                    isDisabled
                      ? 'opacity-40 cursor-not-allowed'
                      : 'hover:cursor-pointer'
                  } ${isSelected ? 'shadow-glow' : ''}`}
                >
                  <div
                    className={`flex h-40 w-28 flex-col items-center justify-center gap-2 transition-all border-2 ${
                      isSelected
                        ? 'bg-neon-cyan/20 border-neon-cyan'
                        : 'bg-surface-light border-surface-light'
                    }`}
                  >
                    {/* Source label */}
                    <span
                      className={`font-mono text-[8px] tracking-widest ${
                        isSelected ? 'text-neon-cyan' : 'text-text-muted'
                      }`}
                    >
                      {source === 'hand' ? 'IN HAND' : 'DRAWN'}
                    </span>

                    {/* Card icon */}
                    <div
                      className={`flex h-14 w-14 items-center justify-center rounded-full ${
                        isSelected ? 'bg-neon-cyan/30' : 'bg-surface'
                      }`}
                    >
                      <svg
                        className={`h-7 w-7 ${isSelected ? 'text-neon-cyan' : 'text-text-muted'}`}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5zm6-10.125a1.875 1.875 0 11-3.75 0 1.875 1.875 0 013.75 0zm1.294 6.336a6.721 6.721 0 01-3.17.789 6.721 6.721 0 01-3.168-.789 3.376 3.376 0 016.338 0z"
                        />
                      </svg>
                    </div>

                    {/* Card name */}
                    <span
                      className={`font-mono text-sm tracking-widest ${
                        isSelected ? 'text-neon-cyan' : 'text-white'
                      }`}
                    >
                      {card.toUpperCase()}
                    </span>

                    {isSelected && (
                      <span className="font-mono text-[8px] tracking-widest text-neon-cyan">
                        KEEP
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Confirm */}
          <button
            onClick={handleConfirm}
            disabled={selectedIndices.length !== mustKeep}
            className="btn-glow w-full border border-neon-cyan py-3 text-center font-display text-sm font-semibold tracking-widest text-neon-cyan transition-all hover:bg-neon-cyan/10 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
          >
            CONFIRM EXCHANGE
          </button>
        </div>
      </div>
    </div>
  );
}
