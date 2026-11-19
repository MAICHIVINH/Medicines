import { AttributeDataType, Prisma, VariantStatus } from '@prisma/client';
import { z } from 'zod';
import { prisma, ensureDatabaseConfigured } from '@/infrastructure/database/prisma';
import { AppError, ConflictError, NotFoundError } from '@/lib/errors';

export const variantAttributeValueInputSchema = z.object({
  variantAttributeId: z.string().uuid('Mã thuộc tính không hợp lệ.'),
  variantAttributeOptionId: z.string().uuid().nullable().optional(),
  textValue: z.string().trim().max(1000).nullable().optional(),
  numberValue: z.coerce.number().nullable().optional(),
  booleanValue: z.boolean().nullable().optional(),
});

export const createVariantSchema = z.object({
  sku: z
    .string()
    .trim()
    .min(2, 'Mã SKU phải có ít nhất 2 ký tự.')
    .max(100, 'Mã SKU không vượt quá 100 ký tự.')
    .regex(/^[A-Za-z0-9_-]+$/, 'Mã SKU chỉ được chứa chữ cái, chữ số, dấu gạch ngang (-) và gạch dưới (_).'),
  name: z
    .string()
    .trim()
    .min(2, 'Tên biến thể phải có ít nhất 2 ký tự.')
    .max(255, 'Tên biến thể không vượt quá 255 ký tự.'),
  price: z.coerce
    .number()
    .min(0, 'Giá tham khảo không được nhỏ hơn 0.')
    .max(999999999999, 'Giá tham khảo vượt quá giới hạn cho phép.'),
  status: z.nativeEnum(VariantStatus).default(VariantStatus.ACTIVE),
  attributeValues: z.array(variantAttributeValueInputSchema).default([]),
  primaryImageId: z.string().uuid().nullable().optional(),
});

export const updateVariantSchema = createVariantSchema.partial().extend({
  restore: z.boolean().optional(),
});

export class VariantRepository {
  public async findByMedicineId(medicineId: string, includeInactive = false) {
    const where: Prisma.MedicineVariantWhereInput = {
      medicineId,
      ...(includeInactive ? {} : { status: VariantStatus.ACTIVE, deletedAt: null }),
    };

    return prisma.medicineVariant.findMany({
      where,
      include: {
        images: {
          orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
        },
        attributeValues: {
          include: {
            attribute: true,
            option: true,
          },
          orderBy: {
            attribute: {
              sortOrder: 'asc',
            },
          },
        },
      },
      orderBy: [{ createdAt: 'asc' }],
    });
  }

  public async findById(id: string) {
    return prisma.medicineVariant.findUnique({
      where: { id },
      include: {
        images: {
          orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
        },
        attributeValues: {
          include: {
            attribute: true,
            option: true,
          },
        },
      },
    });
  }

  public async findBySku(sku: string) {
    return prisma.medicineVariant.findUnique({
      where: { sku },
    });
  }
}

export class VariantService {
  constructor(private readonly repo = new VariantRepository()) {}

  public async listVariantsByMedicine(medicineId: string, includeInactive = false) {
    ensureDatabaseConfigured();
    return this.repo.findByMedicineId(medicineId, includeInactive);
  }

  /**
   * Kiểm tra tính hợp lệ của danh sách thuộc tính động gán cho biến thể
   */
  public async validateAndNormalizeAttributeValues(
    rawValues: z.infer<typeof variantAttributeValueInputSchema>[],
    enforceRequired = true
  ) {
    const seenAttrIds = new Set<string>();
    for (const item of rawValues) {
      if (seenAttrIds.has(item.variantAttributeId)) {
        throw new AppError(
          'Một thuộc tính chỉ được xuất hiện một lần trong cùng một biến thể.',
          400,
          'DUPLICATE_VARIANT_ATTRIBUTE'
        );
      }
      seenAttrIds.add(item.variantAttributeId);
    }

    const activeAttributes = await prisma.variantAttribute.findMany({
      where: { isActive: true },
      include: { options: { where: { isActive: true } } },
    });

    const attrById = new Map(activeAttributes.map((a) => [a.id, a]));

    if (enforceRequired) {
      for (const reqAttr of activeAttributes.filter((a) => a.isRequired)) {
        const provided = rawValues.find((v) => v.variantAttributeId === reqAttr.id);
        const hasVal =
          provided &&
          ((reqAttr.dataType === AttributeDataType.SELECT && provided.variantAttributeOptionId) ||
            (reqAttr.dataType === AttributeDataType.TEXT &&
              provided.textValue &&
              provided.textValue.trim().length > 0) ||
            (reqAttr.dataType === AttributeDataType.NUMBER &&
              provided.numberValue !== null &&
              provided.numberValue !== undefined) ||
            (reqAttr.dataType === AttributeDataType.BOOLEAN &&
              provided.booleanValue !== null &&
              provided.booleanValue !== undefined));

        if (!hasVal) {
          throw new AppError(
            `Thuộc tính bắt buộc "${reqAttr.name}" chưa được cung cấp giá trị.`,
            400,
            'MISSING_REQUIRED_ATTRIBUTE'
          );
        }
      }
    }

    const normalized: Array<{
      variantAttributeId: string;
      variantAttributeOptionId: string | null;
      textValue: string | null;
      numberValue: Prisma.Decimal | null;
      booleanValue: boolean | null;
    }> = [];

    for (const item of rawValues) {
      const attr = attrById.get(item.variantAttributeId);
      if (!attr) {
        throw new NotFoundError(`Thuộc tính (ID: ${item.variantAttributeId}) không tồn tại hoặc đã ngừng hoạt động.`);
      }

      if (attr.dataType === AttributeDataType.SELECT) {
        if (!item.variantAttributeOptionId) continue;
        const validOption = attr.options.some((o) => o.id === item.variantAttributeOptionId);
        if (!validOption) {
          throw new AppError(
            `Tùy chọn được chọn không thuộc về thuộc tính "${attr.name}".`,
            400,
            'INVALID_ATTRIBUTE_OPTION'
          );
        }
        normalized.push({
          variantAttributeId: attr.id,
          variantAttributeOptionId: item.variantAttributeOptionId,
          textValue: null,
          numberValue: null,
          booleanValue: null,
        });
      } else if (attr.dataType === AttributeDataType.TEXT) {
        if (!item.textValue || !item.textValue.trim()) continue;
        normalized.push({
          variantAttributeId: attr.id,
          variantAttributeOptionId: null,
          textValue: item.textValue.trim(),
          numberValue: null,
          booleanValue: null,
        });
      } else if (attr.dataType === AttributeDataType.NUMBER) {
        if (item.numberValue === null || item.numberValue === undefined) continue;
        normalized.push({
          variantAttributeId: attr.id,
          variantAttributeOptionId: null,
          textValue: null,
          numberValue: new Prisma.Decimal(item.numberValue),
          booleanValue: null,
        });
      } else if (attr.dataType === AttributeDataType.BOOLEAN) {
        if (item.booleanValue === null || item.booleanValue === undefined) continue;
        normalized.push({
          variantAttributeId: attr.id,
          variantAttributeOptionId: null,
          textValue: null,
          numberValue: null,
          booleanValue: item.booleanValue,
        });
      }
    }

    return normalized;
  }

  public async createVariant(
    medicineId: string,
    input: z.infer<typeof createVariantSchema>,
    _adminId: string,
    _ipAddress?: string
  ) {
    ensureDatabaseConfigured();
    const validated = createVariantSchema.parse(input);
    const normalizedSku = validated.sku.toUpperCase();

    const medicine = await prisma.medicine.findUnique({ where: { id: medicineId } });
    if (!medicine || medicine.deletedAt) {
      throw new NotFoundError('Không tìm thấy thuốc để thêm biến thể.');
    }

    const existingSku = await this.repo.findBySku(normalizedSku);
    if (existingSku) {
      throw new ConflictError(`Mã SKU "${normalizedSku}" đã tồn tại trên hệ thống.`);
    }

    const normalizedAttrs = await this.validateAndNormalizeAttributeValues(
      validated.attributeValues,
      false
    );

    const created = await prisma.$transaction(async (tx) => {
      const variant = await tx.medicineVariant.create({
        data: {
          medicineId,
          sku: normalizedSku,
          name: validated.name,
          price: new Prisma.Decimal(validated.price),
          status: validated.status,
        },
      });

      if (normalizedAttrs.length > 0) {
        await tx.variantAttributeValue.createMany({
          data: normalizedAttrs.map((attr) => ({
            medicineVariantId: variant.id,
            ...attr,
          })),
        });
      }

      if (validated.primaryImageId) {
        await tx.medicineImage.updateMany({
          where: { medicineVariantId: variant.id },
          data: { isPrimary: false },
        });
        await tx.medicineImage.update({
          where: { id: validated.primaryImageId },
          data: {
            medicineVariantId: variant.id,
            isPrimary: true,
          },
        });
      }

      return tx.medicineVariant.findUniqueOrThrow({
        where: { id: variant.id },
        include: {
          images: true,
          attributeValues: {
            include: { attribute: true, option: true },
          },
        },
      });
    });

    return created;
  }

  public async updateVariant(
    variantId: string,
    input: z.infer<typeof updateVariantSchema>,
    _adminId: string,
    _ipAddress?: string
  ) {
    ensureDatabaseConfigured();
    const validated = updateVariantSchema.parse(input);
    const existing = await this.repo.findById(variantId);
    if (!existing) {
      throw new NotFoundError('Không tìm thấy biến thể thuốc.');
    }

    let nextSku = existing.sku;
    if (validated.sku !== undefined) {
      nextSku = validated.sku.toUpperCase();
      if (nextSku !== existing.sku) {
        const duplicate = await this.repo.findBySku(nextSku);
        if (duplicate && duplicate.id !== variantId) {
          throw new ConflictError(`Mã SKU "${nextSku}" đã tồn tại.`);
        }
      }
    }

    const normalizedAttrs =
      validated.attributeValues !== undefined
        ? await this.validateAndNormalizeAttributeValues(validated.attributeValues, false)
        : undefined;

    const updated = await prisma.$transaction(async (tx) => {
      await tx.medicineVariant.update({
        where: { id: variantId },
        data: {
          sku: nextSku,
          ...(validated.name !== undefined ? { name: validated.name } : {}),
          ...(validated.price !== undefined
            ? { price: new Prisma.Decimal(validated.price) }
            : {}),
          ...(validated.status !== undefined ? { status: validated.status } : {}),
          ...(validated.restore === true
            ? { deletedAt: null, status: VariantStatus.ACTIVE }
            : {}),
        },
      });

      if (normalizedAttrs !== undefined) {
        await tx.variantAttributeValue.deleteMany({
          where: { medicineVariantId: variantId },
        });
        if (normalizedAttrs.length > 0) {
          await tx.variantAttributeValue.createMany({
            data: normalizedAttrs.map((attr) => ({
              medicineVariantId: variantId,
              ...attr,
            })),
          });
        }
      }

      if (validated.primaryImageId !== undefined) {
        await tx.medicineImage.updateMany({
          where: { medicineVariantId: variantId },
          data: { isPrimary: false },
        });
        if (validated.primaryImageId) {
          await tx.medicineImage.update({
            where: { id: validated.primaryImageId },
            data: {
              medicineVariantId: variantId,
              isPrimary: true,
            },
          });
        }
      }

      return tx.medicineVariant.findUniqueOrThrow({
        where: { id: variantId },
        include: {
          images: true,
          attributeValues: {
            include: { attribute: true, option: true },
          },
        },
      });
    });

    return updated;
  }

  public async deleteVariant(variantId: string, _adminId: string, _ipAddress?: string) {
    ensureDatabaseConfigured();
    const existing = await this.repo.findById(variantId);
    if (!existing || existing.deletedAt) {
      throw new NotFoundError('Biến thể không tồn tại hoặc đã bị xóa.');
    }

    const deleted = await prisma.medicineVariant.update({
      where: { id: variantId },
      data: {
        deletedAt: new Date(),
        status: VariantStatus.INACTIVE,
      },
    });

    return deleted;
  }
}

export const variantRepository = new VariantRepository();
export const variantService = new VariantService(variantRepository);

