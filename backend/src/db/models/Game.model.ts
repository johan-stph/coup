import mongoose, { Schema, Document } from 'mongoose';

export const GAME_STATUSES = ['waiting', 'in_progress', 'finished'] as const;
export type GameStatus = (typeof GAME_STATUSES)[number];

export interface IGame extends Document {
  name: string;
  gameCode: string;
  players: string[];
  status: GameStatus;
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
    players: { type: [String], default: [] },
    status: {
      type: String,
      enum: GAME_STATUSES,
      default: 'waiting',
    },
  },
  { timestamps: true }
);

gameSchema.pre('save', async function (next) {
  if (!this.gameCode) {
    let code = generateGameCode();
    const Game = mongoose.model<IGame>('Game');
    while (await Game.exists({ gameCode: code })) {
      code = generateGameCode();
    }
    this.gameCode = code;
  }
  next();
});

const Game = mongoose.model<IGame>('Game', gameSchema);

export default Game;
