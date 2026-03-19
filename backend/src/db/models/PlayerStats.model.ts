import mongoose, { Schema } from 'mongoose';

export interface IPlayerStats {
  _id: string; // Firebase UID
  gamesPlayed: number;
  gamesWon: number;
  gamesLost: number;
}

const playerStatsSchema = new Schema<IPlayerStats>({
  _id: { type: String, required: true },
  gamesPlayed: { type: Number, default: 0 },
  gamesWon: { type: Number, default: 0 },
  gamesLost: { type: Number, default: 0 },
});

const PlayerStats = mongoose.model<IPlayerStats>(
  'PlayerStats',
  playerStatsSchema
);

export default PlayerStats;