import mongoose, { Schema, Document } from 'mongoose';

export const GAME_STATUSES = ['waiting', 'in_progress', 'finished'] as const;
export type GameStatus = (typeof GAME_STATUSES)[number];

export interface IGame extends Document {
  name: string;
  players: string[];
  status: GameStatus;
  createdAt: Date;
  updatedAt: Date;
}

const gameSchema = new Schema<IGame>(
  {
    name: { type: String, required: true },
    players: { type: [String], default: [] },
    status: {
      type: String,
      enum: GAME_STATUSES,
      default: 'waiting',
    },
  },
  { timestamps: true }
);

const Game = mongoose.model<IGame>('Game', gameSchema);

export default Game;
