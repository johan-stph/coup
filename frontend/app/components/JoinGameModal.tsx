import { useState } from "react";
import GameModal from "./GameModal";

interface JoinGameModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (gameCode: string) => void;
  loading?: boolean;
  error?: string | null;
}

export default function JoinGameModal({
  open,
  onClose,
  onConfirm,
  loading = false,
  error = null,
}: JoinGameModalProps) {
  const [gameCode, setGameCode] = useState("");

  return (
    <GameModal
      open={open}
      onClose={onClose}
      onSubmit={() => gameCode.trim() && onConfirm(gameCode.trim())}
      title="JOIN GAME"
      confirmLabel="JOIN"
      loadingLabel="JOINING..."
      loading={loading}
      error={error}
      disabled={!gameCode.trim()}
    >
      <label className="mb-2 block font-mono text-[10px] tracking-[0.3em] text-text-muted">
        GAME CODE
      </label>
      <input
        type="text"
        value={gameCode}
        onChange={(e) => setGameCode(e.target.value.toUpperCase())}
        placeholder="Enter game code..."
        autoFocus
        maxLength={6}
        className="mb-6 w-full border border-neon-red-dim bg-void-light px-4 py-3 font-mono text-sm tracking-[0.3em] text-white placeholder-text-muted outline-none transition-colors focus:border-neon-red"
      />
    </GameModal>
  );
}
