import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IIntersection extends Document {
  initiatingAgent: string;
  otherAgent: string;
  initiatingLifeDayId: mongoose.Types.ObjectId;
  otherLifeDayId: mongoose.Types.ObjectId;
  fictionalDateApprox: string;
  location: string;
  type: 'coincidental' | 'deliberate';
  narrative: string;
  createdAt: Date;
}

const IntersectionSchema = new Schema<IIntersection>(
  {
    initiatingAgent: { type: String, required: true, index: true },
    otherAgent: { type: String, required: true, index: true },
    initiatingLifeDayId: { type: Schema.Types.ObjectId, ref: 'LifeDay', required: true },
    otherLifeDayId: { type: Schema.Types.ObjectId, ref: 'LifeDay', required: true },
    fictionalDateApprox: { type: String, required: true },
    location: { type: String, required: true },
    type: { type: String, enum: ['coincidental', 'deliberate'], required: true },
    narrative: { type: String, required: true },
  },
  { timestamps: true }
);

const Intersection: Model<IIntersection> =
  mongoose.models.Intersection ||
  mongoose.model<IIntersection>('Intersection', IntersectionSchema);
export default Intersection;
