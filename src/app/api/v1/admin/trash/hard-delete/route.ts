import { NextRequest } from 'next/server';
import { requireAdminSession } from '@/infrastructure/auth/guard';
import { medicineService } from '@/modules/medicine/medicine.service';
import { categoryService } from '@/modules/category/category.service';
import { apiSuccess, handleApiError, AppError } from '@/lib/errors';

export async function POST(req: NextRequest) {
  try {
    await requireAdminSession();
    const body = await req.json();
    const { type, id } = body;

    if (!type || !id) {
      throw new AppError('Vui lòng cung cấp loại dữ liệu (type) và mã định danh (id).', 400);
    }

    if (type === 'medicine') {
      const result = await medicineService.hardDeleteMedicine(id);
      return apiSuccess({
        message: `Đã xóa vĩnh viễn thuốc "${result.name}" và toàn bộ tệp tin liên quan khỏi hệ thống!`,
        result,
      });
    }

    if (type === 'category') {
      const result = await categoryService.hardDeleteCategory(id);
      return apiSuccess({
        message: `Đã xóa vĩnh viễn danh mục "${result.name}" khỏi cơ sở dữ liệu!`,
        result,
      });
    }

    throw new AppError('Loại dữ liệu cần xóa không hợp lệ (hỗ trợ "medicine" hoặc "category").', 400);
  } catch (error) {
    return handleApiError(error);
  }
}

