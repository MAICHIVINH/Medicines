import { NextRequest } from 'next/server';
import { adminAuthService, changeAdminPasswordSchema } from '@/modules/auth/auth.service';
import { requireAdminSession } from '@/infrastructure/auth/guard';
import { apiSuccess, handleApiError } from '@/lib/errors';
import { extractClientIp } from '@/lib/utils';

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdminSession();
    const body = await req.json();
    const parsed = changeAdminPasswordSchema.parse(body);
    const ip = extractClientIp(req.headers);

    const result = await adminAuthService.changePassword(admin.adminId, parsed, ip);
    return apiSuccess(result);
  } catch (error) {
    return handleApiError(error);
  }
}

