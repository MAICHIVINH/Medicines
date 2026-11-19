import { NextRequest } from 'next/server';
import { attributeService, createAttributeSchema } from '@/modules/attribute/attribute.service';
import { getOptionalAdminSession, requireAdminSession } from '@/infrastructure/auth/guard';
import { apiSuccess, handleApiError } from '@/lib/errors';
import { extractClientIp } from '@/lib/utils';

export async function GET(req: NextRequest) {
  try {
    const admin = await getOptionalAdminSession();
    const { searchParams } = new URL(req.url);
    const includeInactive = admin ? searchParams.get('includeInactive') === 'true' : false;
    const filterableOnly = searchParams.get('filterableOnly') === 'true';

    const attributes = await attributeService.listAttributes({
      includeInactive,
      filterableOnly,
    });

    return apiSuccess(attributes);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdminSession();
    const body = await req.json();
    const parsed = createAttributeSchema.parse(body);
    const ip = extractClientIp(req.headers);

    const created = await attributeService.createAttribute(parsed, admin.adminId, ip);
    return apiSuccess(created, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

