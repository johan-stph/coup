interface Ranking {
  uid: string;
  userName: string;
  rank: number;
}

interface VictoryScreenProps {
  rankings: Ranking[];
  localPlayerUid: string;
  onReturn: () => void;
}

const RANK_LABELS: Record<number, string> = {
  1: '1ST',
  2: '2ND',
  3: '3RD',
};

const RANK_COLORS: Record<number, string> = {
  1: 'text-neon-cyan',
  2: 'text-white',
  3: 'text-text-muted',
};

const RANK_GLOW: Record<number, string> = {
  1: 'logo-glow border-neon-cyan',
  2: 'border-white/50',
  3: 'border-white/20',
};

export default function VictoryScreen({
  rankings,
  localPlayerUid,
  onReturn,
}: VictoryScreenProps) {
  const winner = rankings.find((r) => r.rank === 1);
  const isLocalWinner = winner?.uid === localPlayerUid;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-void/95 backdrop-blur-sm">
      {/* Title */}
      <div className="mb-8 flex flex-col items-center gap-2">
        <span className="font-mono text-[10px] tracking-[0.4em] text-text-muted">
          OPERATION COMPLETE
        </span>
        {isLocalWinner ? (
          <h1 className="logo-glow font-display text-5xl font-black tracking-wider text-neon-cyan">
            VICTORY
          </h1>
        ) : (
          <h1 className="font-display text-5xl font-black tracking-wider text-neon-red">
            DEFEATED
          </h1>
        )}
        {winner && (
          <p className="mt-1 font-mono text-sm text-white">
            {isLocalWinner ? (
              'You outlasted everyone.'
            ) : (
              <span>
                <span className="text-neon-cyan">{winner.userName}</span> wins
                the round.
              </span>
            )}
          </p>
        )}
      </div>

      {/* Rankings */}
      {rankings.length > 0 && (
        <div className="corner-brackets mb-8">
          <div className="flex flex-col gap-0 bg-void-light/95 px-8 py-4 backdrop-blur-sm">
            <span className="mb-3 text-center font-mono text-[10px] tracking-[0.3em] text-text-muted">
              FINAL STANDINGS
            </span>
            {rankings.map((r) => (
              <div
                key={r.uid}
                className={`flex items-center gap-4 border-b py-3 last:border-b-0 ${RANK_GLOW[r.rank] ?? 'border-white/10'}`}
              >
                <span
                  className={`w-10 font-mono text-xs font-bold ${RANK_COLORS[r.rank] ?? 'text-text-muted'}`}
                >
                  {RANK_LABELS[r.rank] ?? `${r.rank}TH`}
                </span>
                <span
                  className={`font-display text-sm font-semibold tracking-wider ${
                    r.uid === localPlayerUid ? 'text-neon-cyan' : 'text-white'
                  }`}
                >
                  {r.userName}
                  {r.uid === localPlayerUid && (
                    <span className="ml-2 font-mono text-[9px] tracking-widest text-text-muted">
                      YOU
                    </span>
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Return button */}
      <button
        onClick={onReturn}
        className="font-mono text-xs tracking-widest text-text-muted transition-colors hover:text-white hover:cursor-pointer"
      >
        {'< RETURN TO BASE'}
      </button>
    </div>
  );
}
