import type { GamePlayer } from '~/lib/gameMockData';
import { CARD_IMAGES } from '~/lib/cardImages';

interface PlayerInfoModalProps {
  player: GamePlayer;
  onClose: () => void;
}

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

export default function PlayerInfoModal({ player, onClose }: PlayerInfoModalProps) {
  const activeCards = player.cards.filter((c) => !c.revealed);
  const revealedCards = player.cards.filter((c) => c.revealed);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="corner-brackets"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex w-[480px] flex-col gap-6 bg-void p-8">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-1">
              <span className="font-mono text-[10px] tracking-[0.3em] text-text-muted">
                OPERATIVE PROFILE
              </span>
              <h2 className="font-display text-2xl font-bold tracking-wider text-white">
                {player.userName.toUpperCase()}
              </h2>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="font-mono text-[10px] tracking-[0.3em] text-text-muted">
                TREASURY
              </span>
              <span className="flex items-center gap-1.5 font-mono text-lg font-bold text-neon-cyan">
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 64 64"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="5"
                  strokeLinecap="round"
                >
                  <ellipse cx="32" cy="46" rx="20" ry="7" />
                  <ellipse cx="32" cy="38" rx="20" ry="7" />
                  <ellipse cx="32" cy="30" rx="20" ry="7" />
                  <ellipse cx="32" cy="22" rx="20" ry="7" />
                </svg>
                {player.coins}
              </span>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-surface-light" />

          {/* Influence */}
          <div className="flex flex-col gap-3">
            <span className="font-mono text-[10px] tracking-[0.3em] text-text-muted">
              INFLUENCE — {activeCards.length} ACTIVE
            </span>

            <div className="flex gap-4">
              {player.cards.map((cardData, i) => (
                <div key={i} className="flex flex-col gap-3">
                  {/* Card visual */}
                  <div
                    className={`relative h-32 w-20 overflow-hidden shadow-[0_4px_16px_rgba(0,0,0,0.7)] ${
                      cardData.revealed
                        ? 'border border-neon-red/40'
                        : 'border border-surface-light'
                    }`}
                  >
                    {cardData.revealed && cardData.card && CARD_IMAGES[cardData.card] ? (
                      <>
                        <img
                          src={CARD_IMAGES[cardData.card]}
                          alt={cardData.card}
                          className="absolute inset-0 h-full w-full object-cover grayscale opacity-25"
                        />
                        <div className="absolute inset-0 bg-neon-red/10" />
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 to-transparent px-2 pb-2 pt-6">
                          <span className="block font-mono text-[8px] tracking-widest text-neon-red">
                            {cardData.card.toUpperCase()}
                          </span>
                          <span className="block font-mono text-[7px] tracking-widest text-neon-red/70">
                            ELIMINATED
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface-light">
                        <div
                          className="h-10 w-10 rounded-sm border border-surface opacity-40"
                          style={{
                            backgroundImage:
                              'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px)',
                          }}
                        />
                        <span className="mt-2 font-mono text-[8px] tracking-widest text-text-muted">
                          HIDDEN
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-surface-light" />

          {/* Skills — revealed cards show their abilities (grayed), reference for all */}
          <div className="flex flex-col gap-3">
            <span className="font-mono text-[10px] tracking-[0.3em] text-text-muted">
              KNOWN ABILITIES
            </span>

            {revealedCards.length === 0 && (
              <p className="font-mono text-xs text-text-muted italic">
                No influence has been revealed yet.
              </p>
            )}

            {revealedCards.map((cardData, i) => {
              const skills = cardData.card ? CARD_SKILLS[cardData.card] : [];
              const color = cardData.card ? CARD_COLOR[cardData.card] : 'text-white';
              return (
                <div key={i} className="flex flex-col gap-2 opacity-50">
                  <span className={`font-mono text-[10px] tracking-widest ${color} line-through`}>
                    {cardData.card?.toUpperCase()}
                  </span>
                  {skills.map((skill, j) => (
                    <SkillRow key={j} skill={skill} dimmed />
                  ))}
                </div>
              );
            })}

            {/* Possible skills for hidden cards */}
            {activeCards.length > 0 && (
              <div className="mt-1 rounded border border-surface-light/30 bg-surface/30 px-3 py-2">
                <span className="font-mono text-[9px] tracking-widest text-text-muted">
                  HIDDEN CARD ABILITIES UNKNOWN — SEE CARD REFERENCE
                </span>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="h-px bg-surface-light" />

          {/* Card reference */}
          <div className="flex flex-col gap-3">
            <span className="font-mono text-[10px] tracking-[0.3em] text-text-muted">
              CARD REFERENCE
            </span>
            <div className="grid grid-cols-1 gap-2">
              {Object.entries(CARD_SKILLS).map(([card, skills]) => (
                <div key={card} className="flex flex-col gap-1">
                  <span className={`font-mono text-[10px] font-bold tracking-widest ${CARD_COLOR[card]}`}>
                    {card.toUpperCase()}
                  </span>
                  <div className="flex flex-col gap-1 pl-2">
                    {skills.map((skill, i) => (
                      <SkillRow key={i} skill={skill} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
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

function SkillRow({ skill, dimmed = false }: { skill: CardSkill; dimmed?: boolean }) {
  return (
    <div className={`flex items-start gap-2 ${dimmed ? 'opacity-60' : ''}`}>
      <span
        className={`mt-px shrink-0 rounded-sm px-1 py-px font-mono text-[7px] font-bold tracking-widest ${
          skill.type === 'action'
            ? 'bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/30'
            : 'bg-amber-400/10 text-amber-400 border border-amber-400/30'
        }`}
      >
        {skill.type === 'action' ? 'ACT' : 'BLK'}
      </span>
      <div className="flex flex-col gap-0.5">
        <span className="font-mono text-[9px] font-bold tracking-wider text-white/80">
          {skill.label}
          {skill.cost !== undefined && (
            <span className="ml-1 text-neon-cyan">({skill.cost}¢)</span>
          )}
        </span>
        <span className="font-mono text-[8px] text-text-muted leading-relaxed">
          {skill.description}
        </span>
      </div>
    </div>
  );
}
