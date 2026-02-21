import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import Settings from '@/lib/models/Settings';
import { successResponse, errorResponse } from '@/lib/utils/api-helpers';

export async function GET() {
  try {
    await connectDB();
    const settings = await Settings.findOne({ key: 'global' }).lean();
    return successResponse({
      flickrApiKey: settings?.flickrApiKey || null,
    });
  } catch (error: any) {
    return errorResponse('Failed to fetch settings', error.message, 500);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const update: any = {};
    if (body.flickrApiKey !== undefined) update.flickrApiKey = body.flickrApiKey;

    const settings = await Settings.findOneAndUpdate(
      { key: 'global' },
      { $set: update },
      { upsert: true, new: true }
    );

    return successResponse({ flickrApiKey: settings.flickrApiKey || null });
  } catch (error: any) {
    return errorResponse('Failed to update settings', error.message, 500);
  }
}
