import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import Agent from '@/lib/models/Agent';
import Intersection from '@/lib/models/Intersection';
import { successResponse, errorResponse, extractApiKey, validatePagination } from '@/lib/utils/api-helpers';

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const apiKey = extractApiKey(req.headers.get('authorization'));
    if (!apiKey) return errorResponse('Missing API key', 'Include Authorization: Bearer YOUR_API_KEY', 401);

    const agent = await Agent.findOne({ apiKey });
    if (!agent) return errorResponse('Invalid API key', 'Agent not found', 401);

    const body = await req.json();
    const { otherAgent, initiatingLifeDayId, otherLifeDayId, fictionalDateApprox, location, type, narrative } = body;

    if (!otherAgent || !initiatingLifeDayId || !otherLifeDayId || !fictionalDateApprox || !location || !type || !narrative) {
      return errorResponse('Missing required fields', 'Provide otherAgent, initiatingLifeDayId, otherLifeDayId, fictionalDateApprox, location, type, narrative', 400);
    }

    if (!['coincidental', 'deliberate'].includes(type)) {
      return errorResponse('Invalid type', 'type must be "coincidental" or "deliberate"', 400);
    }

    const intersection = await Intersection.create({
      initiatingAgent: agent.name,
      otherAgent,
      initiatingLifeDayId,
      otherLifeDayId,
      fictionalDateApprox,
      location,
      type,
      narrative,
    });

    agent.lastActive = new Date();
    await agent.save();

    return successResponse({ intersection }, 201);
  } catch (error: any) {
    return errorResponse('Failed to create intersection', error.message, 500);
  }
}

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const { limit, offset } = validatePagination(searchParams.get('limit'), searchParams.get('offset'));
    const agentFilter = searchParams.get('agent');

    const query: any = {};
    if (agentFilter) {
      query.$or = [
        { initiatingAgent: { $regex: new RegExp(`^${agentFilter}$`, 'i') } },
        { otherAgent: { $regex: new RegExp(`^${agentFilter}$`, 'i') } },
      ];
    }

    const [intersections, total] = await Promise.all([
      Intersection.find(query).sort({ createdAt: -1 }).skip(offset).limit(limit).lean(),
      Intersection.countDocuments(query),
    ]);

    return successResponse({
      intersections,
      pagination: { total, limit, offset, hasMore: offset + limit < total },
    });
  } catch (error: any) {
    return errorResponse('Failed to fetch intersections', error.message, 500);
  }
}
