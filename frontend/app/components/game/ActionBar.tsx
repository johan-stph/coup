interface ActionBarProps {
  onAction: (name: string) => void;
}

// TODO: Add remaining Coup actions
export default function ActionBar({ onAction }: ActionBarProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-surface-light bg-void-light/90 backdrop-blur-sm">
      <div className="flex items-center justify-center gap-4 px-6 py-4">
        <button
          onClick={() => onAction('INCOME')}
          className="btn-glow w-40 border border-neon-red py-3 text-center font-display text-xs font-semibold tracking-widest text-neon-red transition-all hover:bg-neon-red/10 hover:cursor-pointer"
        >
          INCOME
        </button>
        <button
          onClick={() => onAction('FOREIGN AID')}
          className="btn-glow w-40 border border-neon-red py-3 text-center font-display text-xs font-semibold tracking-widest text-neon-red transition-all hover:bg-neon-red/10 hover:cursor-pointer"
        >
          FOREIGN AID
        </button>
      </div>
    </div>
  );
}
