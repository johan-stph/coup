import type { PendingAction, PendingBlock, Role } from '~/types/game';
import { ACTION_CONFIG, ROLE_DISPLAY } from '~/types/game';

interface ActionResponsePanelProps {
  pendingAction?: PendingAction;
  pendingBlock?: PendingBlock;
  turnPhase?: string;
  currentPlayerUid: string;
  getPlayerName: (uid: string) => string;
  onChallenge: () => void;
  onBlock: (claimedRole: Role) => void;
  onPass: () => void;
  hasResponded: boolean;
}

export default function ActionResponsePanel({
  pendingAction,
  pendingBlock,
  turnPhase,
  currentPlayerUid,
  getPlayerName,
  onChallenge,
  onBlock,
  onPass,
  hasResponded,
}: ActionResponsePanelProps) {
  if (!pendingAction && !pendingBlock) return null;
  if (hasResponded) {
    return (
      <div className="fixed left-1/2 top-20 z-40 w-full max-w-md -translate-x-1/2 transform border border-neon-cyan bg-void-light/95 p-4 backdrop-blur">
        <p className="text-center font-mono text-sm text-text-muted">
          Waiting for other players...
        </p>
      </div>
    );
  }

  // Challenging a pending action
  if (turnPhase === 'challenge' && pendingAction && !pendingBlock) {
    // Don't show challenge UI to the player who performed the action
    if (pendingAction.actorUid === currentPlayerUid) {
      return (
        <div className="fixed left-1/2 top-20 z-40 w-full max-w-md -translate-x-1/2 transform border border-neon-cyan bg-void-light/95 p-4 backdrop-blur">
          <p className="text-center font-mono text-sm text-text-muted">
            Waiting for other players...
          </p>
        </div>
      );
    }

    const actionConfig = ACTION_CONFIG[pendingAction.type];
    const actorName = getPlayerName(pendingAction.actorUid);
    const canChallenge = pendingAction.claimedRole !== undefined;

    return (
      <div className="fixed left-1/2 top-20 z-40 w-full max-w-md -translate-x-1/2 transform border border-neon-cyan bg-void-light/95 p-6 backdrop-blur">
        <div className="mb-4 text-center">
          <p className="font-display text-sm font-semibold tracking-wider text-white">
            {actorName} claims{' '}
            <span className="text-neon-cyan">
              {pendingAction.claimedRole
                ? ROLE_DISPLAY[pendingAction.claimedRole]
                : actionConfig.displayName}
            </span>
          </p>
          <p className="mt-1 font-mono text-xs text-text-muted">
            {actionConfig.description}
          </p>
        </div>

        <div className="flex justify-center gap-3">
          {canChallenge && (
            <button
              onClick={onChallenge}
              className="btn-glow border border-neon-red px-6 py-2 font-display text-xs font-semibold tracking-widest text-neon-red transition-all hover:bg-neon-red/10"
            >
              CHALLENGE
            </button>
          )}
          <button
            onClick={onPass}
            className="btn-glow border border-text-muted px-6 py-2 font-display text-xs font-semibold tracking-widest text-text-muted transition-all hover:bg-text-muted/10"
          >
            PASS
          </button>
        </div>
      </div>
    );
  }

  // Blocking a pending action
  if (turnPhase === 'block' && pendingAction && !pendingBlock) {
    // Don't show block UI to the player who performed the action
    if (pendingAction.actorUid === currentPlayerUid) {
      return (
        <div className="fixed left-1/2 top-20 z-40 w-full max-w-md -translate-x-1/2 transform border border-neon-cyan bg-void-light/95 p-4 backdrop-blur">
          <p className="text-center font-mono text-sm text-text-muted">
            Waiting for other players...
          </p>
        </div>
      );
    }

    const actionConfig = ACTION_CONFIG[pendingAction.type];
    const actorName = getPlayerName(pendingAction.actorUid);

    // Determine blockable roles for this action
    const blockableRoles: Role[] = [];
    if (pendingAction.type === 'foreign_aid') {
      blockableRoles.push('duke');
    } else if (pendingAction.type === 'steal') {
      blockableRoles.push('captain', 'ambassador');
    } else if (pendingAction.type === 'assassinate') {
      blockableRoles.push('contessa');
    }

    return (
      <div className="fixed left-1/2 top-20 z-40 w-full max-w-md -translate-x-1/2 transform border border-neon-cyan bg-void-light/95 p-6 backdrop-blur">
        <div className="mb-4 text-center">
          <p className="font-display text-sm font-semibold tracking-wider text-white">
            {actorName} performs{' '}
            <span className="text-neon-cyan">{actionConfig.displayName}</span>
          </p>
          <p className="mt-1 font-mono text-xs text-text-muted">
            Block with:{' '}
            {blockableRoles.map((r) => ROLE_DISPLAY[r]).join(' or ')}
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-2">
          {blockableRoles.map((role) => (
            <button
              key={role}
              onClick={() => onBlock(role)}
              className="btn-glow border border-neon-red px-4 py-2 font-display text-xs font-semibold tracking-widest text-neon-red transition-all hover:bg-neon-red/10"
            >
              BLOCK ({ROLE_DISPLAY[role]})
            </button>
          ))}
          <button
            onClick={onPass}
            className="btn-glow border border-text-muted px-6 py-2 font-display text-xs font-semibold tracking-widest text-text-muted transition-all hover:bg-text-muted/10"
          >
            PASS
          </button>
        </div>
      </div>
    );
  }

  // Challenging a block
  if (turnPhase === 'challenge' && pendingBlock) {
    // Don't show challenge UI to the player who performed the block
    if (pendingBlock.blockerUid === currentPlayerUid) {
      return (
        <div className="fixed left-1/2 top-20 z-40 w-full max-w-md -translate-x-1/2 transform border border-neon-cyan bg-void-light/95 p-4 backdrop-blur">
          <p className="text-center font-mono text-sm text-text-muted">
            Waiting for other players...
          </p>
        </div>
      );
    }

    const blockerName = getPlayerName(pendingBlock.blockerUid);

    return (
      <div className="fixed left-1/2 top-20 z-40 w-full max-w-md -translate-x-1/2 transform border border-neon-cyan bg-void-light/95 p-6 backdrop-blur">
        <div className="mb-4 text-center">
          <p className="font-display text-sm font-semibold tracking-wider text-white">
            {blockerName} blocks with{' '}
            <span className="text-neon-cyan">
              {ROLE_DISPLAY[pendingBlock.claimedRole]}
            </span>
          </p>
        </div>

        <div className="flex justify-center gap-3">
          <button
            onClick={onChallenge}
            className="btn-glow border border-neon-red px-6 py-2 font-display text-xs font-semibold tracking-widest text-neon-red transition-all hover:bg-neon-red/10"
          >
            CHALLENGE
          </button>
          <button
            onClick={onPass}
            className="btn-glow border border-text-muted px-6 py-2 font-display text-xs font-semibold tracking-widest text-text-muted transition-all hover:bg-text-muted/10"
          >
            PASS
          </button>
        </div>
      </div>
    );
  }

  return null;
}
