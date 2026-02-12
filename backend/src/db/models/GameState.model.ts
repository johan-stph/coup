import mongoose, { Schema, Document } from 'mongoose';
import { CardType, CARD_TYPES } from '../../constants/cardTypes';

export interface PlayerCard {
  card: CardType;
  revealed: boolean;
}

export interface GameStatePlayer {
  uid: string;
  userName: string;
  coins: number;
  cards: PlayerCard[];
}

export interface Accusation {
  accuserUid: string;
  accusedUid: string;
  accusationType: 'challenge' | 'block';
  claimedCard?: CardType;
  timestamp: Date;
}

export type ActionType =
  | 'income'
  | 'foreign_aid'
  | 'coup'
  | 'tax'
  | 'assassinate'
  | 'exchange'
  | 'steal';

export type ActionPhase =
  | 'awaiting_challenge'
  | 'awaiting_block'
  | 'awaiting_block_challenge';

export interface PendingAction {
  actionType: ActionType;
  actorUid: string;
  targetUid?: string;
  claimedCard?: CardType;
  canBeBlocked: boolean;
  canBeChallenged: boolean;
  blockingPlayerUid?: string;
  blockClaimedCard?: CardType;
  phase: ActionPhase;
  timestamp: Date;
}

export interface WaitingForCardReveal {
  playerUid: string;
  reason: 'challenge_lost' | 'couped' | 'assassinated';
}

export interface WaitingForExchange {
  playerUid: string;
  drawnCards: CardType[];
}

export interface IGameState extends Document {
  gameCode: string;
  players: GameStatePlayer[];
  currentPlayerIndex: number;
  deck: CardType[];
  accusation?: Accusation;
  pendingAction?: PendingAction;
  actionResolvesAt?: Date;
  waitingForCardReveal?: WaitingForCardReveal;
  waitingForExchange?: WaitingForExchange;
  createdAt: Date;
  updatedAt: Date;
}

const gameStateSchema = new Schema<IGameState>(
  {
    gameCode: { type: String, required: true, unique: true },
    players: {
      type: [
        {
          uid: { type: String, required: true },
          userName: { type: String, required: true },
          coins: { type: Number, required: true, default: 2 },
          cards: {
            type: [
              {
                card: {
                  type: String,
                  enum: CARD_TYPES,
                  required: true,
                },
                revealed: { type: Boolean, default: false },
                _id: false,
              },
            ],
            default: [],
          },
          _id: false,
        },
      ],
      default: [],
    },
    currentPlayerIndex: { type: Number, required: true, default: 0 },
    deck: {
      type: [String],
      enum: CARD_TYPES,
      default: [],
    },
    accusation: {
      type: {
        accuserUid: { type: String, required: true },
        accusedUid: { type: String, required: true },
        accusationType: {
          type: String,
          enum: ['challenge', 'block'],
          required: true,
        },
        claimedCard: { type: String, enum: CARD_TYPES },
        timestamp: { type: Date, default: Date.now },
        _id: false,
      },
      required: false,
    },
    pendingAction: {
      type: {
        actionType: {
          type: String,
          enum: [
            'income',
            'foreign_aid',
            'coup',
            'tax',
            'assassinate',
            'exchange',
            'steal',
          ],
          required: true,
        },
        actorUid: { type: String, required: true },
        targetUid: { type: String },
        claimedCard: { type: String, enum: CARD_TYPES },
        canBeBlocked: { type: Boolean, required: true },
        canBeChallenged: { type: Boolean, required: true },
        blockingPlayerUid: { type: String },
        blockClaimedCard: { type: String, enum: CARD_TYPES },
        phase: {
          type: String,
          enum: [
            'awaiting_challenge',
            'awaiting_block',
            'awaiting_block_challenge',
          ],
          required: true,
        },
        timestamp: { type: Date, default: Date.now },
        _id: false,
      },
      required: false,
    },
    actionResolvesAt: { type: Date },
    waitingForCardReveal: {
      type: {
        playerUid: { type: String, required: true },
        reason: {
          type: String,
          enum: ['challenge_lost', 'couped', 'assassinated'],
          required: true,
        },
        _id: false,
      },
      required: false,
    },
    waitingForExchange: {
      type: {
        playerUid: { type: String, required: true },
        drawnCards: {
          type: [String],
          enum: CARD_TYPES,
          required: true,
        },
        _id: false,
      },
      required: false,
    },
  },
  { timestamps: true }
);

const GameState = mongoose.model<IGameState>('GameState', gameStateSchema);

export default GameState;
