import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import LifeDay from '@/lib/models/LifeDay';
import { successResponse, errorResponse } from '@/lib/utils/api-helpers';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ agentName: string }> }
) {
  try {
    await connectDB();
    const { agentName } = await params;

    const lifeDays = await LifeDay.find({
      agentName: { $regex: new RegExp(`^${agentName}$`, 'i') },
    })
      .sort({ fictionalDate: 1 })
      .lean();

    return successResponse({ agentName, lifeDays });
  } catch (error: any) {
    return errorResponse('Failed to fetch timeline', error.message, 500);
  }
}
