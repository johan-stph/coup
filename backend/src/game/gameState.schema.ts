import { z } from 'zod';
import { CARD_TYPES } from '../constants/cardTypes';

export const CardTypeSchema = z.enum(CARD_TYPES);

export const PlayerCardSchema = z.object({
  card: CardTypeSchema,
  revealed: z.boolean(),
});

export const GameStatePlayerSchema = z.object({
  uid: z.string(),
  userName: z.string(),
  coins: z.number().min(0),
  cards: z.array(PlayerCardSchema),
});

export const AccusationSchema = z.object({
  accuserUid: z.string(),
  accusedUid: z.string(),
  accusationType: z.enum(['challenge', 'block']),
  claimedCard: CardTypeSchema.optional(),
  timestamp: z.date(),
});

export const GameStateSchema = z.object({
  gameCode: z.string(),
  players: z.array(GameStatePlayerSchema),
  currentPlayerIndex: z.number().min(0),
  deck: z.array(CardTypeSchema),
  accusation: AccusationSchema.optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Inferred TypeScript types
export type CardType = z.infer<typeof CardTypeSchema>;
export type PlayerCard = z.infer<typeof PlayerCardSchema>;
export type GameStatePlayer = z.infer<typeof GameStatePlayerSchema>;
export type Accusation = z.infer<typeof AccusationSchema>;
export type GameState = z.infer<typeof GameStateSchema>;

// Helper class with methods for game state operations
export class GameStateHelper {
  constructor(private state: GameState) {}

  static fromDocument(doc: unknown): GameState {
    return GameStateSchema.parse(doc);
  }

  getCurrentPlayer(): GameStatePlayer {
    return this.state.players[this.state.currentPlayerIndex];
  }

  getPlayerByUid(uid: string): GameStatePlayer | undefined {
    return this.state.players.find((p) => p.uid === uid);
  }

  getPlayerIndex(uid: string): number {
    return this.state.players.findIndex((p) => p.uid === uid);
  }

  getActivePlayers(): GameStatePlayer[] {
    return this.state.players.filter((p) => this.hasActiveCards(p));
  }

  hasActiveCards(player: GameStatePlayer): boolean {
    return player.cards.some((c) => !c.revealed);
  }

  getActiveCardCount(player: GameStatePlayer): number {
    return player.cards.filter((c) => !c.revealed).length;
  }

  isPlayerEliminated(uid: string): boolean {
    const player = this.getPlayerByUid(uid);
    return player ? !this.hasActiveCards(player) : true;
  }

  hasAccusation(): boolean {
    return this.state.accusation !== undefined;
  }

  isPlayerTurn(uid: string): boolean {
    return this.getCurrentPlayer().uid === uid;
  }

  getNextPlayerIndex(): number {
    let nextIndex =
      (this.state.currentPlayerIndex + 1) % this.state.players.length;
    let attempts = 0;

    while (
      this.isPlayerEliminated(this.state.players[nextIndex].uid) &&
      attempts < this.state.players.length
    ) {
      nextIndex = (nextIndex + 1) % this.state.players.length;
      attempts++;
    }

    return nextIndex;
  }

  getRemainingPlayers(): number {
    return this.getActivePlayers().length;
  }

  isGameOver(): boolean {
    return this.getRemainingPlayers() <= 1;
  }

  getWinner(): GameStatePlayer | undefined {
    const activePlayers = this.getActivePlayers();
    return activePlayers.length === 1 ? activePlayers[0] : undefined;
  }

  hasThreeCoins(uid: string): boolean {
    const player = this.getPlayerByUid(uid);
    return player ? player.coins >= 3 : false;
  }

  isAlive(uid: string): boolean {
    return !this.isPlayerEliminated(uid);
  }

  getState(): GameState {
    return this.state;
  }
}
