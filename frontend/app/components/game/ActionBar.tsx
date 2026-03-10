interface ActionBarProps {
  onAction: (name: string) => void;
  onBlock?: () => void;
  onAllow?: () => void;
  canBlock?: boolean;
  blockButtonText?: string;
  disabled?: boolean;
  playerCoins?: number;
  mustCoup?: boolean;
}

export default function ActionBar({
  onAction,
  onBlock,
  onAllow,
  canBlock = false,
  blockButtonText = 'BLOCK',
  disabled = false,
  playerCoins = 0,
  mustCoup = false,
}: ActionBarProps) {
  const canAssassinate = playerCoins >= 3;
  const canCoup = playerCoins >= 7;
  const btnBase =
    'btn-glow border py-2 text-center font-display text-[10px] font-semibold tracking-widest transition-all hover:cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed';
  const redBtn = `${btnBase} border-neon-red text-neon-red hover:bg-neon-red/10`;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-surface-light bg-void-light/90 backdrop-blur-sm">
      <div className="px-3 py-3">
        {canBlock && onBlock && onAllow ? (
          <div className="flex items-center gap-2">
            <button
              onClick={onAllow}
              disabled={disabled}
              className="btn-glow w-full border border-neon-magenta py-4 text-center font-display text-sm font-semibold tracking-widest text-neon-magenta transition-all hover:bg-neon-magenta/10 hover:cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ALLOW
            </button>
            <button
              onClick={onBlock}
              disabled={disabled}
              className="btn-glow w-full border border-neon-cyan py-4 text-center font-display text-sm font-semibold tracking-widest text-neon-cyan transition-all hover:bg-neon-cyan/10 hover:cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {blockButtonText}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-1.5 sm:flex sm:flex-wrap sm:justify-center sm:gap-2">
            <button
              onClick={() => onAction('INCOME')}
              disabled={disabled || mustCoup}
              className={`${redBtn} py-3 sm:w-20 sm:py-2`}
            >
              INCOME
            </button>
            <button
              onClick={() => onAction('FOREIGN AID')}
              disabled={disabled || mustCoup}
              className={`${redBtn} py-3 sm:w-24 sm:py-2`}
            >
              FOREIGN AID
            </button>
            <button
              onClick={() => onAction('TAX')}
              disabled={disabled || mustCoup}
              className={`${redBtn} py-3 sm:w-20 sm:py-2`}
            >
              TAX
              <span className="block text-[7px] opacity-70">(DUKE)</span>
            </button>
            <button
              onClick={() => onAction('STEAL')}
              disabled={disabled || mustCoup}
              className={`${redBtn} py-3 sm:w-20 sm:py-2`}
            >
              STEAL
              <span className="block text-[7px] opacity-70">(CAPTAIN)</span>
            </button>
            <button
              onClick={() => onAction('ASSASSINATE')}
              disabled={disabled || mustCoup || !canAssassinate}
              className={`${redBtn} order-6 py-3 sm:order-5 sm:w-24 sm:py-2`}
            >
              ASSASSINATE
              <span className="block text-[7px] opacity-70">
                (ASSASSIN · 3¢)
              </span>
            </button>
            <button
              onClick={() => onAction('EXCHANGE')}
              disabled={disabled || mustCoup}
              className={`${redBtn} order-7 py-3 sm:order-6 sm:w-22 sm:py-2`}
            >
              EXCHANGE
              <span className="block text-[7px] opacity-70">(AMBASSADOR)</span>
            </button>
            <button
              onClick={() => onAction('COUP')}
              disabled={disabled || !canCoup}
              className={`${btnBase} order-5 col-span-2 py-3 border-neon-magenta text-neon-magenta hover:bg-neon-magenta/10 sm:order-7 sm:col-span-1 sm:w-20 sm:py-2`}
            >
              COUP
              <span className="block text-[7px] opacity-70">(7¢)</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
