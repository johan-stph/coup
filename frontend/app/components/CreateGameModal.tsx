import { useState } from 'react';
import GameModal from './GameModal';

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
  const [lobbyName, setLobbyName] = useState('');

  return (
    <GameModal
      open={open}
      onClose={onClose}
      onSubmit={() => lobbyName.trim() && onConfirm(lobbyName.trim())}
      title="CREATE GAME"
      confirmLabel="CONFIRM"
      loadingLabel="INITIALIZING..."
      loading={loading}
      error={error}
      disabled={!lobbyName.trim()}
    >
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
    </GameModal>
  );
}
