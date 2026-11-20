import { NextRequest } from 'next/server';
import { requireAdminSession } from '@/infrastructure/auth/guard';
import { medicineService } from '@/modules/medicine/medicine.service';
import { categoryService } from '@/modules/category/category.service';
import { apiSuccess, handleApiError, AppError } from '@/lib/errors';

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdminSession();
    const body = await req.json();
    const { type, id } = body;

    if (!type || !id) {
      throw new AppError('Vui lòng cung cấp loại dữ liệu (type) và mã định danh (id).', 400);
    }

    if (type === 'medicine') {
      const restored = await medicineService.restoreMedicine(id, admin.adminId);
      return apiSuccess({
        message: `Đã khôi phục thuốc "${restored.name}" thành công!`,
        item: restored,
      });
    }

    if (type === 'category') {
      const restored = await categoryService.restoreCategory(id, admin.adminId);
      return apiSuccess({
        message: `Đã khôi phục danh mục "${restored.name}" thành công!`,
        item: restored,
      });
    }

    throw new AppError('Loại dữ liệu khôi phục không hợp lệ (hỗ trợ "medicine" hoặc "category").', 400);
  } catch (error) {
    return handleApiError(error);
  }
}

