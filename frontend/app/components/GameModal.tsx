import { type ReactNode } from "react";

interface GameModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: () => void;
  title: string;
  confirmLabel?: string;
  loadingLabel?: string;
  loading?: boolean;
  error?: string | null;
  disabled?: boolean;
  children: ReactNode;
}

export default function GameModal({
  open,
  onClose,
  onSubmit,
  title,
  confirmLabel = "CONFIRM",
  loadingLabel = "LOADING...",
  loading = false,
  error = null,
  disabled = false,
  children,
}: GameModalProps) {
  if (!open) return null;

  function handleSubmit(e: { preventDefault: () => void }) {
    e.preventDefault();
    onSubmit();
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={loading ? undefined : onClose}
    >
      <div
        className="corner-brackets corner-brackets-bottom w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-surface p-8">
          <div className="mb-8 flex items-center justify-between">
            <h2 className="font-display text-lg font-bold tracking-widest text-neon-red">
              {title}
            </h2>
            <button
              onClick={onClose}
              disabled={loading}
              className="font-mono text-xs text-text-muted transition-colors hover:text-white hover:cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              [ESC]
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            {children}

            {error && (
              <p className="mb-4 font-mono text-xs text-neon-red">{error}</p>
            )}

            <div className="flex gap-4">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="flex-1 border border-surface-light py-3 text-center font-display text-xs font-semibold tracking-widest text-text-muted transition-all hover:border-white hover:text-white hover:cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                CANCEL
              </button>
              <button
                type="submit"
                disabled={disabled || loading}
                className="btn-glow flex-1 border border-neon-red py-3 text-center font-display text-xs font-semibold tracking-widest text-neon-red transition-all hover:bg-neon-red/10 disabled:opacity-30 disabled:cursor-not-allowed hover:cursor-pointer"
              >
                {loading ? loadingLabel : confirmLabel}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
