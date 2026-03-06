import { useState } from 'react';
import type { PlayerCard } from '~/lib/gameMockData';

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
                  className={`flex h-40 w-28 flex-col items-center justify-center gap-2 transition-all ${
                    selectedIndex === index
                      ? 'bg-neon-red/20 border-2 border-neon-red'
                      : 'bg-surface-light border-2 border-surface-light'
                  }`}
                >
                  {/* Card icon */}
                  <div
                    className={`flex h-16 w-16 items-center justify-center rounded-full ${
                      selectedIndex === index ? 'bg-neon-red/30' : 'bg-surface'
                    }`}
                  >
                    <svg
                      className={`h-8 w-8 ${
                        selectedIndex === index
                          ? 'text-neon-red'
                          : 'text-text-muted'
                      }`}
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
                      selectedIndex === index ? 'text-neon-red' : 'text-white'
                    }`}
                  >
                    {card.card?.toUpperCase() || 'UNKNOWN'}
                  </span>

                  {/* Selection indicator */}
                  {selectedIndex === index && (
                    <span className="font-mono text-[8px] tracking-widest text-neon-red">
                      SELECTED
                    </span>
                  )}
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
