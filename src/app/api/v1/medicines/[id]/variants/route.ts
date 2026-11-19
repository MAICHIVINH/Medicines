import { NextRequest } from 'next/server';
import { variantService, createVariantSchema } from '@/modules/variant/variant.service';
import { getOptionalAdminSession, requireAdminSession } from '@/infrastructure/auth/guard';
import { apiSuccess, handleApiError } from '@/lib/errors';
import { extractClientIp } from '@/lib/utils';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const admin = await getOptionalAdminSession();
    const variants = await variantService.listVariantsByMedicine(id, Boolean(admin));
    return apiSuccess(variants);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const admin = await requireAdminSession();
    const { id } = await context.params;
    const body = await req.json();
    const parsed = createVariantSchema.parse(body);
    const ip = extractClientIp(req.headers);

    const created = await variantService.createVariant(id, parsed, admin.adminId, ip);
    return apiSuccess(created, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

