import { NextRequest } from 'next/server';
import { imageService } from '@/modules/image/image.service';
import { requireAdminSession } from '@/infrastructure/auth/guard';
import { AppError, apiSuccess, handleApiError } from '@/lib/errors';
import { extractClientIp } from '@/lib/utils';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const images = await imageService.listMedicineImages(id);
    return apiSuccess(images);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const admin = await requireAdminSession();
    const { id: medicineId } = await context.params;
    const ip = extractClientIp(req.headers);

    const formData = await req.formData();
    const medicineVariantId = formData.get('medicineVariantId');
    const isPrimaryRaw = formData.get('isPrimary');

    const files =
      formData.getAll('files').length > 0
        ? formData.getAll('files')
        : formData.get('file')
          ? [formData.get('file')]
          : [];

    if (files.length === 0) {
      throw new AppError(
        'Vui lòng chọn ít nhất một tệp hình ảnh để tải lên.',
        400,
        'NO_FILE_UPLOADED'
      );
    }

    const uploadedResults = [];
    for (let index = 0; index < files.length; index++) {
      const entry = files[index];
      if (!(entry instanceof File)) {
        throw new AppError('Dữ liệu tệp tải lên không hợp lệ.', 400, 'INVALID_FILE_ENTRY');
      }

      const arrayBuffer = await entry.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const uploaded = await imageService.uploadMedicineImage({
        medicineId,
        medicineVariantId:
          medicineVariantId && typeof medicineVariantId === 'string' && medicineVariantId.trim()
            ? medicineVariantId.trim()
            : null,
        fileBuffer: buffer,
        originalFileName: entry.name || `image-${index + 1}`,
        isPrimary: index === 0 && isPrimaryRaw === 'true' ? true : undefined,
        adminId: admin.adminId,
        ipAddress: ip,
      });

      uploadedResults.push(uploaded);
    }

    return apiSuccess(uploadedResults, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

