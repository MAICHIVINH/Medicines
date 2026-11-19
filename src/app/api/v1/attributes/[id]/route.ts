import { NextRequest } from 'next/server';
import { attributeService, updateAttributeSchema } from '@/modules/attribute/attribute.service';
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
    const parsed = updateAttributeSchema.parse(body);
    const ip = extractClientIp(req.headers);

    const updated = await attributeService.updateAttribute(id, parsed, admin.adminId, ip);
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

    const result = await attributeService.deleteOrDeactivateAttribute(id, admin.adminId, ip);
    return apiSuccess(result);
  } catch (error) {
    return handleApiError(error);
  }
}

