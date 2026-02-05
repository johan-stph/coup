import { useState } from "react";

interface CreateGameModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (lobbyName: string) => void;
  loading?: boolean;
  error?: string | null;
}

export default function CreateGameModal({
  open,
  onClose,
  onConfirm,
  loading = false,
  error = null,
}: CreateGameModalProps) {
  const [lobbyName, setLobbyName] = useState("");

  if (!open) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (lobbyName.trim()) {
      onConfirm(lobbyName.trim());
    }
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="corner-brackets corner-brackets-bottom w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-surface p-8">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <h2 className="font-display text-lg font-bold tracking-widest text-neon-red">
              CREATE GAME
            </h2>
            <button
              onClick={onClose}
              className="font-mono text-xs text-text-muted transition-colors hover:text-white hover:cursor-pointer"
            >
              [ESC]
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <label className="mb-2 block font-mono text-[10px] tracking-[0.3em] text-text-muted">
              LOBBY NAME
            </label>
            <input
              type="text"
              value={lobbyName}
              onChange={(e) => setLobbyName(e.target.value)}
              placeholder="Enter lobby name..."
              autoFocus
              maxLength={32}
              className="mb-6 w-full border border-neon-red-dim bg-void-light px-4 py-3 font-mono text-sm text-white placeholder-text-muted outline-none transition-colors focus:border-neon-red"
            />

            {error && (
              <p className="mb-4 font-mono text-xs text-neon-red">{error}</p>
            )}

            {/* Actions */}
            <div className="flex gap-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 border border-surface-light py-3 text-center font-display text-xs font-semibold tracking-widest text-text-muted transition-all hover:border-white hover:text-white hover:cursor-pointer"
              >
                CANCEL
              </button>
              <button
                type="submit"
                disabled={!lobbyName.trim() || loading}
                className="btn-glow flex-1 border border-neon-red py-3 text-center font-display text-xs font-semibold tracking-widest text-neon-red transition-all hover:bg-neon-red/10 disabled:opacity-30 disabled:cursor-not-allowed hover:cursor-pointer"
              >
                {loading ? "INITIALIZING..." : "CONFIRM"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
