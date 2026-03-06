import { useEffect, useState } from 'react';

interface PendingActionDisplayProps {
  pendingAction: {
    actionType: string;
    actorUid: string;
    targetUid?: string;
    phase: string;
    canBeChallenged: boolean;
    canBeBlocked: boolean;
    blockingPlayerUid?: string;
    blockClaimedCard?: string;
  };
  actorName: string;
  targetName?: string;
  blockerName?: string;
  isActor: boolean;
  isBlocker: boolean;
  isTarget: boolean;
  resolvesAt?: string | null;
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

const CHALLENGE_WINDOW_MS = 8000;
const CIRCLE_RADIUS = 16;
const CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS;

function ChallengeCountdown({ resolvesAt }: { resolvesAt: string }) {
  const [remaining, setRemaining] = useState(() =>
    Math.max(0, new Date(resolvesAt).getTime() - Date.now())
  );

  useEffect(() => {
    const interval = setInterval(() => {
      const ms = Math.max(0, new Date(resolvesAt).getTime() - Date.now());
      setRemaining(ms);
    }, 100);
    return () => clearInterval(interval);
  }, [resolvesAt]);

  const progress = Math.min(1, remaining / CHALLENGE_WINDOW_MS);
  const offset = CIRCUMFERENCE * (1 - progress);
  const seconds = Math.ceil(remaining / 1000);

  // Color shifts from cyan → red as time runs out
  const isUrgent = seconds <= 3;

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: 44, height: 44 }}
    >
      <svg width="44" height="44" className="-rotate-90">
        {/* Track */}
        <circle
          cx="22"
          cy="22"
          r={CIRCLE_RADIUS}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="3"
        />
        {/* Progress */}
        <circle
          cx="22"
          cy="22"
          r={CIRCLE_RADIUS}
          fill="none"
          stroke={isUrgent ? '#ff3b5c' : '#00f5ff'}
          strokeWidth="3"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.1s linear, stroke 0.3s' }}
        />
      </svg>
      <span
        className="absolute font-mono text-[11px] font-bold"
        style={{ color: isUrgent ? '#ff3b5c' : '#00f5ff' }}
      >
        {seconds}
      </span>
    </div>
  );
}

function BlockWaitingIndicator() {
  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: 44, height: 44 }}
    >
      <svg width="44" height="44">
        {/* Outer pulsing ring */}
        <circle
          cx="22"
          cy="22"
          r={CIRCLE_RADIUS}
          fill="none"
          stroke="rgba(255,170,0,0.3)"
          strokeWidth="3"
          className="animate-ping"
          style={{ transformOrigin: '22px 22px' }}
        />
        {/* Inner steady ring */}
        <circle
          cx="22"
          cy="22"
          r={CIRCLE_RADIUS}
          fill="none"
          stroke="#ffaa00"
          strokeWidth="2"
          strokeDasharray="6 6"
        />
      </svg>
    </div>
  );
}

export default function PendingActionDisplay({
  pendingAction,
  actorName,
  targetName,
  blockerName,
  isActor,
  isBlocker,
  isTarget,
  resolvesAt,
  onChallenge,
  onChallengeBlock,
}: PendingActionDisplayProps) {
  const actionDisplay =
    ACTION_DISPLAY[pendingAction.actionType] ||
    pendingAction.actionType.toUpperCase();
  const phase = pendingAction.phase;
  const blockCardDisplay =
    pendingAction.blockClaimedCard?.toUpperCase() || 'CARD';
  const hasTarget = pendingAction.targetUid && targetName;

  const isChallengePhase =
    phase === 'awaiting_challenge' || phase === 'awaiting_block_challenge';
  const isBlockPhase = phase === 'awaiting_block';

  return (
    <div className="fixed left-1/2 top-20 z-40 -translate-x-1/2 transform">
      <div className="corner-brackets">
        <div className="flex flex-col items-center gap-3 bg-void-light/95 px-8 py-6 backdrop-blur-sm">
          {/* Phase indicator with timer */}
          <div className="flex items-center gap-3">
            <span className="font-mono text-[10px] tracking-[0.3em] text-text-muted">
              {phase === 'awaiting_challenge' && 'CHALLENGE WINDOW'}
              {phase === 'awaiting_block' && 'BLOCK WINDOW'}
              {phase === 'awaiting_block_challenge' && 'CHALLENGE BLOCK'}
            </span>

            {/* Countdown circle for challenge phases */}
            {isChallengePhase && resolvesAt && (
              <ChallengeCountdown resolvesAt={resolvesAt} />
            )}

            {/* Pulsing indicator for block phase (no timer) */}
            {isBlockPhase && <BlockWaitingIndicator />}
          </div>

          {/* Actor and action */}
          {phase === 'awaiting_block_challenge' ? (
            <div className="flex flex-col items-center gap-1">
              <span className="font-display text-sm font-bold tracking-wider text-white">
                {blockerName || 'Someone'}
              </span>
              <span className="font-mono text-xs text-text-muted">
                blocked with
              </span>
              <span className="logo-glow font-display text-2xl font-black tracking-wider text-neon-red">
                {blockCardDisplay}
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1">
              <span className="font-display text-sm font-bold tracking-wider text-white">
                {actorName}
              </span>
              <span className="font-mono text-xs text-text-muted">
                declared
              </span>
              <span className="logo-glow font-display text-2xl font-black tracking-wider text-neon-red">
                {actionDisplay}
              </span>
              {hasTarget && (
                <>
                  <span className="font-mono text-xs text-text-muted">
                    targeting
                  </span>
                  <span
                    className={`font-display text-lg font-semibold tracking-wider ${isTarget ? 'text-neon-red' : 'text-neon-cyan'}`}
                  >
                    {isTarget ? 'YOU' : targetName}
                  </span>
                </>
              )}
            </div>
          )}

          {/* Challenge button for non-actors during challenge phase */}
          {!isActor &&
            pendingAction.canBeChallenged &&
            phase === 'awaiting_challenge' &&
            onChallenge && (
              <button
                onClick={onChallenge}
                className="btn-glow mt-2 border border-neon-cyan px-8 py-2 text-center font-display text-xs font-semibold tracking-widest text-neon-cyan transition-all hover:bg-neon-cyan/10 hover:cursor-pointer"
              >
                CHALLENGE
              </button>
            )}

          {/* Challenge button for non-blockers during block challenge phase */}
          {!isBlocker &&
            phase === 'awaiting_block_challenge' &&
            onChallengeBlock && (
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
