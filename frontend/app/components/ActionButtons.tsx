interface ActionButtonsProps {
  onCreateGame: () => void;
}

export default function ActionButtons({ onCreateGame }: ActionButtonsProps) {
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-6">
      <button
        onClick={onCreateGame}
        className="btn-glow w-52 border border-neon-red py-3 text-center font-display text-sm font-semibold tracking-widest text-neon-red transition-all hover:bg-neon-red/10 hover:cursor-pointer"
      >
        CREATE GAME
      </button>
      <button className="btn-glow w-52 border border-neon-red py-3 text-center font-display text-sm font-semibold tracking-widest text-neon-red transition-all hover:bg-neon-red/10 hover:cursor-pointer">
        JOIN GAME
      </button>
    </div>
  );
}
