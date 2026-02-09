import { authFetch } from './authFetch';
import type { GameAction, BlockAction, Role } from '~/types/game';

/**
 * Perform a game action
 */
export async function performGameAction(
  gameCode: string,
  action: GameAction,
  targetUid?: string
): Promise<void> {
  await authFetch(`/games/action/${gameCode}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, targetUid }),
  });
}

/**
 * Challenge an action or block
 */
export async function challengeAction(gameCode: string): Promise<void> {
  await authFetch(`/games/challenge/${gameCode}`, {
    method: 'POST',
  });
}

/**
 * Block an action
 */
export async function blockAction(
  gameCode: string,
  blockAction: BlockAction,
  claimedRole: Role
): Promise<void> {
  await authFetch(`/games/block/${gameCode}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ blockAction, claimedRole }),
  });
}

/**
 * Pass on challenging or blocking
 */
export async function passResponse(gameCode: string): Promise<void> {
  await authFetch(`/games/pass/${gameCode}`, {
    method: 'POST',
  });
}

/**
 * Lose an influence (reveal a card)
 */
export async function loseInfluence(
  gameCode: string,
  role: Role
): Promise<void> {
  await authFetch(`/games/lose-influence/${gameCode}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role }),
  });
}

/**
 * Get current game state
 */
export async function getGameState(gameCode: string): Promise<any> {
  const response = await authFetch(`/games/${gameCode}/state`);
  return response.json();
}
