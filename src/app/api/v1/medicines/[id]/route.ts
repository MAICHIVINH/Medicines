import { NextRequest } from 'next/server';
import { medicineService, updateMedicineSchema } from '@/modules/medicine/medicine.service';
import { getOptionalAdminSession, requireAdminSession } from '@/infrastructure/auth/guard';
import { apiSuccess, handleApiError } from '@/lib/errors';
import { extractClientIp } from '@/lib/utils';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const admin = await getOptionalAdminSession();
    const { searchParams } = new URL(req.url);
    const includeUnpublished = admin ? searchParams.get('includeUnpublished') !== 'false' : false;

    const medicine = await medicineService.getMedicineDetail(id, includeUnpublished);
    return apiSuccess(medicine);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const admin = await requireAdminSession();
    const { id } = await context.params;
    const body = await req.json();
    const parsed = updateMedicineSchema.parse(body);
    const ip = extractClientIp(req.headers);

    const updated = await medicineService.updateMedicine(id, parsed, admin.adminId, ip);
    return apiSuccess(updated);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const admin = await requireAdminSession();
    const { id } = await context.params;
    const ip = extractClientIp(req.headers);

    const deleted = await medicineService.deleteMedicine(id, admin.adminId, ip);
    return apiSuccess(deleted);
  } catch (error) {
    return handleApiError(error);
  }
}

