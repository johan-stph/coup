import { CARD_IMAGES } from '~/lib/cardImages';

interface CardSkill {
  label: string;
  type: 'action' | 'block';
  description: string;
  cost?: number;
}

const CARD_SKILLS: Record<string, CardSkill[]> = {
  duke: [
    {
      label: 'TAX',
      type: 'action',
      description: 'Take 3 coins from the treasury.',
    },
    {
      label: 'BLOCK FOREIGN AID',
      type: 'block',
      description: 'Block any player from collecting foreign aid.',
    },
  ],
  assassin: [
    {
      label: 'ASSASSINATE',
      type: 'action',
      cost: 3,
      description: 'Pay 3 coins to force a player to lose an influence.',
    },
  ],
  ambassador: [
    {
      label: 'EXCHANGE',
      type: 'action',
      description: 'Draw 2 cards from the court deck, then return 2.',
    },
    {
      label: 'BLOCK STEAL',
      type: 'block',
      description: 'Block a Captain from stealing your coins.',
    },
  ],
  captain: [
    {
      label: 'STEAL',
      type: 'action',
      description: 'Take 2 coins from another player.',
    },
    {
      label: 'BLOCK STEAL',
      type: 'block',
      description: 'Block a Captain from stealing your coins.',
    },
  ],
  contessa: [
    {
      label: 'BLOCK ASSASSINATION',
      type: 'block',
      description: 'Block an Assassin from eliminating your influence.',
    },
  ],
};

const CARD_COLOR: Record<string, string> = {
  duke: 'text-purple-400',
  assassin: 'text-neon-red',
  ambassador: 'text-emerald-400',
  captain: 'text-neon-cyan',
  contessa: 'text-amber-400',
};

const CARD_BORDER_COLOR: Record<string, string> = {
  duke: 'border-purple-400/40',
  assassin: 'border-neon-red/40',
  ambassador: 'border-emerald-400/40',
  captain: 'border-neon-cyan/40',
  contessa: 'border-amber-400/40',
};

interface CardInfoModalProps {
  card: string;
  onClose: () => void;
}

export default function CardInfoModal({ card, onClose }: CardInfoModalProps) {
  const skills = CARD_SKILLS[card] ?? [];
  const color = CARD_COLOR[card] ?? 'text-white';
  const borderColor = CARD_BORDER_COLOR[card] ?? 'border-surface-light';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="corner-brackets" onClick={(e) => e.stopPropagation()}>
        <div className="flex w-[400px] flex-col items-center gap-6 bg-void p-8">
          {/* Header */}
          <div className="flex flex-col items-center gap-1">
            <span className="font-mono text-[10px] tracking-[0.3em] text-text-muted">
              INFLUENCE CARD
            </span>
            <h2 className={`font-display text-2xl font-bold tracking-wider ${color}`}>
              {card.toUpperCase()}
            </h2>
          </div>

          {/* Card image */}
          <div className={`corner-brackets`}>
            <div
              className={`relative h-52 w-32 overflow-hidden border-2 ${borderColor} shadow-[0_12px_40px_rgba(0,0,0,0.8)]`}
            >
              {CARD_IMAGES[card] ? (
                <img
                  src={CARD_IMAGES[card]}
                  alt={card}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 bg-surface-light" />
              )}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent px-2 pb-2 pt-6">
                <span className={`block font-mono text-[8px] tracking-widest ${color}`}>
                  {card.toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px w-full bg-surface-light" />

          {/* Skills */}
          <div className="flex w-full flex-col gap-3">
            <span className="font-mono text-[10px] tracking-[0.3em] text-text-muted">
              ABILITIES
            </span>
            {skills.map((skill, i) => (
              <div key={i} className="flex items-start gap-3">
                <span
                  className={`mt-0.5 shrink-0 rounded-sm px-1.5 py-0.5 font-mono text-[8px] font-bold tracking-widest ${
                    skill.type === 'action'
                      ? 'border border-neon-cyan/30 bg-neon-cyan/10 text-neon-cyan'
                      : 'border border-amber-400/30 bg-amber-400/10 text-amber-400'
                  }`}
                >
                  {skill.type === 'action' ? 'ACTION' : 'BLOCK'}
                </span>
                <div className="flex flex-col gap-0.5">
                  <span className="font-mono text-xs font-bold tracking-wider text-white">
                    {skill.label}
                    {skill.cost !== undefined && (
                      <span className="ml-1.5 text-neon-cyan">— {skill.cost} coins</span>
                    )}
                  </span>
                  <span className="font-mono text-[10px] leading-relaxed text-text-muted">
                    {skill.description}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Close */}
          <button
            onClick={onClose}
            className="mt-2 w-full border border-surface-light py-2.5 font-display text-sm font-semibold tracking-widest text-text-muted transition-all hover:border-white/40 hover:text-white cursor-pointer"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
}
