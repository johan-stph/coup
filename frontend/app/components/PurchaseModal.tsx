export default function PurchaseModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-void/80"
      onClick={onClose}
    >
      <div
        className="relative flex flex-col items-center gap-6 border border-surface-light bg-surface p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 font-mono text-lg text-text-muted transition-colors hover:text-white hover:cursor-pointer"
        >
          X
        </button>
        <h2 className="font-display text-lg tracking-widest text-white">
          UNLOCK ASSET
        </h2>
      </div>
    </div>
  );
}
