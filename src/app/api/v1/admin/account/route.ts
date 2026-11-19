import { NextRequest } from 'next/server';
import { adminAuthService, updateAdminProfileSchema } from '@/modules/auth/auth.service';
import { requireAdminSession } from '@/infrastructure/auth/guard';
import { apiSuccess, handleApiError } from '@/lib/errors';
import { extractClientIp } from '@/lib/utils';

export async function GET() {
  try {
    const admin = await requireAdminSession();
    const profile = await adminAuthService.getAccountProfile(admin.adminId);
    return apiSuccess(profile);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const admin = await requireAdminSession();
    const body = await req.json();
    const parsed = updateAdminProfileSchema.parse(body);
    const ip = extractClientIp(req.headers);

    const updated = await adminAuthService.updateAccountProfile(
      admin.adminId,
      parsed,
      ip
    );
    return apiSuccess(updated);
  } catch (error) {
    return handleApiError(error);
  }
}

