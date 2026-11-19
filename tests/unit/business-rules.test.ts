import { describe, it, expect, beforeEach } from 'vitest';
import {
  createCategorySchema,
  detectCategoryCycleInMemory,
} from '@/modules/category/category.service';
import {
  createMedicineSchema,
  validateMedicineForPublish,
} from '@/modules/medicine/medicine.service';
import { createVariantSchema } from '@/modules/variant/variant.service';
import { createAttributeSchema } from '@/modules/attribute/attribute.service';
import {
  detectImageMimeTypeFromBuffer,
  buildMedicineObjectKey,
  neonStorageService,
} from '@/infrastructure/storage/neon-storage.service';
import { sanitizeForLog } from '@/lib/logger';
import { checkRateLimit, resetRateLimit } from '@/lib/rate-limit';
import { removeVietnameseTones, slugify } from '@/lib/utils';

describe('PHẦN 11.1 – Unit Tests: Nghiệp vụ, Validation & Bảo mật', () => {
  describe('1. Category Service & Circular Hierarchy Protection (4.1)', () => {
    it('Chấp nhận dữ liệu danh mục hợp lệ', () => {
      const parsed = createCategorySchema.parse({
        name: 'Thuốc kháng sinh & Kháng khuẩn',
        sortOrder: 1,
        isActive: true,
      });
      expect(parsed.name).toBe('Thuốc kháng sinh & Kháng khuẩn');
      expect(parsed.isActive).toBe(true);
    });

    it('Từ chối quan hệ cha-con khi danh mục tự nhận chính nó làm cha', () => {
      const lookup = new Map<string, string | null>([['cat-a', null]]);
      expect(detectCategoryCycleInMemory('cat-a', 'cat-a', lookup)).toBe(true);
    });

    it('Phát hiện chính xác vòng lặp cha-con đa cấp (A -> B -> C -> A)', () => {
      // Hiện tại: B có cha là A, C có cha là B
      const lookup = new Map<string, string | null>([
        ['cat-a', null],
        ['cat-b', 'cat-a'],
        ['cat-c', 'cat-b'],
      ]);

      // Nếu gán cha của A là C => tạo vòng lặp A -> C -> B -> A
      expect(detectCategoryCycleInMemory('cat-a', 'cat-c', lookup)).toBe(true);

      // Nếu gán cha của một danh mục độc lập D là C => hợp lệ (không tạo vòng lặp)
      expect(detectCategoryCycleInMemory('cat-d', 'cat-c', lookup)).toBe(false);
    });
  });

  describe('2. Medicine Service & Publish Business Rules (4.2 & 6.4)', () => {
    it('Không cho phép xuất bản thuốc thiếu các trường bắt buộc hoặc chưa có biến thể', () => {
      const result = validateMedicineForPublish({
        name: 'Hapacol 650',
        categoryId: '11111111-1111-1111-1111-111111111111',
        activeIngredient: 'Paracetamol 650mg',
        manufacturer: 'DHG Pharma',
        description: '',
        usageInformation: null,
        storageInformation: 'Bảo quản dưới 30 độ C',
        activeVariantsCount: 0,
      });

      expect(result.valid).toBe(false);
      expect(result.missingFields).toContain('Mô tả thuốc');
      expect(result.missingFields).toContain('Thông tin hướng dẫn sử dụng');
      expect(result.missingFields).toContain(
        'Ít nhất 1 biến thể đang hoạt động (SKU và giá tham khảo)'
      );
    });

    it('Cho phép xuất bản thuốc khi đã có đầy đủ thông tin chuyên môn và ít nhất 1 biến thể', () => {
      const result = validateMedicineForPublish({
        name: 'Hapacol 650',
        categoryId: '11111111-1111-1111-1111-111111111111',
        activeIngredient: 'Paracetamol 650mg',
        manufacturer: 'DHG Pharma',
        description: 'Mô tả thuốc từ tờ hướng dẫn sử dụng',
        usageInformation: 'Uống sau ăn theo chỉ định',
        storageInformation: 'Bảo quản dưới 30 độ C',
        activeVariantsCount: 2,
      });

      expect(result.valid).toBe(true);
      expect(result.missingFields).toHaveLength(0);
    });

    it('Validate schema tạo thuốc bằng Zod', () => {
      const invalid = createMedicineSchema.safeParse({
        categoryId: 'not-a-uuid',
        name: 'A',
        activeIngredient: '',
        manufacturer: '',
      });
      expect(invalid.success).toBe(false);
    });
  });

  describe('3. Variant & Dynamic Attribute Validation (4.4, 4.5, 6.5, 6.6)', () => {
    it('Validate SKU và giá tham khảo không âm trong Variant Schema', () => {
      const valid = createVariantSchema.safeParse({
        sku: 'DHG-HAP650-H100',
        name: 'Hộp 10 vỉ x 10 viên',
        price: 95000,
        status: 'ACTIVE',
      });
      expect(valid.success).toBe(true);

      const invalidPrice = createVariantSchema.safeParse({
        sku: 'DHG-HAP650-H100',
        name: 'Hộp 10 vỉ x 10 viên',
        price: -5000,
      });
      expect(invalidPrice.success).toBe(false);

      const invalidSku = createVariantSchema.safeParse({
        sku: 'SKU CO KHOANG TRANG!',
        name: 'Hộp 10 viên',
        price: 50000,
      });
      expect(invalidSku.success).toBe(false);
    });

    it('Validate mã thuộc tính động (code chỉ gồm chữ thường, số và dấu gạch dưới)', () => {
      const valid = createAttributeSchema.safeParse({
        name: 'Dạng bào chế',
        code: 'dosage_form',
        dataType: 'SELECT',
        isFilterable: true,
        isRequired: true,
      });
      expect(valid.success).toBe(true);

      const invalid = createAttributeSchema.safeParse({
        name: 'Dạng bào chế',
        code: 'Dosage-Form!',
        dataType: 'SELECT',
      });
      expect(invalid.success).toBe(false);
    });
  });

  describe('4. Neon Object Storage Service & Magic Bytes MIME Validation (6.7 & PHẦN 7)', () => {
    it('Phát hiện đúng định dạng JPEG, PNG và WebP từ Magic Bytes thực tế', () => {
      const jpegBuffer = Buffer.from([
        0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
      ]);
      expect(detectImageMimeTypeFromBuffer(jpegBuffer)).toEqual({
        mimeType: 'image/jpeg',
        extension: 'jpg',
      });

      const pngBuffer = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
      ]);
      expect(detectImageMimeTypeFromBuffer(pngBuffer)).toEqual({
        mimeType: 'image/png',
        extension: 'png',
      });

      const webpBuffer = Buffer.from([
        0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
      ]);
      expect(detectImageMimeTypeFromBuffer(webpBuffer)).toEqual({
        mimeType: 'image/webp',
        extension: 'webp',
      });
    });

    it('Từ chối tệp giả mạo phần mở rộng (.jpg nhưng nội dung là script/HTML)', () => {
      const fakeImageBuffer = Buffer.from('<script>alert("xss")</script>', 'utf-8');
      expect(detectImageMimeTypeFromBuffer(fakeImageBuffer)).toBeNull();
      expect(() => neonStorageService.validateFile(fakeImageBuffer)).toThrow(
        /Định dạng tệp không hợp lệ/
      );
    });

    it('Từ chối tệp vượt quá giới hạn dung lượng 5 MB', () => {
      const oversizedBuffer = Buffer.alloc(5 * 1024 * 1024 + 10, 0xff);
      expect(() => neonStorageService.validateFile(oversizedBuffer)).toThrow(
        /vượt quá giới hạn cho phép/
      );
    });

    it('Sinh Object Key đúng chuẩn cấu trúc medicines/{id} và variants/{id} không lặp lại tên bucket', () => {
      const medPrimaryKey = buildMedicineObjectKey({
        medicineId: 'med-123',
        isPrimary: true,
        extension: 'webp',
      });
      expect(medPrimaryKey).toMatch(/^medicines\/med-123\/main-[a-z0-9]+\.webp$/);
      expect(medPrimaryKey.startsWith('medicine-images/')).toBe(false);

      const variantKey = buildMedicineObjectKey({
        medicineId: 'med-123',
        medicineVariantId: 'var-456',
        isPrimary: true,
        extension: 'webp',
      });
      expect(variantKey).toMatch(/^variants\/var-456\/main-[a-z0-9]+\.webp$/);
    });
  });

  describe('5. Bảo mật: AuditLog Redaction, Rate Limiter & Xử lý Tiếng Việt (PHẦN 10)', () => {
    beforeEach(() => {
      resetRateLimit('test_login');
    });

    it('Không bao giờ ghi password, passwordHash hoặc secret vào AuditLogs / Logger', () => {
      const sanitized = sanitizeForLog({
        username: 'admin',
        password: 'SuperSecretPassword123!',
        passwordHash: '$2a$12$hashvalue',
        nested: {
          aws_secret_access_key: 'neon-s3-secret',
          safeField: 'Paracetamol',
        },
      }) as Record<string, unknown>;

      expect(sanitized.username).toBe('admin');
      expect(sanitized.password).toBe('[REDACTED]');
      expect(sanitized.passwordHash).toBe('[REDACTED]');
      expect((sanitized.nested as Record<string, unknown>).aws_secret_access_key).toBe(
        '[REDACTED]'
      );
      expect((sanitized.nested as Record<string, unknown>).safeField).toBe('Paracetamol');
    });

    it('Chống brute-force đăng nhập bằng Rate Limiter', () => {
      const opts = { namespace: 'test_login', maxRequests: 3, windowMs: 60000 };
      expect(checkRateLimit('127.0.0.1:admin', opts).allowed).toBe(true);
      expect(checkRateLimit('127.0.0.1:admin', opts).allowed).toBe(true);
      expect(checkRateLimit('127.0.0.1:admin', opts).allowed).toBe(true);
      expect(checkRateLimit('127.0.0.1:admin', opts).allowed).toBe(false);
    });

    it('Chuyển đổi tiếng Việt có dấu sang không dấu và tạo slug chính xác', () => {
      expect(removeVietnameseTones('Thuốc giảm đau, hạ sốt Đặng Văn Ngữ')).toBe(
        'Thuoc giam dau, ha sot Dang Van Ngu'
      );
      expect(slugify('Thuốc giảm đau, hạ sốt & Kháng viêm (NSAIDs)')).toBe(
        'thuoc-giam-dau-ha-sot-khang-viem-nsaids'
      );
    });
  });
});

