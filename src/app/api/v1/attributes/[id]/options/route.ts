import { NextRequest } from 'next/server';
import { attributeService, createAttributeOptionSchema } from '@/modules/attribute/attribute.service';
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
    const includeInactive = admin ? searchParams.get('includeInactive') === 'true' : false;

    const options = await attributeService.listOptions(id, includeInactive);
    return apiSuccess(options);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const admin = await requireAdminSession();
    const { id } = await context.params;
    const body = await req.json();
    const parsed = createAttributeOptionSchema.parse(body);
    const ip = extractClientIp(req.headers);

    const created = await attributeService.createOption(id, parsed, admin.adminId, ip);
    return apiSuccess(created, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

