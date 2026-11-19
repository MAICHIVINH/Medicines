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

    const unpublished = await medicineService.unpublishMedicine(id, admin.adminId, ip);
    return apiSuccess(unpublished);
  } catch (error) {
    return handleApiError(error);
  }
}

