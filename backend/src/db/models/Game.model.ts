import mongoose, { Schema, Document } from 'mongoose';
import { Role, GameAction, BlockAction } from '../../constants/gameActions.js';

export const GAME_STATUSES = ['waiting', 'in_progress', 'finished'] as const;
export type GameStatus = (typeof GAME_STATUSES)[number];

export const TURN_PHASES = ['action', 'challenge', 'block', 'resolve'] as const;
export type TurnPhase = (typeof TURN_PHASES)[number];

export interface GamePlayer {
  uid: string;
  userName: string;
}

export interface PlayerState {
  uid: string;
  coins: number;
  influences: Role[]; // Hidden cards still in play
  revealedInfluences: Role[]; // Lost/revealed cards
}

export interface PendingAction {
  type: GameAction;
  actorUid: string;
  targetUid?: string;
  claimedRole?: Role;
  timestamp: Date;
  respondedPlayers: string[]; // Players who passed on challenge/block
}

export interface PendingBlock {
  type: BlockAction;
  blockerUid: string;
  claimedRole: Role;
  timestamp: Date;
  respondedPlayers: string[]; // Players who passed on challenging the block
}

export interface ActionHistoryEntry {
  type: 'action' | 'challenge' | 'block' | 'resolve';
  actorUid: string;
  targetUid?: string;
  action?: GameAction;
  blockAction?: BlockAction;
  claimedRole?: Role;
  successful: boolean;
  revealedCard?: Role;
  timestamp: Date;
  description: string;
}

export interface PendingInfluenceLoss {
  playerUid: string;
  reason:
    | 'challenge_failed'
    | 'challenge_succeeded'
    | 'assassinated'
    | 'couped';
}

export interface IGame extends Document {
  name: string;
  gameCode: string;
  players: GamePlayer[];
  createdBy: string;
  status: GameStatus;

  // Game state (only populated when status is 'in_progress')
  deck?: Role[];
  playerStates?: PlayerState[];
  currentTurnUid?: string;
  turnPhase?: TurnPhase;
  pendingAction?: PendingAction;
  pendingBlock?: PendingBlock;
  pendingInfluenceLoss?: PendingInfluenceLoss;
  actionHistory?: ActionHistoryEntry[];

  createdAt: Date;
  updatedAt: Date;
}

function generateGameCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

const gameSchema = new Schema<IGame>(
  {
    name: { type: String, required: true },
    gameCode: { type: String, unique: true },
    players: {
      type: [
        {
          uid: { type: String, required: true },
          userName: { type: String, required: true },
          _id: false,
        },
      ],
      default: [],
    },
    createdBy: { type: String, required: true },
    status: {
      type: String,
      enum: GAME_STATUSES,
      default: 'waiting',
    },

    // Game state fields
    deck: { type: [String] },
    playerStates: {
      type: [
        {
          uid: { type: String, required: true },
          coins: { type: Number, required: true },
          influences: { type: [String], required: true },
          revealedInfluences: { type: [String], default: [] },
          _id: false,
        },
      ],
    },
    currentTurnUid: { type: String },
    turnPhase: {
      type: String,
      enum: TURN_PHASES,
    },
    pendingAction: {
      type: Schema.Types.Mixed,
    },
    pendingBlock: {
      type: Schema.Types.Mixed,
    },
    pendingInfluenceLoss: {
      type: Schema.Types.Mixed,
    },
    actionHistory: {
      type: [
        {
          type: { type: String, required: true },
          actorUid: { type: String, required: true },
          targetUid: { type: String },
          action: { type: String },
          blockAction: { type: String },
          claimedRole: { type: String },
          successful: { type: Boolean, required: true },
          revealedCard: { type: String },
          timestamp: { type: Date, required: true },
          description: { type: String, required: true },
          _id: false,
        },
      ],
    },
  },
  { timestamps: true }
);

gameSchema.pre('save', async function () {
  if (!this.gameCode) {
    let code = generateGameCode();
    const Game = mongoose.model<IGame>('Game');
    while (await Game.exists({ gameCode: code })) {
      code = generateGameCode();
    }
    this.gameCode = code;
  }
});

const Game = mongoose.model<IGame>('Game', gameSchema);

export default Game;
