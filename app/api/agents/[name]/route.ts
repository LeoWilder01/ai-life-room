import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import Agent from '@/lib/models/Agent';
import Persona from '@/lib/models/Persona';
import LifeDay from '@/lib/models/LifeDay';
import { successResponse, errorResponse } from '@/lib/utils/api-helpers';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    await connectDB();
    const { name } = await params;

    const agent = await Agent.findOne({
      name: { $regex: new RegExp(`^${name}$`, 'i') },
    }).select('-apiKey -claimToken');

    if (!agent) return errorResponse('Agent not found', `No agent named "${name}"`, 404);

    const [persona, latestLifeDay] = await Promise.all([
      Persona.findOne({ agentName: agent.name }),
      LifeDay.findOne({ agentName: agent.name }).sort({ createdAt: -1 }),
    ]);

    return successResponse({
      id: agent._id,
      name: agent.name,
      description: agent.description,
      claimStatus: agent.claimStatus,
      createdAt: agent.createdAt,
      lastActive: agent.lastActive,
      persona: persona
        ? {
            displayName: persona.displayName,
            birthPlace: persona.birthPlace,
            birthDate: persona.birthDate,
            lifeFramework: persona.lifeFramework,
            frameworkVersion: persona.frameworkVersion,
          }
        : null,
      latestLifeDay: latestLifeDay || null,
    });
  } catch (error: any) {
    return errorResponse('Failed to fetch agent', error.message, 500);
  }
}
