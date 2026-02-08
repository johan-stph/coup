import type { PlayerState, Role } from '~/types/game';
import { ROLE_DISPLAY } from '~/types/game';

interface LocalPlayerAreaProps {
  player: PlayerState;
  userName: string;
  isYourTurn: boolean;
}

export default function LocalPlayerArea({
  player,
  userName,
  isYourTurn,
}: LocalPlayerAreaProps) {
  const totalInfluences = player.influenceCount;
  const visibleCards = player.influences || [];

  return (
    <div className="flex items-center justify-between border-t border-surface-light bg-surface/50 px-6 py-4">
      {/* Left — operative info */}
      <div className="flex flex-col gap-1">
        <span className="font-mono text-[10px] tracking-[0.3em] text-text-muted">
          OPERATIVE
        </span>
        <span className="font-display text-sm font-bold tracking-wider text-white">
          {userName}
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
      <div className="flex gap-3">
        {/* Hidden influences */}
        {visibleCards.map((role, i) => (
          <div key={i} className="corner-brackets">
            <div className="flex h-22 w-16 flex-col items-center justify-center gap-1 bg-surface-light p-2">
              <span className="font-display text-[10px] font-bold tracking-wider text-neon-cyan">
                {ROLE_DISPLAY[role]}
              </span>
            </div>
          </div>
        ))}

        {/* Revealed influences */}
        {player.revealedInfluences.map((role, i) => (
          <div key={`revealed-${i}`} className="opacity-50">
            <div className="flex h-22 w-16 flex-col items-center justify-center gap-1 border border-text-muted/30 bg-surface p-2">
              <span className="font-mono text-[8px] tracking-wider text-text-muted line-through">
                {ROLE_DISPLAY[role]}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Right — turn indicator */}
      {isYourTurn ? (
        <div className="flex items-center gap-2">
          <span className="status-pulse inline-block h-2 w-2 rounded-full bg-neon-cyan" />
          <span className="font-mono text-xs tracking-widest text-neon-cyan">
            YOUR TURN
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full bg-text-muted/30" />
          <span className="font-mono text-xs tracking-widest text-text-muted">
            STANDBY
          </span>
        </div>
      )}
    </div>
  );
}
