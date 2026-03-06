import { useState } from 'react';
import type { GamePlayer } from '~/lib/gameMockData';

interface TargetSelectionModalProps {
  players: GamePlayer[];
  currentPlayerUid: string;
  action: 'steal' | 'assassinate' | 'coup';
  onSelect: (targetUid: string) => void;
  onCancel: () => void;
}

const ACTION_INFO: Record<string, { title: string; description: string }> = {
  steal: {
    title: 'STEAL (CAPTAIN)',
    description: 'Select a player to steal 2 coins from',
  },
  assassinate: {
    title: 'ASSASSINATE (ASSASSIN)',
    description: 'Select a player to assassinate',
  },
  coup: {
    title: 'COUP',
    description: 'Select a player to coup',
  },
};

export default function TargetSelectionModal({
  players,
  currentPlayerUid,
  action,
  onSelect,
  onCancel,
}: TargetSelectionModalProps) {
  const [selectedUid, setSelectedUid] = useState<string | null>(null);

  // Filter out current player and eliminated players
  const validTargets = players.filter(
    (p) =>
      p.uid !== currentPlayerUid &&
      p.cards.some((c) => !c.revealed) // Has at least one unrevealed card
  );

  const handleConfirm = () => {
    if (selectedUid) {
      onSelect(selectedUid);
    }
  };

  const info = ACTION_INFO[action];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="corner-brackets">
        <div className="flex w-[600px] flex-col items-center gap-6 bg-void p-8">
          {/* Title */}
          <div className="flex flex-col items-center gap-2">
            <span className="font-mono text-[10px] tracking-[0.3em] text-text-muted">
              TARGET SELECTION
            </span>
            <h2 className="logo-glow font-display text-2xl font-bold tracking-wider text-neon-red">
              {info.title}
            </h2>
            <p className="text-center font-mono text-xs text-text-muted">
              {info.description}
            </p>
          </div>

          {/* Player selection */}
          <div className="grid w-full grid-cols-2 gap-4">
            {validTargets.map((player) => (
              <button
                key={player.uid}
                onClick={() => setSelectedUid(player.uid)}
                className={`corner-brackets transition-all hover:scale-105 ${
                  selectedUid === player.uid ? 'shadow-glow' : ''
                }`}
              >
                <div
                  className={`flex flex-col items-center gap-3 p-4 transition-all ${
                    selectedUid === player.uid
                      ? 'bg-neon-red/20 border-2 border-neon-red'
                      : 'bg-surface-light border-2 border-surface-light'
                  }`}
                >
                  {/* Player avatar */}
                  <div
                    className={`flex h-16 w-16 items-center justify-center rounded-full ${
                      selectedUid === player.uid
                        ? 'bg-neon-red/30'
                        : 'bg-surface'
                    }`}
                  >
                    <svg
                      className={`h-8 w-8 ${
                        selectedUid === player.uid
                          ? 'text-neon-red'
                          : 'text-text-muted'
                      }`}
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
                    </svg>
                  </div>

                  {/* Player name */}
                  <span
                    className={`font-display text-sm font-semibold tracking-wider ${
                      selectedUid === player.uid ? 'text-neon-red' : 'text-white'
                    }`}
                  >
                    {player.userName}
                  </span>

                  {/* Player info */}
                  <div className="flex items-center gap-3 text-xs">
                    <span className="flex items-center gap-1 font-mono text-neon-cyan">
                      <svg
                        className="h-3 w-3"
                        viewBox="0 0 64 64"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="5"
                      >
                        <ellipse cx="32" cy="46" rx="20" ry="7" />
                        <ellipse cx="32" cy="38" rx="20" ry="7" />
                      </svg>
                      {player.coins}
                    </span>
                    <span className="font-mono text-text-muted">
                      {player.cards.filter((c) => !c.revealed).length} cards
                    </span>
                  </div>

                  {/* Selection indicator */}
                  {selectedUid === player.uid && (
                    <span className="font-mono text-[8px] tracking-widest text-neon-red">
                      TARGET SELECTED
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex w-full gap-4">
            <button
              onClick={onCancel}
              className="btn-glow flex-1 border border-text-muted py-3 text-center font-display text-sm font-semibold tracking-widest text-text-muted transition-all hover:bg-text-muted/10"
            >
              CANCEL
            </button>
            <button
              onClick={handleConfirm}
              disabled={!selectedUid}
              className="btn-glow flex-1 border border-neon-red py-3 text-center font-display text-sm font-semibold tracking-widest text-neon-red transition-all hover:bg-neon-red/10 disabled:cursor-not-allowed disabled:opacity-40"
            >
              CONFIRM
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
