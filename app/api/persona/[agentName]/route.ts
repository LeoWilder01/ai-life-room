import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import Persona from '@/lib/models/Persona';
import { successResponse, errorResponse } from '@/lib/utils/api-helpers';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ agentName: string }> }
) {
  try {
    await connectDB();
    const { agentName } = await params;

    const persona = await Persona.findOne({
      agentName: { $regex: new RegExp(`^${agentName}$`, 'i') },
    });

    if (!persona) return errorResponse('Persona not found', `No persona for agent "${agentName}"`, 404);

    return successResponse({ persona });
  } catch (error: any) {
    return errorResponse('Failed to fetch persona', error.message, 500);
  }
}
