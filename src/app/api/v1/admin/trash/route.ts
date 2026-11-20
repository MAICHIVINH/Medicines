import { NextRequest } from 'next/server';
import { requireAdminSession } from '@/infrastructure/auth/guard';
import { medicineService } from '@/modules/medicine/medicine.service';
import { categoryService } from '@/modules/category/category.service';
import { apiSuccess, handleApiError } from '@/lib/errors';

export async function GET() {
  try {
    await requireAdminSession();

    const [medicines, categories] = await Promise.all([
      medicineService.getTrashMedicines(),
      categoryService.getTrashCategories(),
    ]);

    return apiSuccess({
      medicines,
      categories,
      totalCount: medicines.length + categories.length,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await requireAdminSession();
    const { searchParams } = new URL(req.url);
    const target = searchParams.get('target') || 'all';

    let deletedMedicines = 0;
    let deletedCategories = 0;

    if (target === 'all' || target === 'medicine') {
      const resMed = await medicineService.emptyMedicineTrash();
      deletedMedicines = resMed.count;
    }

    if (target === 'all' || target === 'category') {
      const resCat = await categoryService.emptyCategoryTrash();
      deletedCategories = resCat.count;
    }

    return apiSuccess({
      message: 'Đã dọn sạch thùng rác thành công!',
      deletedMedicines,
      deletedCategories,
      totalDeleted: deletedMedicines + deletedCategories,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

