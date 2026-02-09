import type { GameAction, PlayerState } from '~/types/game';
import { ACTION_CONFIG } from '~/types/game';

interface ActionBarProps {
  onAction: (action: GameAction, targetUid?: string) => void;
  localPlayer: PlayerState;
  opponents: Array<{ uid: string; userName: string }>;
  disabled?: boolean;
}

export default function ActionBar({
  onAction,
  localPlayer,
  opponents,
  disabled = false,
}: ActionBarProps) {
  // All available actions
  const actions: GameAction[] = [
    'income',
    'foreign_aid',
    'tax',
    'assassinate',
    'steal',
    'exchange',
    'coup',
  ];

  const handleAction = (action: GameAction) => {
    const metadata = ACTION_CONFIG[action];

    if (metadata.requiresTarget) {
      // For now, target the first opponent
      // TODO: Add target selection UI
      if (opponents.length > 0) {
        onAction(action, opponents[0].uid);
      }
    } else {
      onAction(action);
    }
  };

  const canAfford = (action: GameAction) => {
    return localPlayer.coins >= ACTION_CONFIG[action].cost;
  };

  const mustCoup = localPlayer.coins >= 10;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-surface-light bg-void-light/90 backdrop-blur-sm">
      <div className="flex flex-wrap items-center justify-center gap-2 px-6 py-4">
        {actions.map((action) => {
          const config = ACTION_CONFIG[action];
          const affordable = canAfford(action);
          const isDisabled =
            disabled || !affordable || (mustCoup && action !== 'coup');

          return (
            <button
              key={action}
              onClick={() => handleAction(action)}
              disabled={isDisabled}
              className={`btn-glow border px-4 py-2 text-center font-display text-xs font-semibold tracking-widest transition-all hover:cursor-pointer ${
                isDisabled
                  ? 'border-text-muted/30 text-text-muted/50 cursor-not-allowed'
                  : 'border-neon-red text-neon-red hover:bg-neon-red/10'
              } ${mustCoup && action === 'coup' ? 'border-neon-cyan text-neon-cyan animate-pulse' : ''}`}
              title={config.description}
            >
              {config.displayName}
              {config.cost > 0 && (
                <span className="ml-1 text-[10px]">({config.cost})</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
