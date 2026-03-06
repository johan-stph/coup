interface CardRevealNotificationProps {
  playerName: string;
  reason: 'challenge_lost' | 'couped' | 'assassinated';
}

const REASON_TEXT: Record<string, string> = {
  challenge_lost: 'CHALLENGE SUCCESSFUL',
  couped: 'COUP SUCCESSFUL',
  assassinated: 'ASSASSINATION SUCCESSFUL',
};

const REASON_MESSAGE: Record<string, string> = {
  challenge_lost: 'is revealing an influence card...',
  couped: 'has been couped and is revealing a card...',
  assassinated: 'has been assassinated and is revealing a card...',
};

export default function CardRevealNotification({
  playerName,
  reason,
}: CardRevealNotificationProps) {
  return (
    <div className="fixed left-1/2 top-20 z-40 -translate-x-1/2 transform">
      <div className="corner-brackets">
        <div className="flex flex-col items-center gap-3 bg-void-light/95 px-8 py-6 backdrop-blur-sm">
          {/* Status indicator */}
          <span className="font-mono text-[10px] tracking-[0.3em] text-online-green">
            {REASON_TEXT[reason]}
          </span>

          {/* Player info */}
          <div className="flex flex-col items-center gap-1">
            <span className="logo-glow font-display text-2xl font-black tracking-wider text-neon-red">
              {playerName}
            </span>
            <span className="font-mono text-xs text-text-muted">
              {REASON_MESSAGE[reason]}
            </span>
          </div>

          {/* Waiting animation */}
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              <span className="status-pulse inline-block h-2 w-2 rounded-full bg-neon-cyan" />
              <span
                className="status-pulse inline-block h-2 w-2 rounded-full bg-neon-cyan"
                style={{ animationDelay: '0.2s' }}
              />
              <span
                className="status-pulse inline-block h-2 w-2 rounded-full bg-neon-cyan"
                style={{ animationDelay: '0.4s' }}
              />
            </div>
            <span className="font-mono text-xs tracking-widest text-neon-cyan">
              AWAITING SELECTION
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
