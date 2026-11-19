import { NextRequest } from 'next/server';
import { categoryService, createCategorySchema } from '@/modules/category/category.service';
import { getOptionalAdminSession, requireAdminSession } from '@/infrastructure/auth/guard';
import { apiSuccess, handleApiError } from '@/lib/errors';
import { extractClientIp } from '@/lib/utils';

export async function GET(req: NextRequest) {
  try {
    const admin = await getOptionalAdminSession();
    const { searchParams } = new URL(req.url);
    const includeInactive = admin ? searchParams.get('includeInactive') === 'true' : false;
    const includeDeleted = admin ? searchParams.get('includeDeleted') === 'true' : false;
    const search = searchParams.get('search') || undefined;

    const categories = await categoryService.listCategories({
      includeInactive,
      includeDeleted,
      search,
    });

    return apiSuccess(categories);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdminSession();
    const body = await req.json();
    const parsed = createCategorySchema.parse(body);
    const ip = extractClientIp(req.headers);

    const created = await categoryService.createCategory(parsed, admin.adminId, ip);
    return apiSuccess(created, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

