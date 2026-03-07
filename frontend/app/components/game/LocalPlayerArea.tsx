import type { GamePlayer } from '~/lib/gameMockData';
import { CARD_IMAGES } from '~/lib/cardImages';

interface LocalPlayerAreaProps {
  player: GamePlayer;
  isMyTurn: boolean;
}

export default function LocalPlayerArea({
  player,
  isMyTurn,
}: LocalPlayerAreaProps) {
  return (
    <div className="flex items-center justify-between border-t border-surface-light bg-surface/50 px-6 py-4">
      {/* Left — operative info */}
      <div className="flex flex-col gap-1">
        <span className="font-mono text-[10px] tracking-[0.3em] text-text-muted">
          OPERATIVE
        </span>
        <span className="font-display text-sm font-bold tracking-wider text-white">
          {player.userName}
        </span>
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
      </div>

      {/* Center — influence cards */}
      <div className="flex gap-4">
        {player.cards.map((cardData, i) => (
          <div key={i} className="corner-brackets">
            <div
              className={`relative h-44 w-28 overflow-hidden shadow-[0_12px_40px_rgba(0,0,0,0.8)] ${
                cardData.revealed
                  ? 'border-2 border-neon-red/50'
                  : 'border-2 border-neon-cyan/50'
              }`}
            >
              {/* Full-bleed character image */}
              {cardData.card && CARD_IMAGES[cardData.card] ? (
                <img
                  src={CARD_IMAGES[cardData.card]}
                  alt={cardData.card}
                  className={`absolute inset-0 h-full w-full object-cover transition-all ${
                    cardData.revealed ? 'grayscale opacity-30' : ''
                  }`}
                />
              ) : (
                <div className="absolute inset-0 bg-surface-light" />
              )}
              {/* Red tint overlay for revealed cards */}
              {cardData.revealed && (
                <div className="absolute inset-0 bg-neon-red/10" />
              )}
              {/* Bottom label gradient */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 to-transparent px-2 pb-2 pt-6">
                {cardData.revealed ? (
                  <>
                    <span className="block font-mono text-[7px] tracking-widest text-text-muted line-through">
                      {cardData.card?.toUpperCase()}
                    </span>
                    <span className="block font-mono text-[6px] tracking-widest text-neon-red">
                      REVEALED
                    </span>
                  </>
                ) : cardData.card ? (
                  <span className="block font-mono text-[8px] tracking-widest text-neon-cyan">
                    {cardData.card.toUpperCase()}
                  </span>
                ) : (
                  <span className="block font-mono text-[8px] tracking-widest text-text-muted">
                    CLASSIFIED
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Right — turn indicator */}
      {isMyTurn && (
        <div className="flex items-center gap-2">
          <span className="status-pulse inline-block h-2 w-2 rounded-full bg-neon-cyan" />
          <span className="font-mono text-xs tracking-widest text-neon-cyan">
            YOUR TURN
          </span>
        </div>
      )}
    </div>
  );
}
