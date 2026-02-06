import { useLocation, useNavigate } from 'react-router';
import { useAuth } from '~/auth/AuthContext';
import { authFetch } from '~/lib/authFetch';
import { useLobbySSE } from '~/hooks/useLobbySSE';

interface GamePlayer {
  uid: string;
  userName: string;
}

interface LobbyState {
  gameCode: string;
  lobbyName: string;
  players: GamePlayer[];
  createdBy: string;
}

export default function Lobby() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const state = location.state as LobbyState | null;

  if (!state?.gameCode) {
    return (
      <div className="bg-radial-glow scanlines flex min-h-screen flex-col items-center justify-center text-white">
        <p className="font-mono text-sm text-text-muted">
          No active lobby session.
        </p>
        <button
          onClick={() => navigate('/')}
          className="mt-4 font-mono text-xs text-neon-red transition-colors hover:text-white hover:cursor-pointer"
        >
          {'< RETURN TO BASE'}
        </button>
      </div>
    );
  }

  const { players, connected, gameStarted, disconnect } = useLobbySSE({
    gameCode: state.gameCode,
    initialPlayers: state.players ?? [],
  });

  async function handleStartGame() {
    try {
      const res = await authFetch(`/games/start/${state!.gameCode}`, {
        method: 'POST',
      });
      if (!res.ok) {
        const data = await res.json();
        console.error('Failed to start game:', data.error);
      }
    } catch (err) {
      console.error('Failed to start game:', err);
    }
  }

  async function handleLeaveLobby() {
    disconnect();
    try {
      await authFetch(`/games/leave/${state!.gameCode}`, { method: 'POST' });
    } catch {
      // Best-effort — navigate home regardless
    }
    navigate('/');
  }

  return (
    <div className="bg-radial-glow scanlines flex min-h-screen flex-col text-white">
      {/* Top bar */}
      <header className="flex items-center justify-between px-6 py-4">
        <button
          onClick={handleLeaveLobby}
          className="font-mono text-xs tracking-widest text-text-muted transition-colors hover:text-white hover:cursor-pointer"
        >
          {'< EXIT LOBBY'}
        </button>
        {connected ? (
          <div className="flex items-center gap-2 font-mono text-xs tracking-widest text-neon-red-dim">
            <span className="status-pulse inline-block h-2 w-2 rounded-full bg-neon-red" />
            LOBBY.ACTIVE
          </div>
        ) : (
          <div className="flex items-center gap-2 font-mono text-xs tracking-widest text-red-400">
            <span className="inline-block h-2 w-2 rounded-full bg-red-400" />
            RECONNECTING...
          </div>
        )}
      </header>

      {/* Main lobby content */}
      <main className="flex flex-1 flex-col items-center justify-center gap-10 px-4 pb-16">
        {/* Lobby name */}
        <div className="flex flex-col items-center gap-2">
          <span className="font-mono text-[10px] tracking-[0.3em] text-text-muted">
            LOBBY
          </span>
          <h1 className="font-display text-3xl font-bold tracking-wider text-white sm:text-4xl">
            {state.lobbyName.toUpperCase()}
          </h1>
        </div>

        {/* Game code display */}
        <div className="corner-brackets corner-brackets-bottom">
          <div className="flex flex-col items-center gap-3 bg-surface px-12 py-8">
            <span className="font-mono text-[10px] tracking-[0.3em] text-text-muted">
              GAME CODE
            </span>
            <span className="logo-glow font-display text-5xl font-black tracking-[0.4em] text-neon-red sm:text-6xl">
              {state.gameCode}
            </span>
            <span className="font-mono text-[10px] text-text-muted">
              Share this code with other operatives
            </span>
          </div>
        </div>

        {/* Players section */}
        <div className="flex flex-col items-center gap-4">
          <span className="font-mono text-[10px] tracking-[0.3em] text-text-muted">
            OPERATIVES IN LOBBY ({players.length})
          </span>
          <div className="flex flex-col items-center gap-2">
            {players.map((player) => (
              <div key={player.uid} className="flex items-center gap-2">
                <span className="inline-block h-2 w-2 rounded-full bg-online-green" />
                <span className="font-mono text-sm text-white">
                  {player.userName}
                  {state.createdBy === player.uid && (
                    <span className="ml-2 text-neon-red">(Admin)</span>
                  )}
                  {user?.uid === player.uid && (
                    <span className="ml-1 text-text-muted">(You)</span>
                  )}
                </span>
              </div>
            ))}
          </div>
          {players.length < 2 && (
            <p className="font-mono text-[10px] text-text-muted status-pulse">
              Waiting for operatives to join...
            </p>
          )}
        </div>

        {user?.uid === state.createdBy && !gameStarted && (
          <button
            onClick={handleStartGame}
            className="corner-brackets bg-neon-red/10 px-10 py-3 font-mono text-sm tracking-widest text-neon-red transition-colors hover:bg-neon-red/20 hover:cursor-pointer"
          >
            START OPERATION
          </button>
        )}
      </main>
    </div>
  );
}
