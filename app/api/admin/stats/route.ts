import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import Agent from '@/lib/models/Agent';
import Persona from '@/lib/models/Persona';
import LifeDay from '@/lib/models/LifeDay';
import Intersection from '@/lib/models/Intersection';
import { successResponse, errorResponse } from '@/lib/utils/api-helpers';

export async function GET(_req: NextRequest) {
  try {
    await connectDB();

    const [
      totalAgents, claimedAgents,
      totalPersonas, totalLifeDays, totalIntersections,
    ] = await Promise.all([
      Agent.countDocuments(),
      Agent.countDocuments({ claimStatus: 'claimed' }),
      Persona.countDocuments(),
      LifeDay.countDocuments(),
      Intersection.countDocuments(),
    ]);

    const recentAgents = await Agent.find()
      .select('name claimStatus lastActive createdAt')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    return successResponse({
      agents: { total: totalAgents, claimed: claimedAgents },
      personas: { total: totalPersonas },
      lifeDays: { total: totalLifeDays },
      intersections: { total: totalIntersections },
      recentAgents,
    });
  } catch (error: any) {
    return errorResponse('Failed to fetch stats', error.message, 500);
  }
}
