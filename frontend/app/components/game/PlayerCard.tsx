import type { GamePlayer } from '~/lib/gameMockData';
import { CARD_IMAGES } from '~/lib/cardImages';

interface PlayerCardProps {
  player: GamePlayer;
}

export default function PlayerCard({ player }: PlayerCardProps) {
  return (
    <div className="flex w-28 flex-col items-center gap-2">
      {/* Avatar placeholder */}
      <div className="corner-brackets">
        <div className="flex h-16 w-16 items-center justify-center bg-surface">
          <svg
            className="h-8 w-8 text-surface-light"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
          </svg>
        </div>
      </div>

      {/* Username */}
      <span className="w-full truncate text-center font-display text-xs font-semibold tracking-wider text-white">
        {player.userName}
      </span>

      {/* Coins */}
      <span className="flex items-center gap-1 font-mono text-xs text-neon-cyan">
        <svg
          className="h-3.5 w-3.5"
          viewBox="0 0 64 64"
          fill="none"
          stroke="currentColor"
          strokeWidth="5"
          strokeLinecap="round"
        >
          <ellipse cx="32" cy="46" rx="20" ry="7" />
          <ellipse cx="32" cy="38" rx="20" ry="7" />
          <ellipse cx="32" cy="30" rx="20" ry="7" />
          <ellipse cx="32" cy="22" rx="20" ry="7" />
        </svg>
        {player.coins}
      </span>

      {/* Influence cards */}
      <div className="flex gap-2">
        {player.cards.map((cardData, i) => (
          <div
            key={i}
            className={`relative h-20 w-14 overflow-hidden shadow-[0_4px_16px_rgba(0,0,0,0.7)] ${
              cardData.revealed
                ? 'border border-neon-red/40'
                : 'border border-surface-light'
            }`}
          >
            {cardData.revealed &&
            cardData.card &&
            CARD_IMAGES[cardData.card] ? (
              <>
                <img
                  src={CARD_IMAGES[cardData.card]}
                  alt={cardData.card}
                  className="absolute inset-0 h-full w-full object-cover grayscale opacity-30"
                />
                <div className="absolute inset-0 bg-neon-red/10" />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 to-transparent px-1 pb-1 pt-3">
                  <span className="block font-mono text-[5px] tracking-widest text-neon-red">
                    OUT
                  </span>
                </div>
              </>
            ) : (
              /* Face-down card back */
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface-light">
                <div
                  className="h-8 w-8 rounded-sm border border-surface opacity-40"
                  style={{
                    backgroundImage:
                      'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px)',
                  }}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
