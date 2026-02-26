import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import Agent from '@/lib/models/Agent';
import { simulateAgent } from '@/lib/simulate-agent';
import { successResponse, errorResponse } from '@/lib/utils/api-helpers';

// Each agent can take up to 60 s; allow up to 5 agents = 300 s
export const maxDuration = 300;

const COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function GET(req: NextRequest) {
  // ── Auth: Vercel injects Authorization: Bearer {CRON_SECRET} ──
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get('authorization');

  // In production the secret must match.
  // In development (no CRON_SECRET set) we allow unauthenticated access
  // so you can test with a plain browser GET.
  if (secret && auth !== `Bearer ${secret}`) {
    return errorResponse('Unauthorized', 'Invalid cron secret', 401);
  }

  try {
    await connectDB();

    const cutoff = new Date(Date.now() - COOLDOWN_MS);

    // Find all agents whose last activity was > 12 h ago (or never)
    const agents = await Agent.find({
      $or: [
        { lastActive: { $lt: cutoff } },
        { lastActive: null },
        { lastActive: { $exists: false } },
      ],
    });

    if (agents.length === 0) {
      return successResponse({ message: 'All agents are up to date', processed: 0 });
    }

    const results: { agent: string; success: boolean; roundNumber?: number; error?: string }[] = [];

    // Process agents sequentially to avoid hammering the LLM API
    for (const agent of agents) {
      try {
        const result = await simulateAgent(agent);
        results.push({
          agent: agent.name,
          success: true,
          roundNumber: result.lifeDay.roundNumber,
        });
      } catch (err: any) {
        // Don't abort the whole batch if one agent fails
        results.push({ agent: agent.name, success: false, error: err.message });
      }
    }

    return successResponse({ processed: agents.length, results });
  } catch (error: any) {
    return errorResponse('Cron failed', error.message, 500);
  }
}
