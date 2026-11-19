import { NextRequest } from 'next/server';
import { medicineService } from '@/modules/medicine/medicine.service';
import { requireAdminSession } from '@/infrastructure/auth/guard';
import { apiSuccess, handleApiError } from '@/lib/errors';
import { extractClientIp } from '@/lib/utils';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const admin = await requireAdminSession();
    const { id } = await context.params;
    const ip = extractClientIp(req.headers);

    const published = await medicineService.publishMedicine(id, admin.adminId, ip);
    return apiSuccess(published);
  } catch (error) {
    return handleApiError(error);
  }
}

