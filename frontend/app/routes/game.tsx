import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';
import { useAuth } from '~/auth/AuthContext';
import PlayerCard from '~/components/game/PlayerCard';
import LocalPlayerArea from '~/components/game/LocalPlayerArea';
import EventLog from '~/components/game/EventLog';
import ActionBar from '~/components/game/ActionBar';
import PendingActionDisplay from '~/components/game/PendingActionDisplay';
import RevealCardModal from '~/components/game/RevealCardModal';
import CardRevealNotification from '~/components/game/CardRevealNotification';
import ExchangeModal from '~/components/game/ExchangeModal';
import TargetSelectionModal from '~/components/game/TargetSelectionModal';
import BlockCardSelectionModal from '~/components/game/BlockCardSelectionModal';
import VictoryScreen from '~/components/game/VictoryScreen';
import DeckTracker from '~/components/game/DeckTracker';
import { useGameSSE } from '~/hooks/useGameSSE';
import { authFetch } from '~/lib/authFetch';
import {
  type GamePlayer,
  getInitialEvents,
  createActionEvent,
} from '~/lib/gameMockData';

interface GameState {
  gameCode: string;
  lobbyName: string;
  players: { uid: string; userName: string }[];
}

interface PendingAction {
  actionType: string;
  actorUid: string;
  targetUid?: string;
  claimedCard?: string;
  canBeBlocked: boolean;
  canBeChallenged: boolean;
  blockingPlayerUid?: string;
  blockClaimedCard?: string;
  phase: string;
}

interface WaitingForCardReveal {
  playerUid: string;
  reason: 'challenge_lost' | 'couped' | 'assassinated';
}

interface WaitingForExchange {
  playerUid: string;
  drawnCards: string[];
}

interface Ranking {
  uid: string;
  userName: string;
  rank: number;
}

const ACTION_TO_ENUM: Record<string, string> = {
  INCOME: 'income',
  'FOREIGN AID': 'foreign_aid',
  TAX: 'tax',
  STEAL: 'steal',
  ASSASSINATE: 'assassinate',
  EXCHANGE: 'exchange',
  COUP: 'coup',
};

const ENUM_TO_DISPLAY: Record<string, string> = {
  income: 'INCOME',
  foreign_aid: 'FOREIGN AID',
  tax: 'TAX',
  steal: 'STEAL',
  assassinate: 'ASSASSINATE',
  exchange: 'EXCHANGE',
  coup: 'COUP',
};

export default function Game() {
  const location = useLocation();
  const navigate = useNavigate();
  const { gameId } = useParams<{ gameId: string }>();
  const { user } = useAuth();
  const state = location.state as GameState | null;

  const [players, setPlayers] = useState<GamePlayer[]>([]);
  const [events, setEvents] = useState(() => getInitialEvents());
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(
    null
  );
  const [actionResolvesAt, setActionResolvesAt] = useState<string | null>(null);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState<number>(0);
  const [waitingForCardReveal, setWaitingForCardReveal] =
    useState<WaitingForCardReveal | null>(null);
  const [waitingForExchange, setWaitingForExchange] =
    useState<WaitingForExchange | null>(null);
  const [targetSelectionAction, setTargetSelectionAction] = useState<
    'steal' | 'assassinate' | 'coup' | null
  >(null);
  const [showBlockCardSelection, setShowBlockCardSelection] = useState(false);
  const [gameStatus, setGameStatus] = useState<string>('in_progress');
  const [rankings, setRankings] = useState<Ranking[]>([]);

  // Fetch game state
  const fetchGameState = useCallback(async () => {
    if (!gameId) return;

    try {
      const response = await authFetch(`/games/${gameId}/state`);

      if (!response.ok) {
        console.error('Failed to fetch game state:', response.statusText);
        return;
      }

      const data = await response.json();

      if (data.players) {
        const gamePlayers: GamePlayer[] = data.players.map((p: any) => ({
          uid: p.uid,
          userName: p.userName,
          coins: p.coins,
          cards: p.cards,
          isLocal: p.uid === user?.uid,
        }));

        setPlayers(gamePlayers);
        setPendingAction(data.pendingAction || null);
        setActionResolvesAt(data.actionResolvesAt || null);
        setCurrentPlayerIndex(data.currentPlayerIndex ?? 0);
        setWaitingForCardReveal(data.waitingForCardReveal || null);
        setWaitingForExchange(data.waitingForExchange || null);
        setGameStatus(data.gameStatus ?? 'in_progress');
        setRankings(data.rankings ?? []);
      }
    } catch (error) {
      console.error('Failed to fetch game state:', error);
    }
  }, [gameId, user?.uid]);

  // Regular polling every 2 seconds
  useEffect(() => {
    fetchGameState();
    const interval = setInterval(fetchGameState, 2000);
    return () => clearInterval(interval);
  }, [fetchGameState]);

  // Immediately re-fetch when the challenge timer expires so the UI updates without waiting for the next poll
  useEffect(() => {
    if (!actionResolvesAt) return;
    const delay = new Date(actionResolvesAt).getTime() - Date.now();
    if (delay <= 0) {
      fetchGameState();
      return;
    }
    const timeout = setTimeout(fetchGameState, delay + 300);
    return () => clearTimeout(timeout);
  }, [actionResolvesAt, fetchGameState]);

  const onAction = useCallback(
    (event: { uid: string; userName: string; action: string }) => {
      const displayAction = ENUM_TO_DISPLAY[event.action] ?? event.action;
      setEvents((prev) => [
        ...prev,
        createActionEvent(event.userName, displayAction),
      ]);
    },
    [user?.uid]
  );

  useGameSSE({
    gameCode: gameId ?? '',
    onAction,
  });

  if (!gameId) {
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
  const localPlayerIndex = players.findIndex((p) => p.isLocal);
  const isMyTurn = localPlayerIndex === currentPlayerIndex;
  const isLocalEliminated = localPlayer
    ? localPlayer.cards.length > 0 && localPlayer.cards.every((c) => c.revealed)
    : false;

  // Get actor and blocker names for pending action
  const actorPlayer = pendingAction
    ? players.find((p) => p.uid === pendingAction.actorUid)
    : null;
  const targetPlayer = pendingAction?.targetUid
    ? players.find((p) => p.uid === pendingAction.targetUid)
    : null;
  const blockerPlayer = pendingAction?.blockingPlayerUid
    ? players.find((p) => p.uid === pendingAction.blockingPlayerUid)
    : null;
  const revealingPlayer = waitingForCardReveal
    ? players.find((p) => p.uid === waitingForCardReveal.playerUid)
    : null;
  const isActorOfPendingAction = pendingAction?.actorUid === user?.uid;
  const isBlockerOfPendingAction =
    pendingAction?.blockingPlayerUid === user?.uid;
  const isTargetOfPendingAction = pendingAction?.targetUid === user?.uid;

  // Check if user can block current action
  const canBlockForeignAid =
    pendingAction?.canBeBlocked &&
    pendingAction?.actionType === 'foreign_aid' &&
    pendingAction?.actorUid !== user?.uid &&
    pendingAction?.phase === 'awaiting_block';

  const canBlockSteal =
    pendingAction?.canBeBlocked &&
    pendingAction?.actionType === 'steal' &&
    pendingAction?.targetUid === user?.uid &&
    pendingAction?.phase === 'awaiting_block';

  const canBlockAssassinate =
    pendingAction?.canBeBlocked &&
    pendingAction?.actionType === 'assassinate' &&
    pendingAction?.targetUid === user?.uid &&
    pendingAction?.phase === 'awaiting_block';

  const canBlock = canBlockForeignAid || canBlockSteal || canBlockAssassinate;

  // Determine block button text
  let blockButtonText = 'BLOCK';
  if (canBlockForeignAid) blockButtonText = 'BLOCK WITH DUKE';
  if (canBlockSteal) blockButtonText = 'BLOCK STEAL';
  if (canBlockAssassinate) blockButtonText = 'BLOCK WITH CONTESSA';

  async function handleAction(name: string) {
    const action = ACTION_TO_ENUM[name];
    if (!action) return;

    // Actions that require target selection
    if (action === 'steal' || action === 'assassinate' || action === 'coup') {
      setTargetSelectionAction(action as 'steal' | 'assassinate' | 'coup');
      return;
    }

    await authFetch(`/games/action/${gameId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
  }

  async function handleTargetSelect(targetUid: string) {
    if (!targetSelectionAction) return;

    await authFetch(`/games/action/${gameId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: targetSelectionAction, targetUid }),
    });

    setTargetSelectionAction(null);
  }

  async function handleBlock() {
    if (!pendingAction) return;

    // For steal, allow choosing between captain and ambassador
    if (pendingAction.actionType === 'steal') {
      setShowBlockCardSelection(true);
      return;
    }

    // For other actions, use the default blocking card
    let blockingCard: string;
    if (pendingAction.actionType === 'foreign_aid') {
      blockingCard = 'duke';
    } else if (pendingAction.actionType === 'assassinate') {
      blockingCard = 'contessa';
    } else {
      return;
    }

    await authFetch(`/games/block/${gameId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blockingCard }),
    });
  }

  async function handleBlockCardSelect(card: string) {
    await authFetch(`/games/block/${gameId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blockingCard: card }),
    });
    setShowBlockCardSelection(false);
  }

  async function handleAllow() {
    await authFetch(`/games/allow/${gameId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
  }

  async function handleChallenge() {
    await authFetch(`/games/challenge/${gameId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isBlockChallenge: false }),
    });
  }

  async function handleChallengeBlock() {
    await authFetch(`/games/challenge/${gameId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isBlockChallenge: true }),
    });
  }

  async function handleRevealCard(cardIndex: number) {
    await authFetch(`/games/reveal-card/${gameId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cardIndex }),
    });
  }

  async function handleExchangeCards(chosenCardIndices: number[]) {
    await authFetch(`/games/exchange-cards/${gameId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chosenCardIndices }),
    });
  }

  return (
    <div className="bg-radial-glow scanlines flex min-h-screen flex-col text-white">
      {/* Deck tracker */}
      <DeckTracker players={players} />

      {/* Victory / game-over overlay */}
      {gameStatus === 'finished' && (
        <VictoryScreen
          rankings={rankings}
          localPlayerUid={user?.uid ?? ''}
          onReturn={() => navigate('/')}
        />
      )}

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
          {state?.lobbyName?.toUpperCase() || 'COUP'}
        </h1>
      </div>

      {/* Main area */}
      <main className="flex flex-1 flex-col justify-between pb-40 sm:pb-24">
        {/* Opponents row */}
        <div className="flex flex-wrap justify-center gap-6 px-4 py-4">
          {opponents.map((opponent) => (
            <PlayerCard key={opponent.uid} player={opponent} />
          ))}
        </div>

        {/* Local player area */}
        {localPlayer && (
          <LocalPlayerArea player={localPlayer} isMyTurn={isMyTurn} />
        )}
      </main>

      {/* Fixed action bar or spectator indicator */}
      {isLocalEliminated ? (
        <div className="fixed bottom-0 left-0 right-0 flex justify-center bg-void/80 pb-8 pt-4 backdrop-blur-sm">
          <span className="font-mono text-[10px] tracking-[0.4em] text-text-muted">
            ELIMINATED — SPECTATING
          </span>
        </div>
      ) : (
        <ActionBar
          onAction={handleAction}
          onBlock={handleBlock}
          onAllow={handleAllow}
          canBlock={canBlock}
          blockButtonText={blockButtonText}
          disabled={canBlock ? false : !isMyTurn || !!pendingAction}
          playerCoins={localPlayer?.coins ?? 0}
          mustCoup={(localPlayer?.coins ?? 0) >= 10}
        />
      )}

      {/* Pending action display */}
      {pendingAction && actorPlayer && !waitingForCardReveal && (
        <PendingActionDisplay
          pendingAction={pendingAction}
          actorName={actorPlayer.userName}
          targetName={targetPlayer?.userName}
          blockerName={blockerPlayer?.userName}
          isActor={isActorOfPendingAction}
          isBlocker={isBlockerOfPendingAction}
          isTarget={isTargetOfPendingAction}
          resolvesAt={actionResolvesAt}
          onChallenge={isLocalEliminated ? undefined : handleChallenge}
          onChallengeBlock={
            isLocalEliminated ? undefined : handleChallengeBlock
          }
        />
      )}

      {/* Reveal card modal */}
      {waitingForCardReveal &&
        waitingForCardReveal.playerUid === user?.uid &&
        localPlayer && (
          <RevealCardModal
            cards={localPlayer.cards}
            reason={waitingForCardReveal.reason}
            onReveal={handleRevealCard}
          />
        )}

      {/* Card reveal notification for other players */}
      {waitingForCardReveal &&
        waitingForCardReveal.playerUid !== user?.uid &&
        revealingPlayer && (
          <CardRevealNotification
            playerName={revealingPlayer.userName}
            reason={waitingForCardReveal.reason}
          />
        )}

      {/* Exchange card selection modal */}
      {waitingForExchange &&
        waitingForExchange.playerUid === user?.uid &&
        localPlayer && (
          <ExchangeModal
            currentCards={localPlayer.cards
              .filter((c) => !c.revealed && c.card !== null)
              .map((c) => c.card as string)}
            drawnCards={waitingForExchange.drawnCards}
            mustKeep={
              localPlayer.cards.filter((c) => !c.revealed && c.card !== null)
                .length
            }
            onExchange={handleExchangeCards}
          />
        )}

      {/* Target selection modal */}
      {targetSelectionAction && (
        <TargetSelectionModal
          players={players}
          currentPlayerUid={user?.uid || ''}
          action={targetSelectionAction}
          onSelect={handleTargetSelect}
          onCancel={() => setTargetSelectionAction(null)}
        />
      )}

      {/* Block card selection modal */}
      {showBlockCardSelection && pendingAction && (
        <BlockCardSelectionModal
          actionType={pendingAction.actionType}
          blockingCards={['captain', 'ambassador']}
          onSelect={handleBlockCardSelect}
          onCancel={() => setShowBlockCardSelection(false)}
        />
      )}
    </div>
  );
}
