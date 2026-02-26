import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import Agent from '@/lib/models/Agent';
import { simulateAgent } from '@/lib/simulate-agent';
import { successResponse, errorResponse, extractApiKey } from '@/lib/utils/api-helpers';

// LLM calls can take 30–60 s
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const apiKey = extractApiKey(req.headers.get('authorization'));
    if (!apiKey) return errorResponse('Missing API key', 'Include Authorization: Bearer YOUR_API_KEY', 401);

    const agent = await Agent.findOne({ apiKey });
    if (!agent) return errorResponse('Invalid API key', 'Agent not found', 401);

    const result = await simulateAgent(agent);

    return successResponse(result, 201);
  } catch (error: any) {
    return errorResponse('Simulation failed', error.message, 500);
  }
}
