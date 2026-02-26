import Persona from '@/lib/models/Persona';
import LifeDay from '@/lib/models/LifeDay';
import { generatePersona, generateLifeDay } from '@/lib/llm';
import { searchBrave } from '@/lib/photos';
import type { IAgent } from '@/lib/models/Agent';

type PhotoSource = 'brave_search' | 'flickr' | 'manual';

/**
 * Core simulation logic shared between /api/simulate (manual) and
 * /api/cron/simulate (scheduled). The caller is responsible for
 * connectDB() before calling this function.
 */
export async function simulateAgent(agent: IAgent) {
  // ── Step 1: Ensure persona exists ──────────────────────────────
  let persona = await Persona.findOne({ agentId: agent._id });
  let isNewPersona = false;

  if (!persona) {
    const personaData = await generatePersona(agent.name);
    persona = await Persona.create({
      agentId: agent._id,
      agentName: agent.name,
      displayName: personaData.displayName,
      birthPlace: personaData.birthPlace,
      birthDate: new Date(personaData.birthDate),
      lifeFramework: personaData.lifeFramework,
      frameworkVersion: 1,
      frameworkHistory: [],
    });
    isNewPersona = true;
  }

  // ── Step 2: Other agents' latest days as context ───────────────
  const otherDays = await LifeDay.find({ agentName: { $ne: agent.name } })
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();

  const otherDaysSummary = otherDays
    .map(d => `@${d.agentName} (age ${d.fictionalAge}, ${d.location.city}): "${d.thoughtBubble}"`)
    .join('\n');

  const existingDays = await LifeDay.find({ agentId: agent._id })
    .select('fictionalDate')
    .lean();
  const existingDates = existingDays.map(d =>
    new Date(d.fictionalDate).toISOString().split('T')[0]
  );

  // ── Step 3: LLM generates life day ────────────────────────────
  const lifeDayData = await generateLifeDay(persona, otherDaysSummary, existingDates);

  // ── Step 4: Search for a real photo ───────────────────────────
  let photo: { originalUrl: string; caption: string; searchQuery: string; source: PhotoSource } = {
    originalUrl: `https://api.dicebear.com/9.x/shapes/svg?seed=${encodeURIComponent(lifeDayData.photoSearchQuery)}`,
    caption: `[placeholder] ${lifeDayData.photoSearchQuery}`,
    searchQuery: lifeDayData.photoSearchQuery,
    source: 'manual',
  };

  const braveKey = process.env.BRAVE_API_KEY || '';
  if (braveKey) {
    const braveResult = await searchBrave(lifeDayData.photoSearchQuery, braveKey);
    if (braveResult) {
      photo = {
        originalUrl: braveResult.url,
        caption: braveResult.caption,
        searchQuery: lifeDayData.photoSearchQuery,
        source: 'brave_search',
      };
    }
  }

  // ── Step 5: Persist to database ───────────────────────────────
  const existingCount = await LifeDay.countDocuments({ agentId: agent._id });

  const lifeDay = await LifeDay.create({
    agentId: agent._id,
    agentName: agent.name,
    roundNumber: existingCount + 1,
    fictionalDate: new Date(lifeDayData.fictionalDate),
    fictionalAge: Number(lifeDayData.fictionalAge),
    location: {
      city: lifeDayData.location.city,
      country: lifeDayData.location.country,
      coordinates: lifeDayData.location.coordinates,
    },
    narrative: lifeDayData.narrative,
    photo,
    thoughtBubble: lifeDayData.thoughtBubble,
    interactions: lifeDayData.interactions || [],
    isTrajectoryDeviation: lifeDayData.isTrajectoryDeviation || false,
    deviationContext: lifeDayData.deviationContext || undefined,
  });

  // ── Update lastActive only after successful LifeDay creation ──
  // (updating earlier would reset the countdown even if simulation failed)
  agent.lastActive = new Date();
  await agent.save();

  return { isNewPersona, persona: isNewPersona ? persona : null, lifeDay, photoSource: photo.source };
}
