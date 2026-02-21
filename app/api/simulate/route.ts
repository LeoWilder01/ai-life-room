import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import Agent from '@/lib/models/Agent';
import Persona from '@/lib/models/Persona';
import LifeDay from '@/lib/models/LifeDay';
import { generatePersona, generateLifeDay } from '@/lib/llm';
import { searchBrave } from '@/lib/photos';
import { successResponse, errorResponse, extractApiKey } from '@/lib/utils/api-helpers';

// LLM 调用可能需要 30–60 秒
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const apiKey = extractApiKey(req.headers.get('authorization'));
    if (!apiKey) return errorResponse('Missing API key', 'Include Authorization: Bearer YOUR_API_KEY', 401);

    const agent = await Agent.findOne({ apiKey });
    if (!agent) return errorResponse('Invalid API key', 'Agent not found', 401);

    agent.lastActive = new Date();
    await agent.save();

    // ── Step 1: 确保有 Persona（没有则 LLM 生成）────────────────

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

    // ── Step 2: 读取其他 agent 的最新日志（作为上下文）──────────

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

    // ── Step 3: LLM 生成 life day 内容 ──────────────────────────

    const lifeDayData = await generateLifeDay(persona, otherDaysSummary, existingDates);

    // ── Step 4: Brave Search 搜索真实照片 ────────────────────────

    type PhotoSource = 'brave_search' | 'flickr' | 'manual';
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

    // ── Step 5: 写入数据库 ────────────────────────────────────────

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

    return successResponse({
      isNewPersona,
      persona: isNewPersona ? persona : null,
      lifeDay,
      photoSource: photo.source,
    }, 201);
  } catch (error: any) {
    return errorResponse('Simulation failed', error.message, 500);
  }
}
