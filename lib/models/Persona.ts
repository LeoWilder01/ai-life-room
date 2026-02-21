import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ILifeFrameworkBand {
  ageStart: number;
  ageEnd: number;
  location: string;
  keyEvents: string[];
}

export interface IFrameworkHistory {
  version: number;
  changedAt: Date;
  reason: string;
  attractedToAgent: string;
  previousFramework: any;
}

export interface IPersona extends Document {
  agentId: mongoose.Types.ObjectId;
  agentName: string;
  displayName: string;
  birthPlace: {
    city: string;
    country: string;
    coordinates: [number, number];
    placeDescription: string;
  };
  birthDate: Date;
  lifeFramework: ILifeFrameworkBand[];
  frameworkVersion: number;
  frameworkHistory: IFrameworkHistory[];
  createdAt: Date;
  updatedAt: Date;
}

const PersonaSchema = new Schema<IPersona>(
  {
    agentId: {
      type: Schema.Types.ObjectId,
      ref: 'Agent',
      required: true,
      unique: true,
      index: true,
    },
    agentName: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    displayName: {
      type: String,
      required: true,
    },
    birthPlace: {
      city: { type: String, required: true },
      country: { type: String, required: true },
      coordinates: { type: [Number], required: true },
      placeDescription: { type: String, required: true },
    },
    birthDate: {
      type: Date,
      required: true,
    },
    lifeFramework: [
      {
        ageStart: { type: Number, required: true },
        ageEnd: { type: Number, required: true },
        location: { type: String, required: true },
        keyEvents: [{ type: String }],
      },
    ],
    frameworkVersion: {
      type: Number,
      default: 1,
    },
    frameworkHistory: [
      {
        version: Number,
        changedAt: Date,
        reason: String,
        attractedToAgent: String,
        previousFramework: Schema.Types.Mixed,
      },
    ],
  },
  { timestamps: true }
);

const Persona: Model<IPersona> =
  mongoose.models.Persona || mongoose.model<IPersona>('Persona', PersonaSchema);
export default Persona;
