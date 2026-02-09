import mongoose, { Document, Schema } from 'mongoose';

export interface IPurchase extends Document {
  uid: string;
  asset: string;
  createdAt: Date;
  updatedAt: Date;
}

const purchaseSchema = new Schema<IPurchase>(
  {
    uid: { type: String, required: true, index: true },
    asset: { type: String, required: true },
  },
  { timestamps: true }
);

const Purchase = mongoose.model<IPurchase>('Purchase', purchaseSchema);

export default Purchase;