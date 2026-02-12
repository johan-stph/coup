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

export interface IGameState extends Document {
  gameCode: string;
  players: GameStatePlayer[];
  currentPlayerIndex: number;
  deck: CardType[];
  accusation?: Accusation;
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
  },
  { timestamps: true }
);

const GameState = mongoose.model<IGameState>('GameState', gameStateSchema);

export default GameState;
