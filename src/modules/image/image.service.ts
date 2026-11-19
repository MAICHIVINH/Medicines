import { z } from 'zod';
import { prisma, ensureDatabaseConfigured } from '@/infrastructure/database/prisma';
import {
  neonStorageService,
  buildMedicineObjectKey,
  MAX_IMAGE_FILE_SIZE_BYTES,
} from '@/infrastructure/storage/neon-storage.service';
import { NotFoundError } from '@/lib/errors';
import { logger } from '@/lib/logger';

export const updateImageMetadataSchema = z.object({
  isPrimary: z.boolean().optional(),
  sortOrder: z.coerce.number().int().min(0).optional(),
  medicineVariantId: z.string().uuid().nullable().optional(),
});

export interface UploadMedicineImageParams {
  medicineId: string;
  medicineVariantId?: string | null;
  fileBuffer: Buffer;
  originalFileName: string;
  isPrimary?: boolean;
  sortOrder?: number;
  adminId: string;
  ipAddress?: string;
}

export class ImageRepository {
  public async findByMedicineId(medicineId: string) {
    return prisma.medicineImage.findMany({
      where: { medicineId },
      orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  public async findById(id: string) {
    return prisma.medicineImage.findUnique({
      where: { id },
    });
  }
}

export class ImageService {
  constructor(private readonly repo = new ImageRepository()) {}

  public async listMedicineImages(medicineId: string) {
    ensureDatabaseConfigured();
    const images = await this.repo.findByMedicineId(medicineId);

    // Đảm bảo trả về URL hiển thị hợp lệ (Public URL hoặc Presigned URL tùy cấu hình)
    const resolved = await Promise.all(
      images.map(async (img) => {
        const displayUrl = await neonStorageService.getObjectUrl({
          objectKey: img.objectKey,
          bucketName: img.bucketName,
          publicUrl: img.publicUrl,
        });
        return {
          ...img,
          displayUrl,
        };
      })
    );

    return resolved;
  }

  /**
   * 7.3. Quy trình upload chuẩn 10 bước:
   * 1. Admin chọn ảnh -> 2. Server xác thực session -> 3. Kiểm tra dữ liệu file ->
   * 4. Kiểm tra MIME type thực tế -> 5. Kiểm tra dung lượng ->
   * 6. Upload lên Neon Object Storage -> 7. Nhận kết quả upload ->
   * 8. Lưu metadata vào MedicineImages (nếu lỗi DB thì rollback xóa object S3 tránh mồ côi) ->
   * 9. Trả kết quả -> 10. Cập nhật danh sách ảnh.
   */
  public async uploadMedicineImage(params: UploadMedicineImageParams) {
    ensureDatabaseConfigured();

    // Bước 3, 4, 5: Kiểm tra kích thước và MIME type thực tế từ Magic Bytes
    const validated = neonStorageService.validateFile(
      params.fileBuffer,
      MAX_IMAGE_FILE_SIZE_BYTES
    );

    const medicine = await prisma.medicine.findUnique({
      where: { id: params.medicineId },
    });
    if (!medicine || medicine.deletedAt) {
      throw new NotFoundError('Không tìm thấy thuốc để tải ảnh lên.');
    }

    if (params.medicineVariantId) {
      const variant = await prisma.medicineVariant.findUnique({
        where: { id: params.medicineVariantId },
      });
      if (!variant || variant.medicineId !== params.medicineId) {
        throw new NotFoundError('Biến thể được chọn không thuộc về thuốc này.');
      }
    }

    const existingCount = await prisma.medicineImage.count({
      where: {
        medicineId: params.medicineId,
        medicineVariantId: params.medicineVariantId ?? null,
      },
    });

    const shouldBePrimary = params.isPrimary ?? existingCount === 0;
    const sortOrder = params.sortOrder ?? existingCount + 1;

    const objectKey = buildMedicineObjectKey({
      medicineId: params.medicineId,
      medicineVariantId: params.medicineVariantId,
      isPrimary: shouldBePrimary,
      sequenceNumber: existingCount + 1,
      extension: validated.extension,
    });

    // Bước 6 & 7: Upload lên Neon Object Storage
    const s3Result = await neonStorageService.uploadObject({
      objectKey,
      buffer: params.fileBuffer,
      contentType: validated.detectedMimeType,
      fileName: params.originalFileName,
    });

    // Bước 8: Lưu metadata vào PostgreSQL trong Transaction. Nếu DB thất bại, dọn dẹp S3 ngay lập tức.
    try {
      const createdImage = await prisma.$transaction(async (tx) => {
        if (shouldBePrimary) {
          // Một thuốc hoặc một biến thể chỉ có một ảnh đại diện trong phạm vi tương ứng (4.3)
          await tx.medicineImage.updateMany({
            where: {
              medicineId: params.medicineId,
              medicineVariantId: params.medicineVariantId ?? null,
              isPrimary: true,
            },
            data: { isPrimary: false },
          });
        }

        const record = await tx.medicineImage.create({
          data: {
            medicineId: params.medicineId,
            medicineVariantId: params.medicineVariantId ?? null,
            bucketName: s3Result.bucketName,
            objectKey: s3Result.objectKey,
            publicUrl: s3Result.publicUrl,
            fileName: params.originalFileName,
            mimeType: s3Result.mimeType,
            fileSize: s3Result.fileSize,
            isPrimary: shouldBePrimary,
            sortOrder,
          },
        });

        return record;
      });

      const displayUrl = await neonStorageService.getObjectUrl({
        objectKey: createdImage.objectKey,
        bucketName: createdImage.bucketName,
        publicUrl: createdImage.publicUrl,
      });

      return {
        ...createdImage,
        displayUrl,
      };
    } catch (dbError) {
      // Cơ chế dọn dẹp file mồ côi khi transaction DB thất bại
      logger.error('Database save failed after S3 upload; cleaning up orphan S3 object', dbError, {
        objectKey: s3Result.objectKey,
      });
      try {
        await neonStorageService.deleteObject(s3Result.objectKey, s3Result.bucketName);
      } catch (cleanupError) {
        logger.error('Failed to cleanup orphan S3 object', cleanupError, {
          objectKey: s3Result.objectKey,
        });
      }
      throw dbError;
    }
  }

  /**
   * Cập nhật metadata ảnh (Chọn ảnh đại diện, sắp xếp thứ tự, gán biến thể)
   */
  public async updateImageMetadata(
    imageId: string,
    input: z.infer<typeof updateImageMetadataSchema>,
    _adminId: string,
    _ipAddress?: string
  ) {
    ensureDatabaseConfigured();
    const validated = updateImageMetadataSchema.parse(input);
    const existing = await this.repo.findById(imageId);
    if (!existing) {
      throw new NotFoundError('Không tìm thấy hình ảnh cần cập nhật.');
    }

    const targetVariantId =
      validated.medicineVariantId !== undefined
        ? validated.medicineVariantId
        : existing.medicineVariantId;

    const updated = await prisma.$transaction(async (tx) => {
      if (validated.isPrimary === true) {
        await tx.medicineImage.updateMany({
          where: {
            medicineId: existing.medicineId,
            medicineVariantId: targetVariantId,
            id: { not: imageId },
            isPrimary: true,
          },
          data: { isPrimary: false },
        });
      }

      const record = await tx.medicineImage.update({
        where: { id: imageId },
        data: {
          ...(validated.isPrimary !== undefined ? { isPrimary: validated.isPrimary } : {}),
          ...(validated.sortOrder !== undefined ? { sortOrder: validated.sortOrder } : {}),
          ...(validated.medicineVariantId !== undefined
            ? { medicineVariantId: validated.medicineVariantId }
            : {}),
        },
      });

      return record;
    });

    const displayUrl = await neonStorageService.getObjectUrl({
      objectKey: updated.objectKey,
      bucketName: updated.bucketName,
      publicUrl: updated.publicUrl,
    });

    return {
      ...updated,
      displayUrl,
    };
  }

  /**
   * Thay thế tệp hình ảnh hiện có (Upload file mới -> Cập nhật record DB -> Xóa object cũ trên S3)
   */
  public async replaceImageFile(params: {
    imageId: string;
    fileBuffer: Buffer;
    originalFileName: string;
    adminId: string;
    ipAddress?: string;
  }) {
    ensureDatabaseConfigured();
    const existing = await this.repo.findById(params.imageId);
    if (!existing) {
      throw new NotFoundError('Không tìm thấy hình ảnh cần thay thế.');
    }

    const validated = neonStorageService.validateFile(
      params.fileBuffer,
      MAX_IMAGE_FILE_SIZE_BYTES
    );

    const newObjectKey = buildMedicineObjectKey({
      medicineId: existing.medicineId,
      medicineVariantId: existing.medicineVariantId,
      isPrimary: existing.isPrimary,
      sequenceNumber: existing.sortOrder || 1,
      extension: validated.extension,
    });

    const s3Result = await neonStorageService.uploadObject({
      objectKey: newObjectKey,
      buffer: params.fileBuffer,
      contentType: validated.detectedMimeType,
      fileName: params.originalFileName,
    });

    try {
      const updated = await prisma.medicineImage.update({
        where: { id: params.imageId },
        data: {
          bucketName: s3Result.bucketName,
          objectKey: s3Result.objectKey,
          publicUrl: s3Result.publicUrl,
          fileName: params.originalFileName,
          mimeType: s3Result.mimeType,
          fileSize: s3Result.fileSize,
        },
      });

      // Xóa object cũ trên S3 sau khi DB đã trỏ sang object mới an toàn
      try {
        await neonStorageService.deleteObject(existing.objectKey, existing.bucketName);
      } catch (oldDeleteError) {
        logger.warn('Failed to delete old S3 object after replacement', {
          oldObjectKey: existing.objectKey,
          error: String(oldDeleteError),
        });
      }

      const displayUrl = await neonStorageService.getObjectUrl({
        objectKey: updated.objectKey,
        bucketName: updated.bucketName,
        publicUrl: updated.publicUrl,
      });

      return {
        ...updated,
        displayUrl,
      };
    } catch (dbError) {
      // Nếu DB update lỗi thì xóa object mới vừa upload
      await neonStorageService.deleteObject(s3Result.objectKey, s3Result.bucketName).catch(() => {});
      throw dbError;
    }
  }

  /**
   * 7.4. Quy trình xóa ảnh an toàn:
   * - Kiểm tra quyền Admin (thực hiện ở Route Handler)
   * - Kiểm tra object tồn tại và xóa object trên Neon Object Storage
   * - Xóa metadata trong PostgreSQL và nếu ảnh bị xóa là ảnh đại diện thì tự động đôn ảnh kế tiếp lên làm ảnh đại diện
   */
  public async deleteImage(imageId: string, _adminId: string, _ipAddress?: string) {
    ensureDatabaseConfigured();
    const existing = await this.repo.findById(imageId);
    if (!existing) {
      throw new NotFoundError('Không tìm thấy hình ảnh cần xóa.');
    }

    // Xóa object trên Neon Object Storage trước
    await neonStorageService.deleteObject(existing.objectKey, existing.bucketName);

    await prisma.$transaction(async (tx) => {
      await tx.medicineImage.delete({
        where: { id: imageId },
      });

      if (existing.isPrimary) {
        const nextCandidate = await tx.medicineImage.findFirst({
          where: {
            medicineId: existing.medicineId,
            medicineVariantId: existing.medicineVariantId,
          },
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        });

        if (nextCandidate) {
          await tx.medicineImage.update({
            where: { id: nextCandidate.id },
            data: { isPrimary: true },
          });
        }
      }
    });

    return { deleted: true, id: imageId };
  }
}

export const imageRepository = new ImageRepository();
export const imageService = new ImageService(imageRepository);

