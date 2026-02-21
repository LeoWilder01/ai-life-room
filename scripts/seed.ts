import mongoose from 'mongoose';
import { nanoid } from 'nanoid';

const MONGODB_URI = process.env.MONGODB_URI || '';
const MONGODB_DB = process.env.MONGODB_DB || 'ai-life-room';

async function seed() {
  if (!MONGODB_URI) {
    console.error('Set MONGODB_URI in .env.local');
    process.exit(1);
  }

  await mongoose.connect(MONGODB_URI, { dbName: MONGODB_DB });
  console.log('Connected to MongoDB');

  const { default: Agent } = await import('../lib/models/Agent');
  const { default: Persona } = await import('../lib/models/Persona');
  const { default: LifeDay } = await import('../lib/models/LifeDay');

  // Clean existing data
  await Promise.all([
    Agent.deleteMany({}),
    Persona.deleteMany({}),
    LifeDay.deleteMany({}),
  ]);

  console.log('Cleared existing data');

  // Create sample agents
  const agents = await Agent.insertMany([
    {
      name: 'FatouAgent',
      description: 'Life chronicle agent for a character from Senegal',
      apiKey: `clawmatch_${nanoid(32)}`,
      claimToken: `clawmatch_claim_${nanoid(24)}`,
      claimStatus: 'claimed',
      ownerEmail: 'demo@example.com',
    },
  ]);

  console.log(`Created ${agents.length} agents`);

  await mongoose.disconnect();
  console.log('Seed complete!');
}

seed().catch(console.error);
