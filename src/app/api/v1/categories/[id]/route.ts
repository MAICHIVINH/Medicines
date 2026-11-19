import { NextRequest } from 'next/server';
import { categoryService, updateCategorySchema } from '@/modules/category/category.service';
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
    const category = await categoryService.getCategoryByIdOrSlug(id, Boolean(admin));
    return apiSuccess(category);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const admin = await requireAdminSession();
    const { id } = await context.params;
    const body = await req.json();
    const parsed = updateCategorySchema.parse(body);
    const ip = extractClientIp(req.headers);

    const updated = await categoryService.updateCategory(id, parsed, admin.adminId, ip);
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

    const deleted = await categoryService.deleteCategory(id, admin.adminId, ip);
    return apiSuccess(deleted);
  } catch (error) {
    return handleApiError(error);
  }
}

