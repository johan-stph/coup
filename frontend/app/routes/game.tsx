import { useCallback, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useAuth } from '~/auth/AuthContext';
import PlayerCard from '~/components/game/PlayerCard';
import LocalPlayerArea from '~/components/game/LocalPlayerArea';
import EventLog from '~/components/game/EventLog';
import ActionBar from '~/components/game/ActionBar';
import ActionAnnouncement from '~/components/game/ActionAnnouncement';
import { useGameSSE } from '~/hooks/useGameSSE';
import { authFetch } from '~/lib/authFetch';
import {
  buildMockPlayers,
  getInitialEvents,
  createActionEvent,
} from '~/lib/gameMockData';

interface GameState {
  gameCode: string;
  lobbyName: string;
  players: { uid: string; userName: string }[];
}

const ACTION_TO_ENUM: Record<string, string> = {
  INCOME: 'income',
  'FOREIGN AID': 'foreign_aid',
};

const ENUM_TO_DISPLAY: Record<string, string> = {
  income: 'INCOME',
  foreign_aid: 'FOREIGN AID',
};

export default function Game() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const state = location.state as GameState | null;

  const [players] = useState(() =>
    state ? buildMockPlayers(state.players, user?.uid ?? '') : []
  );
  const [events, setEvents] = useState(() => getInitialEvents());
  const [announcement, setAnnouncement] = useState<{
    playerName: string;
    action: string;
  } | null>(null);

  const onAction = useCallback(
    (event: { uid: string; userName: string; action: string }) => {
      const displayAction = ENUM_TO_DISPLAY[event.action] ?? event.action;
      setAnnouncement({ playerName: event.userName, action: displayAction });
      setEvents((prev) => [
        ...prev,
        createActionEvent(event.userName, displayAction),
      ]);
    },
    []
  );

  useGameSSE({
    gameCode: state?.gameCode ?? '',
    onAction,
  });

  if (!state?.gameCode) {
    return (
      <div className="bg-radial-glow scanlines flex min-h-screen flex-col items-center justify-center text-white">
        <p className="font-mono text-sm text-text-muted">
          No active game session.
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

  const localPlayer = players.find((p) => p.isLocal);
  const opponents = players.filter((p) => !p.isLocal);

  async function handleAction(name: string) {
    const action = ACTION_TO_ENUM[name];
    if (!action) return;

    await authFetch(`/games/action/${state!.gameCode}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
  }

  return (
    <div className="bg-radial-glow scanlines flex min-h-screen flex-col text-white">
      {/* Header bar */}
      <header className="flex items-start justify-between px-6 py-4">
        <button
          onClick={() => navigate('/')}
          className="font-mono text-xs tracking-widest text-text-muted transition-colors hover:text-white hover:cursor-pointer"
        >
          {'< ABORT MISSION'}
        </button>
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2 font-mono text-xs tracking-widest text-neon-red-dim">
            <span className="status-pulse inline-block h-2 w-2 rounded-full bg-neon-red" />
            OP.ACTIVE
          </div>
          <EventLog events={events} />
        </div>
      </header>

      {/* Lobby name subtitle */}
      <div className="flex flex-col items-center gap-1 pb-4">
        <span className="font-mono text-[10px] tracking-[0.3em] text-text-muted">
          OPERATION IN PROGRESS
        </span>
        <h1 className="font-display text-xl font-bold tracking-wider text-white">
          {state.lobbyName.toUpperCase()}
        </h1>
      </div>

      {/* Main area */}
      <main className="flex flex-1 flex-col justify-between pb-24">
        {/* Opponents row */}
        <div className="flex flex-wrap justify-center gap-6 px-4 py-4">
          {opponents.map((opponent) => (
            <PlayerCard key={opponent.uid} player={opponent} />
          ))}
        </div>

        {/* Local player area */}
        {localPlayer && <LocalPlayerArea player={localPlayer} />}
      </main>

      {/* Fixed action bar */}
      <ActionBar onAction={handleAction} />

      {/* Action announcement overlay */}
      {announcement && (
        <ActionAnnouncement
          playerName={announcement.playerName}
          action={announcement.action}
          onDismiss={() => setAnnouncement(null)}
        />
      )}
    </div>
  );
}
