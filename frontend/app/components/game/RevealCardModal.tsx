import { useState } from 'react';
import type { PlayerCard } from '~/lib/gameMockData';
import { CARD_IMAGES } from '~/lib/cardImages';

interface RevealCardModalProps {
  cards: PlayerCard[];
  reason: 'challenge_lost' | 'couped' | 'assassinated';
  onReveal: (cardIndex: number) => void;
}

const REASON_TEXT: Record<string, string> = {
  challenge_lost: 'CHALLENGE FAILED',
  couped: 'COUP EXECUTED',
  assassinated: 'ASSASSINATION SUCCESSFUL',
};

const REASON_DESCRIPTION: Record<string, string> = {
  challenge_lost: 'You must reveal one of your influence cards',
  couped: 'You have been couped and must reveal a card',
  assassinated: 'You have been assassinated and must reveal a card',
};

export default function RevealCardModal({
  cards,
  reason,
  onReveal,
}: RevealCardModalProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  // Only show unrevealed cards
  const unrevealedCards = cards
    .map((card, index) => ({ card, index }))
    .filter(({ card }) => !card.revealed);

  const handleConfirm = () => {
    if (selectedIndex !== null) {
      onReveal(selectedIndex);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="corner-brackets">
        <div className="flex w-[500px] flex-col items-center gap-6 bg-void p-8">
          {/* Title */}
          <div className="flex flex-col items-center gap-2">
            <span className="font-mono text-[10px] tracking-[0.3em] text-neon-red">
              {REASON_TEXT[reason]}
            </span>
            <h2 className="font-display text-2xl font-bold tracking-wider text-white">
              CHOOSE CARD TO REVEAL
            </h2>
            <p className="text-center font-mono text-xs text-text-muted">
              {REASON_DESCRIPTION[reason]}
            </p>
          </div>

          {/* Card selection */}
          <div className="flex gap-6">
            {unrevealedCards.map(({ card, index }) => (
              <button
                key={index}
                onClick={() => setSelectedIndex(index)}
                className={`corner-brackets transition-all hover:cursor-pointer hover:scale-105 ${
                  selectedIndex === index ? 'shadow-glow' : ''
                }`}
              >
                <div
                  className={`relative h-56 w-36 overflow-hidden transition-all shadow-[0_12px_40px_rgba(0,0,0,0.8)] ${
                    selectedIndex === index
                      ? 'border-2 border-neon-red shadow-[0_0_24px_rgba(255,0,60,0.4)]'
                      : 'border-2 border-surface-light'
                  }`}
                >
                  {/* Full-bleed character image */}
                  {card.card && CARD_IMAGES[card.card] ? (
                    <img
                      src={CARD_IMAGES[card.card]}
                      alt={card.card}
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-surface-light" />
                  )}
                  {/* Selection glow overlay */}
                  {selectedIndex === index && (
                    <div className="absolute inset-0 bg-neon-red/15" />
                  )}
                  {/* Bottom label gradient */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 to-transparent px-3 pb-3 pt-8">
                    <span
                      className={`block font-mono text-xs tracking-widest ${
                        selectedIndex === index ? 'text-neon-red' : 'text-white'
                      }`}
                    >
                      {card.card?.toUpperCase() || 'UNKNOWN'}
                    </span>
                    {selectedIndex === index && (
                      <span className="block font-mono text-[8px] tracking-widest text-neon-red">
                        SELECTED
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Confirm button */}
          <button
            onClick={handleConfirm}
            disabled={selectedIndex === null}
            className="btn-glow w-full border border-neon-red py-3 text-center font-display text-sm font-semibold tracking-widest text-neon-red transition-all hover:bg-neon-red/10 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
          >
            REVEAL CARD
          </button>

          {/* Warning */}
          <div className="flex items-center gap-2 rounded border border-neon-red/30 bg-neon-red/10 px-4 py-2">
            <svg
              className="h-4 w-4 text-neon-red"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            </svg>
            <span className="font-mono text-xs text-neon-red">
              This card will be permanently revealed to all players
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
