import { useState } from 'react';
import { CARD_IMAGES } from '~/lib/cardImages';

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
                    className={`relative h-52 w-36 overflow-hidden transition-all shadow-[0_12px_40px_rgba(0,0,0,0.8)] ${
                      isSelected
                        ? 'border-2 border-neon-cyan shadow-[0_0_24px_rgba(0,255,255,0.3)]'
                        : 'border-2 border-surface-light'
                    }`}
                  >
                    {/* Full-bleed character image */}
                    {CARD_IMAGES[card] ? (
                      <img
                        src={CARD_IMAGES[card]}
                        alt={card}
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-surface-light" />
                    )}
                    {/* Selection glow overlay */}
                    {isSelected && (
                      <div className="absolute inset-0 bg-neon-cyan/15" />
                    )}
                    {/* Top source badge */}
                    <div className="absolute top-2 left-2">
                      <span
                        className={`font-mono text-[7px] tracking-widest px-1.5 py-0.5 ${
                          isSelected
                            ? 'bg-neon-cyan/30 text-neon-cyan'
                            : 'bg-black/60 text-text-muted'
                        }`}
                      >
                        {source === 'hand' ? 'IN HAND' : 'DRAWN'}
                      </span>
                    </div>
                    {/* Bottom label gradient */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 to-transparent px-3 pb-3 pt-8">
                      <span
                        className={`block font-mono text-xs tracking-widest ${
                          isSelected ? 'text-neon-cyan' : 'text-white'
                        }`}
                      >
                        {card.toUpperCase()}
                      </span>
                      {isSelected && (
                        <span className="block font-mono text-[8px] tracking-widest text-neon-cyan">
                          KEEP
                        </span>
                      )}
                    </div>
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
