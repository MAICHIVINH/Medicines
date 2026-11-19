import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getEnv, isS3StorageConfigured } from '@/config/env';
import { AppError, ServiceUnavailableError } from '@/lib/errors';
import { logger } from '@/lib/logger';

export const ALLOWED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export type AllowedImageMimeType = (typeof ALLOWED_IMAGE_MIME_TYPES)[number];

export const MAX_IMAGE_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export interface ValidatedFileInfo {
  detectedMimeType: AllowedImageMimeType;
  extension: 'jpg' | 'png' | 'webp';
  size: number;
}

export interface UploadObjectParams {
  objectKey: string;
  buffer: Buffer;
  contentType: AllowedImageMimeType;
  fileName: string;
}

export interface UploadObjectResult {
  bucketName: string;
  objectKey: string;
  publicUrl: string | null;
  mimeType: AllowedImageMimeType;
  fileSize: number;
}

/**
 * Phát hiện MIME type thực tế từ Magic Bytes (File Signature) của Buffer.
 * Không tin tưởng phần mở rộng file hoặc header Content-Type do trình duyệt gửi lên.
 */
export function detectImageMimeTypeFromBuffer(
  buffer: Buffer | Uint8Array
): { mimeType: AllowedImageMimeType; extension: 'jpg' | 'png' | 'webp' } | null {
  if (!buffer || buffer.length < 12) {
    return null;
  }

  // 1. JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { mimeType: 'image/jpeg', extension: 'jpg' };
  }

  // 2. PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { mimeType: 'image/png', extension: 'png' };
  }

  // 3. WebP: "RIFF" (52 49 46 46) at 0..3 and "WEBP" (57 45 42 50) at 8..11
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return { mimeType: 'image/webp', extension: 'webp' };
  }

  return null;
}

/**
 * Xây dựng Object Key chuẩn theo quy định PHẦN 7:
 * - medicines/{medicine-id}/main.{ext}
 * - medicines/{medicine-id}/image-{index}.{ext}
 * - variants/{variant-id}/main.{ext}
 * (Object key không lặp lại tên bucket `medicine-images`)
 */
export function buildMedicineObjectKey(params: {
  medicineId: string;
  medicineVariantId?: string | null;
  isPrimary: boolean;
  sequenceNumber?: number;
  extension: 'jpg' | 'png' | 'webp';
}): string {
  const { medicineId, medicineVariantId, isPrimary, sequenceNumber = 1, extension } = params;
  const uniqueSuffix = Date.now().toString(36);

  if (medicineVariantId) {
    return `variants/${medicineVariantId}/main-${uniqueSuffix}.${extension}`;
  }

  if (isPrimary) {
    return `medicines/${medicineId}/main-${uniqueSuffix}.${extension}`;
  }

  const paddedSeq = String(sequenceNumber).padStart(2, '0');
  return `medicines/${medicineId}/image-${paddedSeq}-${uniqueSuffix}.${extension}`;
}

export class NeonStorageService {
  private client: S3Client | null = null;

  private getS3Client(): S3Client {
    if (!isS3StorageConfigured()) {
      throw new ServiceUnavailableError(
        'Neon Object Storage (S3) chưa được cấu hình. Vui lòng thiết lập AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_ENDPOINT_URL_S3, AWS_REGION và S3_BUCKET_NAME trong file .env.',
        {
          missingVariables: [
            'AWS_ACCESS_KEY_ID',
            'AWS_SECRET_ACCESS_KEY',
            'AWS_ENDPOINT_URL_S3',
            'AWS_REGION',
            'S3_BUCKET_NAME',
          ],
        }
      );
    }

    if (!this.client) {
      const env = getEnv();
      this.client = new S3Client({
        region: env.AWS_REGION,
        endpoint: env.AWS_ENDPOINT_URL_S3,
        credentials: {
          accessKeyId: env.AWS_ACCESS_KEY_ID!,
          secretAccessKey: env.AWS_SECRET_ACCESS_KEY!,
        },
        // Neon Object Storage bắt buộc sử dụng Path-Style Addressing
        forcePathStyle: true,
      });
    }

    return this.client;
  }

  public getBucketName(): string {
    return getEnv().S3_BUCKET_NAME || 'medicine-images';
  }

  /**
   * 1. ValidateFile: Kiểm tra kích thước và MIME type thực tế từ Magic Bytes
   */
  public validateFile(
    buffer: Buffer,
    maxSizeBytes = MAX_IMAGE_FILE_SIZE_BYTES
  ): ValidatedFileInfo {
    if (!buffer || buffer.length === 0) {
      throw new AppError('Tệp hình ảnh rỗng hoặc không hợp lệ.', 400, 'EMPTY_FILE');
    }

    if (buffer.length > maxSizeBytes) {
      const maxMb = (maxSizeBytes / (1024 * 1024)).toFixed(1);
      throw new AppError(
        `Dung lượng ảnh vượt quá giới hạn cho phép (${maxMb} MB).`,
        400,
        'FILE_TOO_LARGE'
      );
    }

    const detected = detectImageMimeTypeFromBuffer(buffer);
    if (!detected) {
      throw new AppError(
        'Định dạng tệp không hợp lệ. Hệ thống chỉ chấp nhận hình ảnh thực tế định dạng JPEG, PNG hoặc WebP (kiểm tra qua chữ ký byte thực tế).',
        400,
        'INVALID_MIME_TYPE'
      );
    }

    return {
      detectedMimeType: detected.mimeType,
      extension: detected.extension,
      size: buffer.length,
    };
  }

  /**
   * 2. UploadObject: Tải tệp lên Neon Object Storage qua giao thức S3
   */
  public async uploadObject(params: UploadObjectParams): Promise<UploadObjectResult> {
    const validated = this.validateFile(params.buffer);
    const s3 = this.getS3Client();
    const bucketName = this.getBucketName();

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: params.objectKey,
      Body: params.buffer,
      ContentType: validated.detectedMimeType,
      ContentLength: validated.size,
      Metadata: {
        originalFileName: encodeURIComponent(params.fileName),
      },
    });

    await s3.send(command);

    const env = getEnv();
    const publicUrl =
      env.S3_BUCKET_ACCESS === 'public_read'
        ? this.buildPublicUrl(bucketName, params.objectKey)
        : null;

    logger.info('Uploaded object to Neon Object Storage', {
      bucketName,
      objectKey: params.objectKey,
      fileSize: validated.size,
      mimeType: validated.detectedMimeType,
    });

    return {
      bucketName,
      objectKey: params.objectKey,
      publicUrl,
      mimeType: validated.detectedMimeType,
      fileSize: validated.size,
    };
  }

  /**
   * 3. CheckObjectExists: Kiểm tra Object có tồn tại trên Neon Object Storage hay không
   */
  public async checkObjectExists(objectKey: string, bucketOverride?: string): Promise<boolean> {
    const s3 = this.getS3Client();
    const bucketName = bucketOverride || this.getBucketName();

    try {
      await s3.send(
        new HeadObjectCommand({
          Bucket: bucketName,
          Key: objectKey,
        })
      );
      return true;
    } catch (error: unknown) {
      if (typeof error === 'object' && error !== null && 'name' in error) {
        const errName = (error as { name?: string }).name;
        if (errName === 'NotFound' || errName === 'NoSuchKey') {
          return false;
        }
      }
      logger.warn('HeadObject check warning', { objectKey, error: String(error) });
      return false;
    }
  }

  /**
   * 4. DeleteObject: Xóa Object trên Neon Object Storage
   */
  public async deleteObject(objectKey: string, bucketOverride?: string): Promise<void> {
    const s3 = this.getS3Client();
    const bucketName = bucketOverride || this.getBucketName();

    const exists = await this.checkObjectExists(objectKey, bucketName);
    if (!exists) {
      logger.warn('Object does not exist on S3 during deletion; proceeding with metadata cleanup', {
        bucketName,
        objectKey,
      });
      return;
    }

    await s3.send(
      new DeleteObjectCommand({
        Bucket: bucketName,
        Key: objectKey,
      })
    );

    logger.info('Deleted object from Neon Object Storage', {
      bucketName,
      objectKey,
    });
  }

  /**
   * 5. GetPresignedDownloadUrl: Sinh Presigned URL đọc ảnh khi bucket ở chế độ private
   */
  public async getPresignedDownloadUrl(
    objectKey: string,
    expiresInSeconds = 3600,
    bucketOverride?: string
  ): Promise<string> {
    const s3 = this.getS3Client();
    const bucketName = bucketOverride || this.getBucketName();

    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: objectKey,
    });

    return getSignedUrl(s3, command, { expiresIn: expiresInSeconds });
  }

  /**
   * 6. GetPresignedUploadUrl: Sinh Presigned URL tải lên khi cần
   */
  public async getPresignedUploadUrl(
    objectKey: string,
    contentType: AllowedImageMimeType,
    expiresInSeconds = 900,
    bucketOverride?: string
  ): Promise<string> {
    const s3 = this.getS3Client();
    const bucketName = bucketOverride || this.getBucketName();

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: objectKey,
      ContentType: contentType,
    });

    return getSignedUrl(s3, command, { expiresIn: expiresInSeconds });
  }

  /**
   * 7. GetObjectUrl: Trả về URL hiển thị ảnh phù hợp với cấu hình `public_read` hoặc `private`
   */
  public async getObjectUrl(params: {
    objectKey: string;
    bucketName?: string;
    publicUrl?: string | null;
  }): Promise<string> {
    const env = getEnv();
    const bucketName = params.bucketName || this.getBucketName();

    if (params.publicUrl && env.S3_BUCKET_ACCESS === 'public_read') {
      return params.publicUrl;
    }

    if (env.S3_BUCKET_ACCESS === 'public_read' && env.AWS_ENDPOINT_URL_S3) {
      return this.buildPublicUrl(bucketName, params.objectKey);
    }

    if (isS3StorageConfigured()) {
      return this.getPresignedDownloadUrl(params.objectKey, 3600, bucketName);
    }

    return params.publicUrl || '';
  }

  private buildPublicUrl(bucketName: string, objectKey: string): string {
    const endpoint = (getEnv().AWS_ENDPOINT_URL_S3 || '').replace(/\/+$/, '');
    const cleanKey = objectKey.replace(/^\/+/, '');
    return `${endpoint}/${bucketName}/${cleanKey}`;
  }
}

export const neonStorageService = new NeonStorageService();

