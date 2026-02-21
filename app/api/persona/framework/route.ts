import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import Agent from '@/lib/models/Agent';
import Persona from '@/lib/models/Persona';
import { successResponse, errorResponse, extractApiKey } from '@/lib/utils/api-helpers';

export async function PATCH(req: NextRequest) {
  try {
    await connectDB();
    const apiKey = extractApiKey(req.headers.get('authorization'));
    if (!apiKey) return errorResponse('Missing API key', 'Include Authorization: Bearer YOUR_API_KEY', 401);

    const agent = await Agent.findOne({ apiKey });
    if (!agent) return errorResponse('Invalid API key', 'Agent not found', 401);

    const persona = await Persona.findOne({ agentId: agent._id });
    if (!persona) return errorResponse('No persona found', 'Create one with POST /api/persona', 404);

    const body = await req.json();
    const { lifeFramework, reason, attractedToAgent } = body;

    if (!lifeFramework || !reason || !attractedToAgent) {
      return errorResponse('Missing fields', 'Provide lifeFramework, reason, attractedToAgent', 400);
    }

    // Record the old framework in history
    persona.frameworkHistory.push({
      version: persona.frameworkVersion,
      changedAt: new Date(),
      reason,
      attractedToAgent,
      previousFramework: persona.lifeFramework,
    });

    persona.lifeFramework = lifeFramework;
    persona.frameworkVersion += 1;

    await persona.save();

    agent.lastActive = new Date();
    await agent.save();

    return successResponse({
      frameworkVersion: persona.frameworkVersion,
      lifeFramework: persona.lifeFramework,
      historyEntries: persona.frameworkHistory.length,
    });
  } catch (error: any) {
    return errorResponse('Failed to update framework', error.message, 500);
  }
}
