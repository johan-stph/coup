import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useAuth } from '~/auth/AuthContext';
import PlayerCard from '~/components/game/PlayerCard';
import LocalPlayerArea from '~/components/game/LocalPlayerArea';
import EventLog from '~/components/game/EventLog';
import ActionBar from '~/components/game/ActionBar';
import ActionAnnouncement from '~/components/game/ActionAnnouncement';
import ActionResponsePanel from '~/components/game/ActionResponsePanel';
import InfluenceLossPanel from '~/components/game/InfluenceLossPanel';
import { useGameSSE } from '~/hooks/useGameSSE';
import {
  performGameAction,
  challengeAction,
  blockAction,
  passResponse,
  loseInfluence,
  getGameState,
} from '~/lib/gameActions';
import type { GameState, GameAction, Role, BlockAction } from '~/types/game';

interface LocationState {
  gameCode: string;
  lobbyName: string;
  players: { uid: string; userName: string }[];
}

export default function Game() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const state = location.state as LocationState | null;

  const [gameState, setGameState] = useState<GameState | null>(null);
  const [announcement, setAnnouncement] = useState<{
    playerName: string;
    action: string;
  } | null>(null);

  const onGameStateUpdate = useCallback((newState: GameState) => {
    setGameState(newState);
  }, []);

  // Convert action history to event format for the EventLog component
  const events = (gameState?.actionHistory || []).map((action) => ({
    id: action.timestamp.toString(),
    timestamp: new Date(action.timestamp).toLocaleTimeString(),
    message: action.description,
  }));

  // Fetch initial game state
  useEffect(() => {
    if (state?.gameCode) {
      getGameState(state.gameCode)
        .then((data) => setGameState(data))
        .catch((err) => console.error('Failed to load game state:', err));
    }
  }, [state?.gameCode]);

  useGameSSE({
    gameCode: state?.gameCode ?? '',
    onGameStateUpdate,
  });

  if (!state?.gameCode || !gameState) {
    return (
      <div className="bg-radial-glow scanlines flex min-h-screen flex-col items-center justify-center text-white">
        <p className="font-mono text-sm text-text-muted">
          {!state?.gameCode ? 'No active game session.' : 'Loading game...'}
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

  const localPlayerState = gameState.playerStates?.find(
    (p) => p.uid === user?.uid
  );
  const opponentStates =
    gameState.playerStates?.filter((p) => p.uid !== user?.uid) || [];

  const getPlayerName = (uid: string) => {
    return gameState.players.find((p) => p.uid === uid)?.userName || 'Unknown';
  };

  const isMyTurn = gameState.currentTurnUid === user?.uid;
  const isActionPhase = gameState.turnPhase === 'action';

  const hasResponded =
    gameState.pendingAction?.respondedPlayers.includes(user?.uid || '') ||
    false ||
    gameState.pendingBlock?.respondedPlayers.includes(user?.uid || '') ||
    false;

  async function handleAction(action: GameAction, targetUid?: string) {
    if (!state?.gameCode) return;
    try {
      await performGameAction(state.gameCode, action, targetUid);
    } catch (error) {
      console.error('Failed to perform action:', error);
    }
  }

  async function handleChallenge() {
    if (!state?.gameCode) return;
    try {
      await challengeAction(state.gameCode);
    } catch (error) {
      console.error('Failed to challenge:', error);
    }
  }

  async function handleBlock(role: Role) {
    if (!state?.gameCode || !gameState.pendingAction) return;

    // Determine block action type based on pending action
    let blockActionType: BlockAction;
    if (gameState.pendingAction.type === 'foreign_aid') {
      blockActionType = 'block_foreign_aid';
    } else if (gameState.pendingAction.type === 'steal') {
      blockActionType = 'block_steal';
    } else if (gameState.pendingAction.type === 'assassinate') {
      blockActionType = 'block_assassinate';
    } else {
      return;
    }

    try {
      await blockAction(state.gameCode, blockActionType, role);
    } catch (error) {
      console.error('Failed to block:', error);
    }
  }

  async function handlePass() {
    if (!state?.gameCode) return;
    try {
      await passResponse(state.gameCode);
    } catch (error) {
      console.error('Failed to pass:', error);
    }
  }

  async function handleLoseInfluence(role: Role) {
    if (!state?.gameCode) return;
    try {
      await loseInfluence(state.gameCode, role);
    } catch (error) {
      console.error('Failed to lose influence:', error);
    }
  }

  if (!localPlayerState) {
    return (
      <div className="bg-radial-glow scanlines flex min-h-screen flex-col items-center justify-center text-white">
        <p className="font-mono text-sm text-text-muted">
          Loading player data...
        </p>
      </div>
    );
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
            {gameState.status === 'in_progress' ? 'OP.ACTIVE' : 'OP.COMPLETE'}
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
          {opponentStates.map((opponentState) => {
            const player = gameState.players.find(
              (p) => p.uid === opponentState.uid
            );
            return player ? (
              <PlayerCard
                key={opponentState.uid}
                player={opponentState}
                userName={player.userName}
                isCurrentTurn={gameState.currentTurnUid === opponentState.uid}
              />
            ) : null;
          })}
        </div>

        {/* Local player area */}
        <LocalPlayerArea
          player={localPlayerState}
          userName={user?.displayName || 'You'}
          isYourTurn={isMyTurn}
        />
      </main>

      {/* Fixed action bar */}
      {isMyTurn && isActionPhase && (
        <ActionBar
          onAction={handleAction}
          localPlayer={localPlayerState}
          opponents={gameState.players.filter((p) => p.uid !== user?.uid)}
        />
      )}

      {/* Action response panel (challenge/block/pass) */}
      <ActionResponsePanel
        pendingAction={gameState.pendingAction}
        pendingBlock={gameState.pendingBlock}
        turnPhase={gameState.turnPhase}
        currentPlayerUid={user?.uid || ''}
        getPlayerName={getPlayerName}
        onChallenge={handleChallenge}
        onBlock={handleBlock}
        onPass={handlePass}
        hasResponded={hasResponded}
      />

      {/* Influence loss panel (resolve phase) */}
      {gameState.turnPhase === 'resolve' &&
        gameState.pendingInfluenceLoss &&
        localPlayerState.influences && (
          <InfluenceLossPanel
            pendingInfluenceLoss={gameState.pendingInfluenceLoss}
            currentPlayerUid={user?.uid || ''}
            influences={localPlayerState.influences}
            onLoseInfluence={handleLoseInfluence}
          />
        )}

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
