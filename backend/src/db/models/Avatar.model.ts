import mongoose, { Schema } from 'mongoose';

export interface IAvatar {
  _id: string; // Firebase UID
  accessory: string | null;
  character: string | null;
  background: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const avatarSchema = new Schema<IAvatar>(
  {
    _id: { type: String, required: true },
    accessory: { type: String, default: null },
    character: { type: String, default: null },
    background: { type: String, default: null },
  },
  { timestamps: true }
);

const Avatar = mongoose.model<IAvatar>('Avatar', avatarSchema);

export default Avatar;
