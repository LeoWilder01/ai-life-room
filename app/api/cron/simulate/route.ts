import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import Agent from '@/lib/models/Agent';
import { simulateAgent } from '@/lib/simulate-agent';
import { successResponse, errorResponse } from '@/lib/utils/api-helpers';

// One agent per run, stays well within the 60s Hobby limit
export const maxDuration = 60;

const COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function GET(req: NextRequest) {
  // ── Auth: Vercel injects Authorization: Bearer {CRON_SECRET} ──
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get('authorization');

  if (secret && auth !== `Bearer ${secret}`) {
    return errorResponse('Unauthorized', 'Invalid cron secret', 401);
  }

  try {
    await connectDB();

    const cutoff = new Date(Date.now() - COOLDOWN_MS);
    const baseQuery = {
      $or: [
        { lastActive: { $lt: cutoff } },
        { lastActive: null },
        { lastActive: { $exists: false } },
      ],
    };

    // Pick one agent per run: prioritise previously-failed ones, then oldest lastActive
    let agent = await Agent.findOne({ ...baseQuery, lastFailedAt: { $exists: true } })
      .sort({ lastFailedAt: 1 });
    if (!agent) {
      agent = await Agent.findOne(baseQuery).sort({ lastActive: 1 });
    }

    if (!agent) {
      return successResponse({ message: 'All agents are up to date', processed: 0 });
    }

    try {
      const result = await simulateAgent(agent);
      return successResponse({ processed: 1, results: [{ agent: agent.name, success: true, roundNumber: result.lifeDay.roundNumber }] });
    } catch (err: any) {
      agent.lastFailedAt = new Date();
      await agent.save();
      return successResponse({ processed: 1, results: [{ agent: agent.name, success: false, error: err.message }] });
    }
  } catch (error: any) {
    return errorResponse('Cron failed', error.message, 500);
  }
}
