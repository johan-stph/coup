import {
  IGame,
  PlayerState,
  ActionHistoryEntry,
} from '../db/models/Game.model.js';
import {
  Role,
  ROLES,
  GameAction,
  BlockAction,
  ACTION_METADATA,
  BLOCK_METADATA,
} from '../constants/gameActions.js';
import AppError from '../error/AppError.js';
import { BAD_REQUEST } from '../constants/http.js';

/**
 * Shuffle an array using Fisher-Yates algorithm
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Initialize a new Coup game
 * - Creates deck with 3 of each role (15 cards total)
 * - Shuffles and deals 2 cards to each player
 * - Gives each player 2 starting coins
 * - Sets first player's turn
 */
export function initializeGame(game: IGame): void {
  // Create deck: 3 of each role
  const deck: Role[] = [];
  for (const role of ROLES) {
    deck.push(role, role, role);
  }

  // Shuffle deck
  const shuffledDeck = shuffleArray(deck);

  // Deal 2 cards to each player
  const playerStates: PlayerState[] = game.players.map((player) => ({
    uid: player.uid,
    coins: 2,
    influences: [shuffledDeck.pop()!, shuffledDeck.pop()!],
    revealedInfluences: [],
  }));

  // Initialize game state
  game.deck = shuffledDeck;
  game.playerStates = playerStates;
  game.currentTurnUid = game.players[0].uid; // First player starts
  game.turnPhase = 'action';
  game.pendingAction = undefined;
  game.pendingBlock = undefined;
  game.actionHistory = [];
}

/**
 * Get player state by UID
 */
export function getPlayerState(game: IGame, uid: string): PlayerState {
  const playerState = game.playerStates?.find((ps) => ps.uid === uid);
  if (!playerState) {
    throw new AppError('Player not found in game', BAD_REQUEST, '');
  }
  return playerState;
}

/**
 * Check if a player is alive (has influences)
 */
export function isPlayerAlive(playerState: PlayerState): boolean {
  return playerState.influences.length > 0;
}

/**
 * Get all alive players
 */
export function getAlivePlayers(game: IGame): PlayerState[] {
  return game.playerStates?.filter(isPlayerAlive) || [];
}

/**
 * Check if game is over (only one player has influence)
 */
export function checkGameOver(game: IGame): {
  isOver: boolean;
  winnerId?: string;
} {
  const alivePlayers = getAlivePlayers(game);
  if (alivePlayers.length === 1) {
    return { isOver: true, winnerId: alivePlayers[0].uid };
  }
  return { isOver: false };
}

/**
 * Validate if an action can be performed
 */
export function validateAction(
  game: IGame,
  actorUid: string,
  action: GameAction,
  targetUid?: string
): void {
  // Check game is in progress
  if (game.status !== 'in_progress') {
    throw new AppError('Game is not in progress', BAD_REQUEST, '');
  }

  // Check it's the player's turn
  if (game.currentTurnUid !== actorUid) {
    throw new AppError('Not your turn', BAD_REQUEST, '');
  }

  // Check we're in action phase
  if (game.turnPhase !== 'action') {
    throw new AppError('Not in action phase', BAD_REQUEST, '');
  }

  const actor = getPlayerState(game, actorUid);

  // Check player is alive
  if (!isPlayerAlive(actor)) {
    throw new AppError('Player is eliminated', BAD_REQUEST, '');
  }

  const metadata = ACTION_METADATA[action];

  // Check if player has enough coins
  if (actor.coins < metadata.cost) {
    throw new AppError(
      `Not enough coins. Required: ${metadata.cost}, have: ${actor.coins}`,
      BAD_REQUEST,
      ''
    );
  }

  // Check if player must coup (10+ coins)
  if (actor.coins >= 10 && action !== 'coup') {
    throw new AppError(
      'Must perform coup with 10 or more coins',
      BAD_REQUEST,
      ''
    );
  }

  // Check if action requires target
  if (metadata.requiresTarget && !targetUid) {
    throw new AppError('Action requires a target', BAD_REQUEST, '');
  }

  // Check target is valid
  if (targetUid) {
    if (targetUid === actorUid) {
      throw new AppError('Cannot target yourself', BAD_REQUEST, '');
    }
    const target = getPlayerState(game, targetUid);
    if (!isPlayerAlive(target)) {
      throw new AppError('Target player is eliminated', BAD_REQUEST, '');
    }
  }
}

/**
 * Perform an action (creates pending action for challenge/block)
 */
export function performAction(
  game: IGame,
  actorUid: string,
  action: GameAction,
  targetUid?: string
): void {
  validateAction(game, actorUid, action, targetUid);

  const metadata = ACTION_METADATA[action];
  const actor = getPlayerState(game, actorUid);

  // Deduct cost immediately
  actor.coins -= metadata.cost;

  // Actions that can't be challenged or blocked resolve immediately
  if (!metadata.challengeable && !metadata.blockableBy) {
    resolveAction(game, action, actorUid, targetUid);
    advanceTurn(game);
    return;
  }

  // Create pending action for challenge/block
  game.pendingAction = {
    type: action,
    actorUid,
    targetUid,
    claimedRole: metadata.claimedRole,
    timestamp: new Date(),
    respondedPlayers: [],
  };

  // Move to challenge phase (or block phase if only blockable)
  game.turnPhase = metadata.challengeable ? 'challenge' : 'block';
}

/**
 * Resolve an action (apply its effects)
 */
export function resolveAction(
  game: IGame,
  action: GameAction,
  actorUid: string,
  targetUid?: string
): void {
  const actor = getPlayerState(game, actorUid);
  const target = targetUid ? getPlayerState(game, targetUid) : undefined;

  switch (action) {
    case 'income':
      actor.coins += 1;
      addActionHistory(game, {
        type: 'action',
        actorUid,
        action,
        successful: true,
        timestamp: new Date(),
        description: `${getPlayerName(game, actorUid)} took income (+1 coin)`,
      });
      break;

    case 'foreign_aid':
      actor.coins += 2;
      addActionHistory(game, {
        type: 'action',
        actorUid,
        action,
        successful: true,
        timestamp: new Date(),
        description: `${getPlayerName(game, actorUid)} took foreign aid (+2 coins)`,
      });
      break;

    case 'tax':
      actor.coins += 3;
      addActionHistory(game, {
        type: 'action',
        actorUid,
        action,
        claimedRole: 'duke',
        successful: true,
        timestamp: new Date(),
        description: `${getPlayerName(game, actorUid)} collected tax as Duke (+3 coins)`,
      });
      break;

    case 'assassinate':
      if (!target) break;
      // Target must lose an influence (they choose which)
      addActionHistory(game, {
        type: 'action',
        actorUid,
        targetUid,
        action,
        claimedRole: 'assassin',
        successful: true,
        timestamp: new Date(),
        description: `${getPlayerName(game, actorUid)} assassinated ${getPlayerName(game, targetUid!)}`,
      });
      break;

    case 'steal':
      if (!target) break;
      const stolenAmount = Math.min(2, target.coins);
      target.coins -= stolenAmount;
      actor.coins += stolenAmount;
      addActionHistory(game, {
        type: 'action',
        actorUid,
        targetUid,
        action,
        claimedRole: 'captain',
        successful: true,
        timestamp: new Date(),
        description: `${getPlayerName(game, actorUid)} stole ${stolenAmount} coins from ${getPlayerName(game, targetUid!)}`,
      });
      break;

    case 'exchange':
      // Draw 2 cards from deck, player chooses 2 to keep, returns 2
      // This requires additional player input - mark as pending
      addActionHistory(game, {
        type: 'action',
        actorUid,
        action,
        claimedRole: 'ambassador',
        successful: true,
        timestamp: new Date(),
        description: `${getPlayerName(game, actorUid)} exchanged cards as Ambassador`,
      });
      break;

    case 'coup':
      if (!target) break;
      // Target must lose an influence (they choose which)
      addActionHistory(game, {
        type: 'action',
        actorUid,
        targetUid,
        action,
        successful: true,
        timestamp: new Date(),
        description: `${getPlayerName(game, actorUid)} launched a coup against ${getPlayerName(game, targetUid!)}`,
      });
      break;
  }
}

/**
 * Process a challenge
 */
export function processChallenge(game: IGame, challengerUid: string): void {
  if (!game.pendingAction && !game.pendingBlock) {
    throw new AppError('No action to challenge', BAD_REQUEST, '');
  }

  const challenger = getPlayerState(game, challengerUid);
  if (!isPlayerAlive(challenger)) {
    throw new AppError('Challenger is eliminated', BAD_REQUEST, '');
  }

  // Challenging an action
  if (game.pendingAction && !game.pendingBlock) {
    const action = game.pendingAction;
    const actor = getPlayerState(game, action.actorUid);
    const claimedRole = action.claimedRole;

    if (!claimedRole) {
      throw new AppError('Action cannot be challenged', BAD_REQUEST, '');
    }

    // Check if actor has the claimed role
    const hasRole = actor.influences.includes(claimedRole);

    if (hasRole) {
      // Challenge failed - challenger loses influence
      addActionHistory(game, {
        type: 'challenge',
        actorUid: challengerUid,
        targetUid: action.actorUid,
        successful: false,
        timestamp: new Date(),
        description: `${getPlayerName(game, challengerUid)} challenged ${getPlayerName(game, action.actorUid)} but failed`,
      });

      // Actor shows the card, shuffles it back, draws a new one
      const roleIndex = actor.influences.indexOf(claimedRole);
      actor.influences.splice(roleIndex, 1);
      if (game.deck && game.deck.length > 0) {
        actor.influences.push(game.deck.pop()!);
      }
      game.deck?.push(claimedRole);
      if (game.deck) {
        game.deck = shuffleArray(game.deck);
      }

      // Challenger must lose an influence before action resolves
      // Move to resolve phase and wait for challenger to choose which influence to lose
      game.turnPhase = 'resolve';
      game.pendingAction = action; // Keep the pending action to resolve after influence loss
      game.pendingInfluenceLoss = {
        playerUid: challengerUid,
        reason: 'challenge_failed',
      };
    } else {
      // Challenge succeeded - actor loses influence
      addActionHistory(game, {
        type: 'challenge',
        actorUid: challengerUid,
        targetUid: action.actorUid,
        successful: true,
        timestamp: new Date(),
        description: `${getPlayerName(game, challengerUid)} successfully challenged ${getPlayerName(game, action.actorUid)}`,
      });

      // Action fails, actor loses influence
      // Refund the cost if any
      actor.coins += ACTION_METADATA[action.type].cost;

      // Move to resolve phase for actor to choose which influence to lose
      game.turnPhase = 'resolve';
      game.pendingAction = undefined; // Action is cancelled, don't resolve it
      game.pendingInfluenceLoss = {
        playerUid: action.actorUid,
        reason: 'challenge_succeeded',
      };
    }
  }
  // Challenging a block
  else if (game.pendingBlock) {
    const block = game.pendingBlock;
    const originalAction = game.pendingAction; // Save this before clearing
    const blocker = getPlayerState(game, block.blockerUid);
    const claimedRole = block.claimedRole;

    // Check if blocker has the claimed role
    const hasRole = blocker.influences.includes(claimedRole);

    if (hasRole) {
      // Challenge failed - challenger loses influence
      addActionHistory(game, {
        type: 'challenge',
        actorUid: challengerUid,
        targetUid: block.blockerUid,
        successful: false,
        timestamp: new Date(),
        description: `${getPlayerName(game, challengerUid)} challenged block by ${getPlayerName(game, block.blockerUid)} but failed`,
      });

      // Blocker shows the card, shuffles it back, draws a new one
      const roleIndex = blocker.influences.indexOf(claimedRole);
      blocker.influences.splice(roleIndex, 1);
      if (game.deck && game.deck.length > 0) {
        blocker.influences.push(game.deck.pop()!);
      }
      game.deck?.push(claimedRole);
      if (game.deck) {
        game.deck = shuffleArray(game.deck);
      }

      // Block succeeds
      addActionHistory(game, {
        type: 'block',
        actorUid: block.blockerUid,
        blockAction: block.type,
        claimedRole: block.claimedRole,
        successful: true,
        timestamp: new Date(),
        description: `${getPlayerName(game, block.blockerUid)} blocked the action`,
      });

      // Challenger must lose an influence, then the action is blocked (no resolution)
      game.turnPhase = 'resolve';
      game.pendingAction = undefined; // Block succeeded, so no action to resolve
      game.pendingBlock = undefined;
      game.pendingInfluenceLoss = {
        playerUid: challengerUid,
        reason: 'challenge_failed',
      };
    } else {
      // Challenge succeeded - blocker loses influence, action goes through
      addActionHistory(game, {
        type: 'challenge',
        actorUid: challengerUid,
        targetUid: block.blockerUid,
        successful: true,
        timestamp: new Date(),
        description: `${getPlayerName(game, challengerUid)} successfully challenged block by ${getPlayerName(game, block.blockerUid)}`,
      });

      // Blocker must lose an influence, then original action will resolve
      game.turnPhase = 'resolve';
      game.pendingAction = originalAction; // Keep the action to resolve after influence loss
      game.pendingBlock = undefined;
      game.pendingInfluenceLoss = {
        playerUid: block.blockerUid,
        reason: 'challenge_succeeded',
      };
    }
  }
}

/**
 * Process a block
 */
export function processBlock(
  game: IGame,
  blockerUid: string,
  blockAction: BlockAction,
  claimedRole: Role
): void {
  if (!game.pendingAction) {
    throw new AppError('No action to block', BAD_REQUEST, '');
  }

  if (game.turnPhase !== 'block') {
    throw new AppError('Not in block phase', BAD_REQUEST, '');
  }

  const blocker = getPlayerState(game, blockerUid);
  if (!isPlayerAlive(blocker)) {
    throw new AppError('Blocker is eliminated', BAD_REQUEST, '');
  }

  const action = game.pendingAction;

  // Prevent players from blocking their own actions
  if (blockerUid === action.actorUid) {
    throw new AppError('Cannot block your own action', BAD_REQUEST, '');
  }

  const metadata = ACTION_METADATA[action.type];

  // Check if action can be blocked
  if (!metadata.blockableBy) {
    throw new AppError('Action cannot be blocked', BAD_REQUEST, '');
  }

  // Check if claimed role can block this action
  if (!metadata.blockableBy.includes(claimedRole)) {
    throw new AppError(
      `${claimedRole} cannot block ${action.type}`,
      BAD_REQUEST,
      ''
    );
  }

  // Create pending block for challenge
  game.pendingBlock = {
    type: blockAction,
    blockerUid,
    claimedRole,
    timestamp: new Date(),
    respondedPlayers: [],
  };

  // Move to challenge phase for the block
  game.turnPhase = 'challenge';
}

/**
 * Pass on challenge/block
 */
export function passResponse(game: IGame, playerUid: string): void {
  if (game.turnPhase === 'challenge' && game.pendingAction) {
    game.pendingAction.respondedPlayers.push(playerUid);

    // Check if all other players have responded
    const otherPlayers = game.players.filter(
      (p) => p.uid !== game.pendingAction!.actorUid
    );
    const allResponded = otherPlayers.every((p) =>
      game.pendingAction!.respondedPlayers.includes(p.uid)
    );

    if (allResponded) {
      // No one challenged, move to block phase or resolve
      const metadata = ACTION_METADATA[game.pendingAction.type];
      if (metadata.blockableBy && game.pendingAction.targetUid) {
        game.turnPhase = 'block';
      } else {
        // Resolve action
        resolveAction(
          game,
          game.pendingAction.type,
          game.pendingAction.actorUid,
          game.pendingAction.targetUid
        );
        game.pendingAction = undefined;
        advanceTurn(game);
      }
    }
  } else if (game.turnPhase === 'block' && game.pendingAction) {
    game.pendingAction.respondedPlayers.push(playerUid);

    // Check if target has responded (or all eligible blockers)
    const eligibleBlockers = [game.pendingAction.targetUid];
    const allResponded = eligibleBlockers.every((uid) =>
      uid ? game.pendingAction!.respondedPlayers.includes(uid) : true
    );

    if (allResponded) {
      // No one blocked, resolve action
      resolveAction(
        game,
        game.pendingAction.type,
        game.pendingAction.actorUid,
        game.pendingAction.targetUid
      );
      game.pendingAction = undefined;
      advanceTurn(game);
    }
  } else if (game.turnPhase === 'challenge' && game.pendingBlock) {
    game.pendingBlock.respondedPlayers.push(playerUid);

    // Check if all players have responded
    const allPlayers = game.players.filter(
      (p) => p.uid !== game.pendingBlock!.blockerUid
    );
    const allResponded = allPlayers.every((p) =>
      game.pendingBlock!.respondedPlayers.includes(p.uid)
    );

    if (allResponded) {
      // No one challenged the block, block succeeds
      addActionHistory(game, {
        type: 'block',
        actorUid: game.pendingBlock.blockerUid,
        blockAction: game.pendingBlock.type,
        claimedRole: game.pendingBlock.claimedRole,
        successful: true,
        timestamp: new Date(),
        description: `${getPlayerName(game, game.pendingBlock.blockerUid)} blocked the action`,
      });

      game.pendingAction = undefined;
      game.pendingBlock = undefined;
      advanceTurn(game);
    }
  }
}

/**
 * Lose an influence (player chooses which card to reveal)
 */
export function loseInfluence(
  game: IGame,
  playerUid: string,
  roleToLose: Role
): void {
  const player = getPlayerState(game, playerUid);

  // Verify this player should be losing an influence
  if (
    game.pendingInfluenceLoss &&
    game.pendingInfluenceLoss.playerUid !== playerUid
  ) {
    throw new AppError(
      'Wrong player attempting to lose influence',
      BAD_REQUEST,
      ''
    );
  }

  const roleIndex = player.influences.indexOf(roleToLose);
  if (roleIndex === -1) {
    throw new AppError('Player does not have that influence', BAD_REQUEST, '');
  }

  // Move card from influences to revealed
  player.influences.splice(roleIndex, 1);
  player.revealedInfluences.push(roleToLose);

  addActionHistory(game, {
    type: 'resolve',
    actorUid: playerUid,
    successful: false,
    revealedCard: roleToLose,
    timestamp: new Date(),
    description: `${getPlayerName(game, playerUid)} lost influence (${roleToLose})`,
  });

  // Clear pending influence loss
  game.pendingInfluenceLoss = undefined;

  // Check if game is over
  const gameOver = checkGameOver(game);
  if (gameOver.isOver) {
    game.status = 'finished';
    addActionHistory(game, {
      type: 'resolve',
      actorUid: gameOver.winnerId!,
      successful: true,
      timestamp: new Date(),
      description: `${getPlayerName(game, gameOver.winnerId!)} wins the game!`,
    });
    return; // Game ended, don't continue
  }

  // If there's a pending action, resolve it now
  if (game.pendingAction) {
    const action = game.pendingAction;
    resolveAction(game, action.type, action.actorUid, action.targetUid);

    // Check if the resolved action requires the target to lose an influence
    const metadata = ACTION_METADATA[action.type];
    if (
      (action.type === 'assassinate' || action.type === 'coup') &&
      action.targetUid
    ) {
      // Stay in resolve phase for target to lose influence
      game.turnPhase = 'resolve';
      game.pendingAction = undefined;
      game.pendingInfluenceLoss = {
        playerUid: action.targetUid,
        reason: action.type === 'assassinate' ? 'assassinated' : 'couped',
      };
    } else {
      // Action fully resolved, advance turn
      game.pendingAction = undefined;
      advanceTurn(game);
    }
  } else {
    // No pending action, advance turn
    advanceTurn(game);
  }
}

/**
 * Advance to next player's turn
 */
export function advanceTurn(game: IGame): void {
  const alivePlayers = getAlivePlayers(game);
  if (alivePlayers.length <= 1) {
    return; // Game is over
  }

  const currentIndex = alivePlayers.findIndex(
    (p) => p.uid === game.currentTurnUid
  );
  const nextIndex = (currentIndex + 1) % alivePlayers.length;
  game.currentTurnUid = alivePlayers[nextIndex].uid;
  game.turnPhase = 'action';
}

/**
 * Add entry to action history
 */
function addActionHistory(game: IGame, entry: ActionHistoryEntry): void {
  if (!game.actionHistory) {
    game.actionHistory = [];
  }
  game.actionHistory.push(entry);
}

/**
 * Get player name by UID
 */
function getPlayerName(game: IGame, uid: string): string {
  const player = game.players.find((p) => p.uid === uid);
  return player?.userName || 'Unknown';
}

/**
 * Get sanitized game state for a specific player (hides other players' cards)
 */
export function getGameStateForPlayer(game: IGame, viewerUid: string) {
  return {
    gameCode: game.gameCode,
    name: game.name,
    status: game.status,
    players: game.players,
    currentTurnUid: game.currentTurnUid,
    turnPhase: game.turnPhase,
    deckSize: game.deck?.length || 0,
    playerStates: game.playerStates?.map((ps) => ({
      uid: ps.uid,
      coins: ps.coins,
      influenceCount: ps.influences.length,
      influences: ps.uid === viewerUid ? ps.influences : null, // Only show viewer's cards
      revealedInfluences: ps.revealedInfluences,
    })),
    pendingAction: game.pendingAction,
    pendingBlock: game.pendingBlock,
    actionHistory: game.actionHistory?.slice(-10), // Last 10 actions
  };
}
