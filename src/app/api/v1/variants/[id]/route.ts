import { NextRequest } from 'next/server';
import { variantService, updateVariantSchema } from '@/modules/variant/variant.service';
import { requireAdminSession } from '@/infrastructure/auth/guard';
import { apiSuccess, handleApiError } from '@/lib/errors';
import { extractClientIp } from '@/lib/utils';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const admin = await requireAdminSession();
    const { id } = await context.params;
    const body = await req.json();
    const parsed = updateVariantSchema.parse(body);
    const ip = extractClientIp(req.headers);

    const updated = await variantService.updateVariant(id, parsed, admin.adminId, ip);
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

    const deleted = await variantService.deleteVariant(id, admin.adminId, ip);
    return apiSuccess(deleted);
  } catch (error) {
    return handleApiError(error);
  }
}

