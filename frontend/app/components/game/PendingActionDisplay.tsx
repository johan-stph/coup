interface PendingActionDisplayProps {
  pendingAction: {
    actionType: string;
    actorUid: string;
    phase: string;
    canBeChallenged: boolean;
    canBeBlocked: boolean;
    blockingPlayerUid?: string;
    blockClaimedCard?: string;
  };
  actorName: string;
  blockerName?: string;
  isActor: boolean;
  isBlocker: boolean;
  onChallenge?: () => void;
  onChallengeBlock?: () => void;
}

const ACTION_DISPLAY: Record<string, string> = {
  income: 'INCOME',
  foreign_aid: 'FOREIGN AID',
  tax: 'TAX (DUKE)',
  steal: 'STEAL (CAPTAIN)',
  assassinate: 'ASSASSINATE (ASSASSIN)',
  exchange: 'EXCHANGE (AMBASSADOR)',
  coup: 'COUP',
};

export default function PendingActionDisplay({
  pendingAction,
  actorName,
  blockerName,
  isActor,
  isBlocker,
  onChallenge,
  onChallengeBlock,
}: PendingActionDisplayProps) {
  const actionDisplay = ACTION_DISPLAY[pendingAction.actionType] || pendingAction.actionType.toUpperCase();
  const phase = pendingAction.phase;
  const blockCardDisplay = pendingAction.blockClaimedCard?.toUpperCase() || 'CARD';

  return (
    <div className="fixed left-1/2 top-20 z-40 -translate-x-1/2 transform">
      <div className="corner-brackets">
        <div className="flex flex-col items-center gap-3 bg-void-light/95 px-8 py-6 backdrop-blur-sm">
          {/* Phase indicator */}
          <span className="font-mono text-[10px] tracking-[0.3em] text-text-muted">
            {phase === 'awaiting_challenge' && 'CHALLENGE WINDOW'}
            {phase === 'awaiting_block' && 'BLOCK WINDOW'}
            {phase === 'awaiting_block_challenge' && 'CHALLENGE BLOCK'}
          </span>

          {/* Actor and action */}
          {phase === 'awaiting_block_challenge' ? (
            <div className="flex flex-col items-center gap-1">
              <span className="font-display text-sm font-bold tracking-wider text-white">
                {blockerName || 'Someone'}
              </span>
              <span className="font-mono text-xs text-text-muted">blocked with</span>
              <span className="logo-glow font-display text-2xl font-black tracking-wider text-neon-red">
                {blockCardDisplay}
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1">
              <span className="font-display text-sm font-bold tracking-wider text-white">
                {actorName}
              </span>
              <span className="font-mono text-xs text-text-muted">declared</span>
              <span className="logo-glow font-display text-2xl font-black tracking-wider text-neon-red">
                {actionDisplay}
              </span>
            </div>
          )}

          {/* Challenge button for non-actors during challenge phase */}
          {!isActor && pendingAction.canBeChallenged && phase === 'awaiting_challenge' && onChallenge && (
            <button
              onClick={onChallenge}
              className="btn-glow mt-2 border border-neon-cyan px-8 py-2 text-center font-display text-xs font-semibold tracking-widest text-neon-cyan transition-all hover:bg-neon-cyan/10 hover:cursor-pointer"
            >
              CHALLENGE
            </button>
          )}

          {/* Challenge button for non-blockers during block challenge phase */}
          {!isBlocker && phase === 'awaiting_block_challenge' && onChallengeBlock && (
            <button
              onClick={onChallengeBlock}
              className="btn-glow mt-2 border border-neon-cyan px-8 py-2 text-center font-display text-xs font-semibold tracking-widest text-neon-cyan transition-all hover:bg-neon-cyan/10 hover:cursor-pointer"
            >
              CHALLENGE BLOCK
            </button>
          )}

          {/* Waiting message for actor or blocker */}
          {(isActor || isBlocker) && (
            <span className="mt-1 font-mono text-[10px] tracking-widest text-neon-cyan">
              WAITING FOR RESPONSES...
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
