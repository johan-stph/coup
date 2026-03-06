interface BlockCardSelectionModalProps {
  actionType: string;
  blockingCards: string[];
  onSelect: (card: string) => void;
  onCancel: () => void;
}

const ACTION_INFO: Record<string, { title: string; description: string }> = {
  steal: {
    title: 'BLOCK STEAL',
    description: 'Choose which influence to claim for blocking',
  },
  assassinate: {
    title: 'BLOCK ASSASSINATION',
    description: 'Claim Contessa to block',
  },
  foreign_aid: {
    title: 'BLOCK FOREIGN AID',
    description: 'Claim Duke to block',
  },
};

const CARD_DISPLAY: Record<string, string> = {
  captain: 'CAPTAIN',
  ambassador: 'AMBASSADOR',
  contessa: 'CONTESSA',
  duke: 'DUKE',
};

export default function BlockCardSelectionModal({
  actionType,
  blockingCards,
  onSelect,
  onCancel,
}: BlockCardSelectionModalProps) {
  const info = ACTION_INFO[actionType] || {
    title: 'BLOCK ACTION',
    description: 'Choose which card to claim',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="corner-brackets">
        <div className="flex w-[500px] flex-col items-center gap-6 bg-void p-8">
          {/* Title */}
          <div className="flex flex-col items-center gap-2">
            <span className="font-mono text-[10px] tracking-[0.3em] text-text-muted">
              BLOCKING ACTION
            </span>
            <h2 className="logo-glow font-display text-2xl font-bold tracking-wider text-neon-cyan">
              {info.title}
            </h2>
            <p className="text-center font-mono text-xs text-text-muted">
              {info.description}
            </p>
          </div>

          {/* Card selection */}
          <div className="flex gap-4">
            {blockingCards.map((card) => (
              <button
                key={card}
                onClick={() => onSelect(card)}
                className="corner-brackets transition-all hover:scale-105"
              >
                <div className="flex h-40 w-32 flex-col items-center justify-center gap-3 bg-surface-light p-4 transition-all hover:bg-neon-cyan/20 hover:border-2 hover:border-neon-cyan">
                  {/* Card icon */}
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface">
                    <svg
                      className="h-8 w-8 text-neon-cyan"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
                      />
                    </svg>
                  </div>

                  {/* Card name */}
                  <span className="font-display text-sm font-semibold tracking-wider text-neon-cyan">
                    {CARD_DISPLAY[card]}
                  </span>
                </div>
              </button>
            ))}
          </div>

          {/* Cancel button */}
          <button
            onClick={onCancel}
            className="btn-glow w-full border border-text-muted py-3 text-center font-display text-sm font-semibold tracking-widest text-text-muted transition-all hover:bg-text-muted/10"
          >
            CANCEL
          </button>
        </div>
      </div>
    </div>
  );
}
