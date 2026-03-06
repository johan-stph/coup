interface ActionBarProps {
  onAction: (name: string) => void;
  onBlock?: () => void;
  onAllow?: () => void;
  canBlock?: boolean;
  blockButtonText?: string;
  disabled?: boolean;
}

// TODO: Add remaining Coup actions
export default function ActionBar({
  onAction,
  onBlock,
  onAllow,
  canBlock = false,
  blockButtonText = 'BLOCK',
  disabled = false,
}: ActionBarProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-surface-light bg-void-light/90 backdrop-blur-sm">
      <div className="flex items-center justify-center gap-4 px-6 py-4">
        {canBlock && onBlock && onAllow ? (
          <>
            <button
              onClick={onAllow}
              disabled={disabled}
              className="btn-glow w-full max-w-md border border-neon-magenta py-4 text-center font-display text-sm font-semibold tracking-widest text-neon-magenta transition-all hover:bg-neon-magenta/10 hover:cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ALLOW
            </button>
            <button
              onClick={onBlock}
              disabled={disabled}
              className="btn-glow w-full max-w-md border border-neon-cyan py-4 text-center font-display text-sm font-semibold tracking-widest text-neon-cyan transition-all hover:bg-neon-cyan/10 hover:cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {blockButtonText}
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => onAction('INCOME')}
              disabled={disabled}
              className="btn-glow w-32 border border-neon-red py-3 text-center font-display text-xs font-semibold tracking-widest text-neon-red transition-all hover:bg-neon-red/10 hover:cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              INCOME
            </button>
            <button
              onClick={() => onAction('FOREIGN AID')}
              disabled={disabled}
              className="btn-glow w-32 border border-neon-red py-3 text-center font-display text-xs font-semibold tracking-widest text-neon-red transition-all hover:bg-neon-red/10 hover:cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              FOREIGN AID
            </button>
            <button
              onClick={() => onAction('TAX')}
              disabled={disabled}
              className="btn-glow w-32 border border-neon-red py-3 text-center font-display text-xs font-semibold tracking-widest text-neon-red transition-all hover:bg-neon-red/10 hover:cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              TAX
              <span className="block text-[8px] opacity-70">(DUKE)</span>
            </button>
            <button
              onClick={() => onAction('STEAL')}
              disabled={disabled}
              className="btn-glow w-32 border border-neon-red py-3 text-center font-display text-xs font-semibold tracking-widest text-neon-red transition-all hover:bg-neon-red/10 hover:cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              STEAL
              <span className="block text-[8px] opacity-70">(CAPTAIN)</span>
            </button>
            <button
              onClick={() => onAction('EXCHANGE')}
              disabled={disabled}
              className="btn-glow w-32 border border-neon-red py-3 text-center font-display text-xs font-semibold tracking-widest text-neon-red transition-all hover:bg-neon-red/10 hover:cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              EXCHANGE
              <span className="block text-[8px] opacity-70">(AMBASSADOR)</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
