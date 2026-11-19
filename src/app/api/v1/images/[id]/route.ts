import { NextRequest } from 'next/server';
import { imageService, updateImageMetadataSchema } from '@/modules/image/image.service';
import { requireAdminSession } from '@/infrastructure/auth/guard';
import { AppError, apiSuccess, handleApiError } from '@/lib/errors';
import { extractClientIp } from '@/lib/utils';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const admin = await requireAdminSession();
    const { id } = await context.params;
    const ip = extractClientIp(req.headers);

    const contentType = req.headers.get('content-type') || '';

    // Hỗ trợ cả thay thế file ảnh (multipart/form-data) và cập nhật metadata (application/json)
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file');
      if (!(file instanceof File)) {
        throw new AppError('Vui lòng chọn tệp hình ảnh mới để thay thế.', 400, 'MISSING_FILE');
      }

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const replaced = await imageService.replaceImageFile({
        imageId: id,
        fileBuffer: buffer,
        originalFileName: file.name || 'replaced-image',
        adminId: admin.adminId,
        ipAddress: ip,
      });

      return apiSuccess(replaced);
    }

    const body = await req.json();
    const parsed = updateImageMetadataSchema.parse(body);
    const updated = await imageService.updateImageMetadata(id, parsed, admin.adminId, ip);

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

    const deleted = await imageService.deleteImage(id, admin.adminId, ip);
    return apiSuccess(deleted);
  } catch (error) {
    return handleApiError(error);
  }
}

