import type { Role, PendingInfluenceLoss } from '~/types/game';
import { ROLE_DISPLAY } from '~/types/game';

interface InfluenceLossPanelProps {
  pendingInfluenceLoss: PendingInfluenceLoss;
  currentPlayerUid: string;
  influences: Role[];
  onLoseInfluence: (role: Role) => void;
}

export default function InfluenceLossPanel({
  pendingInfluenceLoss,
  currentPlayerUid,
  influences,
  onLoseInfluence,
}: InfluenceLossPanelProps) {
  // Only show to the player who needs to lose influence
  if (pendingInfluenceLoss.playerUid !== currentPlayerUid) {
    return (
      <div className="fixed left-1/2 top-20 z-40 w-full max-w-md -translate-x-1/2 transform border border-neon-cyan bg-void-light/95 p-4 backdrop-blur">
        <p className="text-center font-mono text-sm text-text-muted">
          Waiting for player to lose influence...
        </p>
      </div>
    );
  }

  const getReasonText = () => {
    switch (pendingInfluenceLoss.reason) {
      case 'challenge_failed':
        return 'Your challenge failed';
      case 'challenge_succeeded':
        return 'Your action was challenged successfully';
      case 'assassinated':
        return 'You were assassinated';
      case 'couped':
        return 'You were couped';
    }
  };

  return (
    <div className="fixed left-1/2 top-20 z-40 w-full max-w-md -translate-x-1/2 transform border border-neon-red bg-void-light/95 p-6 backdrop-blur">
      <div className="mb-4 text-center">
        <p className="font-display text-sm font-semibold tracking-wider text-neon-red">
          LOSE INFLUENCE
        </p>
        <p className="mt-2 font-mono text-xs text-text-muted">
          {getReasonText()}
        </p>
        <p className="mt-1 font-mono text-xs text-white">
          Choose a card to reveal:
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        {influences.map((role, index) => (
          <button
            key={index}
            onClick={() => onLoseInfluence(role)}
            className="btn-glow border border-neon-red px-4 py-3 font-display text-xs font-semibold tracking-widest text-neon-red transition-all hover:bg-neon-red/10"
          >
            {ROLE_DISPLAY[role]}
          </button>
        ))}
      </div>
    </div>
  );
}
