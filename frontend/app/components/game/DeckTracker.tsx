import { useState } from 'react';
import type { GamePlayer } from '~/lib/gameMockData';
import { CARD_IMAGES } from '~/lib/cardImages';

const CARD_TYPES = ['duke', 'assassin', 'ambassador', 'captain', 'contessa'];
const CARDS_PER_TYPE = 3; // standard Coup deck

interface DeckTrackerProps {
  players: GamePlayer[];
}

export default function DeckTracker({ players }: DeckTrackerProps) {
  const [open, setOpen] = useState(false);

  // Count revealed cards per type across all players
  const revealedCounts: Record<string, number> = {};
  for (const player of players) {
    for (const card of player.cards) {
      if (card.revealed && card.card) {
        revealedCounts[card.card] = (revealedCounts[card.card] ?? 0) + 1;
      }
    }
  }

  const totalRevealed = Object.values(revealedCounts).reduce(
    (sum, n) => sum + n,
    0
  );
  const totalRemaining = CARD_TYPES.length * CARDS_PER_TYPE - totalRevealed;

  return (
    <>
      {/* Toggle button — fixed left side */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed left-0 top-1/2 z-40 -translate-y-1/2 flex flex-col items-center gap-1 border border-l-0 border-surface-light bg-surface/80 px-2 py-3 backdrop-blur-sm transition-colors hover:bg-surface hover:cursor-pointer"
        title="Deck tracker"
      >
        <svg
          className="h-4 w-4 text-text-muted"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
          />
        </svg>
        <span className="font-mono text-[8px] tracking-widest text-text-muted [writing-mode:vertical-rl]">
          DECK
        </span>
        <span className="font-mono text-[9px] text-neon-cyan">
          {totalRemaining}
        </span>
      </button>

      {/* Slide-in panel */}
      <div
        className={`fixed left-0 top-0 z-50 h-full w-64 transform border-r border-surface-light bg-void/95 backdrop-blur-md transition-transform duration-300 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Panel header */}
        <div className="flex items-center justify-between border-b border-surface-light px-4 py-3">
          <div>
            <span className="block font-mono text-[9px] tracking-[0.3em] text-text-muted">
              INTELLIGENCE
            </span>
            <span className="font-display text-sm font-bold tracking-wider text-white">
              DECK TRACKER
            </span>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="flex h-7 w-7 items-center justify-center text-text-muted transition-colors hover:text-white hover:cursor-pointer"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Summary */}
        <div className="flex items-center justify-between border-b border-surface-light/50 px-4 py-2">
          <span className="font-mono text-[9px] tracking-widest text-text-muted">
            CARDS REMAINING
          </span>
          <span className="font-mono text-sm font-bold text-neon-cyan">
            {totalRemaining}
            <span className="text-text-muted">
              /{CARD_TYPES.length * CARDS_PER_TYPE}
            </span>
          </span>
        </div>

        {/* Cards grouped by character */}
        <div className="flex flex-col gap-3 overflow-y-auto p-4">
          {CARD_TYPES.map((cardType) => {
            const revealed = revealedCounts[cardType] ?? 0;
            const remaining = CARDS_PER_TYPE - revealed;

            return (
              <div
                key={cardType}
                className={`corner-brackets transition-opacity ${remaining === 0 ? 'opacity-30' : ''}`}
              >
                <div className="relative flex h-20 overflow-hidden border border-surface-light bg-surface">
                  {/* Character image */}
                  {CARD_IMAGES[cardType] && (
                    <img
                      src={CARD_IMAGES[cardType]}
                      alt={cardType}
                      className={`h-full w-20 flex-shrink-0 object-cover transition-all ${
                        remaining === 0 ? 'grayscale' : ''
                      }`}
                    />
                  )}

                  {/* Info */}
                  <div className="flex flex-1 flex-col justify-center gap-1 px-3">
                    <span className="font-display text-xs font-bold tracking-wider text-white">
                      {cardType.toUpperCase()}
                    </span>

                    {/* Pip indicators */}
                    <div className="flex gap-1">
                      {Array.from({ length: CARDS_PER_TYPE }).map((_, i) => (
                        <div
                          key={i}
                          className={`h-2 w-2 rounded-full border ${
                            i < remaining
                              ? 'border-neon-cyan bg-neon-cyan'
                              : 'border-surface-light bg-transparent'
                          }`}
                        />
                      ))}
                    </div>

                    <span className="font-mono text-[9px] text-text-muted">
                      {remaining} of {CARDS_PER_TYPE} left
                      {revealed > 0 && (
                        <span className="ml-1 text-neon-red">
                          · {revealed} out
                        </span>
                      )}
                    </span>
                  </div>

                  {/* Eliminated overlay */}
                  {remaining === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="font-mono text-[8px] tracking-widest text-neon-red">
                        ELIMINATED
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer note */}
        <div className="absolute bottom-0 left-0 right-0 border-t border-surface-light/50 px-4 py-3">
          <p className="font-mono text-[8px] text-text-muted">
            Based on publicly revealed cards only.
          </p>
        </div>
      </div>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px]"
          onClick={() => setOpen(false)}
        />
      )}
    </>
  );
}
