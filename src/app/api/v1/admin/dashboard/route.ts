import { medicineService } from '@/modules/medicine/medicine.service';
import { requireAdminSession } from '@/infrastructure/auth/guard';
import { apiSuccess, handleApiError } from '@/lib/errors';

export async function GET() {
  try {
    await requireAdminSession();
    const stats = await medicineService.getAdminDashboardStats();
    return apiSuccess(stats);
  } catch (error) {
    return handleApiError(error);
  }
}

