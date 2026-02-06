import type { GamePlayer } from '~/lib/gameMockData';

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
        <svg className="h-3.5 w-3.5" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round">
          <ellipse cx="32" cy="46" rx="20" ry="7" />
          <ellipse cx="32" cy="38" rx="20" ry="7" />
          <ellipse cx="32" cy="30" rx="20" ry="7" />
          <ellipse cx="32" cy="22" rx="20" ry="7" />
        </svg>
        {player.coins}
      </span>

      {/* Face-down cards */}
      <div className="flex gap-1.5">
        {Array.from({ length: player.cardCount }).map((_, i) => (
          <div
            key={i}
            className="flex h-11 w-8 items-center justify-center rounded-sm border border-neon-red-dim bg-surface-light"
          >
            <span className="font-mono text-xs text-text-muted">?</span>
          </div>
        ))}
      </div>
    </div>
  );
}
