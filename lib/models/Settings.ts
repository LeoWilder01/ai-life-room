import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISettings extends Document {
  key: string;
  flickrApiKey?: string;
  updatedAt: Date;
}

const SettingsSchema = new Schema<ISettings>(
  {
    key: { type: String, default: 'global', unique: true },
    flickrApiKey: String,
  },
  { timestamps: true }
);

const Settings: Model<ISettings> =
  mongoose.models.Settings || mongoose.model<ISettings>('Settings', SettingsSchema);
export default Settings;
