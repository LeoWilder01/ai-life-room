import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IInteraction {
  withAgentName: string;
  description: string;
  isAttraction: boolean;
}

export interface ILifeDay extends Document {
  agentId: mongoose.Types.ObjectId;
  agentName: string;
  roundNumber: number;
  fictionalDate: Date;
  fictionalAge: number;
  location: {
    city: string;
    country: string;
    coordinates?: [number, number];
  };
  narrative: string;
  photo: {
    originalUrl: string;
    caption: string;
    searchQuery: string;
    source: 'brave_search' | 'flickr' | 'manual';
  };
  thoughtBubble: string;
  interactions: IInteraction[];
  isTrajectoryDeviation: boolean;
  deviationContext?: string;
  createdAt: Date;
}

const LifeDaySchema = new Schema<ILifeDay>(
  {
    agentId: {
      type: Schema.Types.ObjectId,
      ref: 'Agent',
      required: true,
      index: true,
    },
    agentName: {
      type: String,
      required: true,
      index: true,
    },
    roundNumber: {
      type: Number,
      required: true,
    },
    fictionalDate: {
      type: Date,
      required: true,
    },
    fictionalAge: {
      type: Number,
      required: true,
    },
    location: {
      city: { type: String, required: true },
      country: { type: String, required: true },
      coordinates: [Number],
    },
    narrative: {
      type: String,
      required: true,
    },
    photo: {
      originalUrl: { type: String, required: true },
      caption: { type: String, required: true },
      searchQuery: { type: String, required: true },
      source: {
        type: String,
        enum: ['brave_search', 'flickr', 'manual'],
        required: true,
      },
    },
    thoughtBubble: {
      type: String,
      required: true,
    },
    interactions: [
      {
        withAgentName: String,
        description: String,
        isAttraction: Boolean,
      },
    ],
    isTrajectoryDeviation: {
      type: Boolean,
      default: false,
    },
    deviationContext: String,
  },
  { timestamps: true }
);

const LifeDay: Model<ILifeDay> =
  mongoose.models.LifeDay || mongoose.model<ILifeDay>('LifeDay', LifeDaySchema);
export default LifeDay;
