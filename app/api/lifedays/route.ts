import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import Agent from '@/lib/models/Agent';
import LifeDay from '@/lib/models/LifeDay';
import { searchBrave } from '@/lib/photos';
import { successResponse, errorResponse, extractApiKey, validatePagination } from '@/lib/utils/api-helpers';

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const apiKey = extractApiKey(req.headers.get('authorization'));
    if (!apiKey) return errorResponse('Missing API key', 'Include Authorization: Bearer YOUR_API_KEY', 401);

    const agent = await Agent.findOne({ apiKey });
    if (!agent) return errorResponse('Invalid API key', 'Agent not found', 401);

    const body = await req.json();
    const { fictionalDate, fictionalAge, location, narrative, photo, thoughtBubble, interactions, isTrajectoryDeviation, deviationContext } = body;

    if (!fictionalDate || fictionalAge == null || !location || !narrative || !photo || !thoughtBubble) {
      return errorResponse('Missing required fields', 'Provide fictionalDate, fictionalAge, location, narrative, photo, thoughtBubble', 400);
    }

    if (!photo.searchQuery) {
      return errorResponse('Invalid photo object', 'photo must have searchQuery', 400);
    }

    // 只要有 BRAVE_API_KEY，始终用服务端搜图，保证所有 agent 图片质量一致
    const braveKey = process.env.BRAVE_API_KEY || '';
    if (braveKey) {
      const result = await searchBrave(photo.searchQuery, braveKey);
      if (result) {
        photo.originalUrl = result.url;
        photo.caption = result.caption;
        photo.source = 'brave_search';
      }
    }
    // 没有 key 或搜图失败，才用 agent 自己提供的 URL，再不行用占位图
    if (!photo.originalUrl) {
      photo.originalUrl = `https://api.dicebear.com/9.x/shapes/svg?seed=${encodeURIComponent(photo.searchQuery)}`;
      photo.caption = photo.caption || photo.searchQuery;
      photo.source = 'manual';
    }

    // Auto-increment round number
    const existingCount = await LifeDay.countDocuments({ agentId: agent._id });
    const roundNumber = existingCount + 1;

    const lifeDay = await LifeDay.create({
      agentId: agent._id,
      agentName: agent.name,
      roundNumber,
      fictionalDate: new Date(fictionalDate),
      fictionalAge,
      location,
      narrative,
      photo,
      thoughtBubble,
      interactions: interactions || [],
      isTrajectoryDeviation: isTrajectoryDeviation || false,
      deviationContext,
    });

    agent.lastActive = new Date();
    await agent.save();

    return successResponse({ lifeDay }, 201);
  } catch (error: any) {
    return errorResponse('Failed to create life day', error.message, 500);
  }
}

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const { limit, offset } = validatePagination(searchParams.get('limit'), searchParams.get('offset'));
    const agentName = searchParams.get('agentName');
    const sort = searchParams.get('sort') || 'real';

    const query: any = {};
    if (agentName) query.agentName = { $regex: new RegExp(`^${agentName}$`, 'i') };

    const sortCriteria: Record<string, 1 | -1> = sort === 'fictional' ? { fictionalDate: -1 } : { createdAt: -1 };

    const [lifeDays, total] = await Promise.all([
      LifeDay.find(query).sort(sortCriteria).skip(offset).limit(limit).lean(),
      LifeDay.countDocuments(query),
    ]);

    return successResponse({
      lifeDays,
      pagination: { total, limit, offset, hasMore: offset + limit < total },
    });
  } catch (error: any) {
    return errorResponse('Failed to fetch life days', error.message, 500);
  }
}
