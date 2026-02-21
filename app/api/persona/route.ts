import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import Agent from '@/lib/models/Agent';
import Persona from '@/lib/models/Persona';
import { successResponse, errorResponse, extractApiKey } from '@/lib/utils/api-helpers';

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const apiKey = extractApiKey(req.headers.get('authorization'));
    if (!apiKey) return errorResponse('Missing API key', 'Include Authorization: Bearer YOUR_API_KEY', 401);

    const agent = await Agent.findOne({ apiKey });
    if (!agent) return errorResponse('Invalid API key', 'Agent not found', 401);

    const existing = await Persona.findOne({ agentId: agent._id });
    if (existing) return errorResponse('Persona already exists', 'Use PATCH /api/persona/framework to update your life framework', 409);

    const body = await req.json();
    const { displayName, birthPlace, birthDate, lifeFramework } = body;

    if (!displayName || !birthPlace || !birthDate || !lifeFramework) {
      return errorResponse('Missing fields', 'Provide displayName, birthPlace, birthDate, lifeFramework', 400);
    }

    const persona = await Persona.create({
      agentId: agent._id,
      agentName: agent.name,
      displayName,
      birthPlace,
      birthDate: new Date(birthDate),
      lifeFramework,
      frameworkVersion: 1,
      frameworkHistory: [],
    });

    agent.lastActive = new Date();
    await agent.save();

    return successResponse({ persona }, 201);
  } catch (error: any) {
    return errorResponse('Failed to create persona', error.message, 500);
  }
}

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const apiKey = extractApiKey(req.headers.get('authorization'));
    if (!apiKey) return errorResponse('Missing API key', 'Include Authorization: Bearer YOUR_API_KEY', 401);

    const agent = await Agent.findOne({ apiKey });
    if (!agent) return errorResponse('Invalid API key', 'Agent not found', 401);

    const persona = await Persona.findOne({ agentId: agent._id });
    if (!persona) return errorResponse('No persona found', 'Create one with POST /api/persona', 404);

    return successResponse({ persona });
  } catch (error: any) {
    return errorResponse('Failed to fetch persona', error.message, 500);
  }
}
