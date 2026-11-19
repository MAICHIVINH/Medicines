import { AttributeDataType, Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma, ensureDatabaseConfigured } from '@/infrastructure/database/prisma';
import { ConflictError, NotFoundError } from '@/lib/errors';
import { slugify } from '@/lib/utils';

export const createAttributeSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Tên thuộc tính phải có ít nhất 2 ký tự.')
    .max(150, 'Tên thuộc tính không vượt quá 150 ký tự.'),
  code: z
    .string()
    .trim()
    .min(2, 'Mã thuộc tính phải có ít nhất 2 ký tự.')
    .max(100, 'Mã thuộc tính không vượt quá 100 ký tự.')
    .regex(
      /^[a-z0-9_]+$/,
      'Mã thuộc tính chỉ được chứa chữ thường (a-z), chữ số (0-9) và dấu gạch dưới (_).'
    ),
  dataType: z.nativeEnum(AttributeDataType),
  unit: z.string().trim().max(50).nullable().optional(),
  isFilterable: z.boolean().default(false),
  isRequired: z.boolean().default(false),
  sortOrder: z.coerce.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

export const updateAttributeSchema = createAttributeSchema.partial();

export const createAttributeOptionSchema = z.object({
  label: z
    .string()
    .trim()
    .min(1, 'Nhãn hiển thị tùy chọn không được để trống.')
    .max(255, 'Nhãn hiển thị không vượt quá 255 ký tự.'),
  value: z
    .string()
    .trim()
    .max(255, 'Giá trị tùy chọn không vượt quá 255 ký tự.')
    .optional(),
  sortOrder: z.coerce.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

export const updateAttributeOptionSchema = createAttributeOptionSchema.partial();

export interface AttributeListQuery {
  includeInactive?: boolean;
  filterableOnly?: boolean;
}

export class AttributeRepository {
  public async findAll(query: AttributeListQuery = {}) {
    const where: Prisma.VariantAttributeWhereInput = {};
    if (!query.includeInactive) {
      where.isActive = true;
    }
    if (query.filterableOnly) {
      where.isFilterable = true;
    }

    return prisma.variantAttribute.findMany({
      where,
      include: {
        options: {
          where: query.includeInactive ? {} : { isActive: true },
          orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
        },
        _count: {
          select: {
            values: true,
          },
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  public async findById(id: string) {
    return prisma.variantAttribute.findUnique({
      where: { id },
      include: {
        options: {
          orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
        },
      },
    });
  }

  public async findByCode(code: string) {
    return prisma.variantAttribute.findUnique({
      where: { code },
    });
  }

  public async findOptionById(optionId: string) {
    return prisma.variantAttributeOption.findUnique({
      where: { id: optionId },
      include: { attribute: true },
    });
  }
}

export class AttributeService {
  constructor(private readonly repo = new AttributeRepository()) {}

  public async listAttributes(query: AttributeListQuery = {}) {
    ensureDatabaseConfigured();
    return this.repo.findAll(query);
  }

  public async getAttributeById(id: string) {
    ensureDatabaseConfigured();
    const attr = await this.repo.findById(id);
    if (!attr) {
      throw new NotFoundError('Không tìm thấy thuộc tính biến thể.');
    }
    return attr;
  }

  public async createAttribute(
    input: z.infer<typeof createAttributeSchema>,
    _adminId: string,
    _ipAddress?: string
  ) {
    ensureDatabaseConfigured();
    const validated = createAttributeSchema.parse(input);

    const existingCode = await this.repo.findByCode(validated.code);
    if (existingCode) {
      throw new ConflictError(`Mã thuộc tính "${validated.code}" đã tồn tại.`);
    }

    const created = await prisma.variantAttribute.create({
      data: {
        name: validated.name,
        code: validated.code,
        dataType: validated.dataType,
        unit: validated.unit ?? null,
        isFilterable: validated.isFilterable,
        isRequired: validated.isRequired,
        sortOrder: validated.sortOrder,
        isActive: validated.isActive,
      },
      include: { options: true },
    });

    return created;
  }

  public async updateAttribute(
    id: string,
    input: z.infer<typeof updateAttributeSchema>,
    _adminId: string,
    _ipAddress?: string
  ) {
    ensureDatabaseConfigured();
    const validated = updateAttributeSchema.parse(input);
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new NotFoundError('Không tìm thấy thuộc tính cần chỉnh sửa.');
    }

    if (validated.code && validated.code !== existing.code) {
      const duplicate = await this.repo.findByCode(validated.code);
      if (duplicate && duplicate.id !== id) {
        throw new ConflictError(`Mã thuộc tính "${validated.code}" đã được sử dụng.`);
      }
    }

    const updated = await prisma.variantAttribute.update({
      where: { id },
      data: {
        ...(validated.name !== undefined ? { name: validated.name } : {}),
        ...(validated.code !== undefined ? { code: validated.code } : {}),
        ...(validated.dataType !== undefined ? { dataType: validated.dataType } : {}),
        ...(validated.unit !== undefined ? { unit: validated.unit } : {}),
        ...(validated.isFilterable !== undefined ? { isFilterable: validated.isFilterable } : {}),
        ...(validated.isRequired !== undefined ? { isRequired: validated.isRequired } : {}),
        ...(validated.sortOrder !== undefined ? { sortOrder: validated.sortOrder } : {}),
        ...(validated.isActive !== undefined ? { isActive: validated.isActive } : {}),
      },
      include: { options: true },
    });

    return updated;
  }

  /**
   * Xóa hoặc ngừng sử dụng thuộc tính động
   */
  public async deleteOrDeactivateAttribute(id: string, _adminId: string, _ipAddress?: string) {
    ensureDatabaseConfigured();
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new NotFoundError('Không tìm thấy thuộc tính cần xóa.');
    }

    const usageCount = await prisma.variantAttributeValue.count({
      where: { variantAttributeId: id },
    });

    if (usageCount > 0) {
      // Nếu đã được gán cho các biến thể thuốc -> chuyển sang ngừng sử dụng (isActive = false) để bảo toàn dữ liệu lịch sử
      const deactivated = await prisma.variantAttribute.update({
        where: { id },
        data: { isActive: false },
      });

      return { mode: 'DEACTIVATED' as const, attribute: deactivated };
    }

    await prisma.variantAttribute.delete({ where: { id } });

    return { mode: 'DELETED' as const, attribute: existing };
  }

  // ---------------------------------------------------------------------------
  // ATTRIBUTE OPTIONS (4.6)
  // ---------------------------------------------------------------------------

  public async listOptions(attributeId: string, includeInactive = false) {
    ensureDatabaseConfigured();
    const attr = await this.repo.findById(attributeId);
    if (!attr) {
      throw new NotFoundError('Không tìm thấy thuộc tính.');
    }

    return prisma.variantAttributeOption.findMany({
      where: {
        variantAttributeId: attributeId,
        ...(includeInactive ? {} : { isActive: true }),
      },
      orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
    });
  }

  public async createOption(
    attributeId: string,
    input: z.infer<typeof createAttributeOptionSchema>,
    _adminId: string,
    _ipAddress?: string
  ) {
    ensureDatabaseConfigured();
    const validated = createAttributeOptionSchema.parse(input);
    const attr = await this.repo.findById(attributeId);
    if (!attr) {
      throw new NotFoundError('Không tìm thấy thuộc tính cha.');
    }

    const optionValue = slugify(validated.value?.trim() || validated.label);
    if (!optionValue) {
      throw new ConflictError('Giá trị định danh của tùy chọn không hợp lệ.');
    }

    const existingOption = await prisma.variantAttributeOption.findUnique({
      where: {
        variantAttributeId_value: {
          variantAttributeId: attributeId,
          value: optionValue,
        },
      },
    });

    if (existingOption) {
      throw new ConflictError(`Tùy chọn có mã "${optionValue}" đã tồn tại trong thuộc tính này.`);
    }

    const created = await prisma.variantAttributeOption.create({
      data: {
        variantAttributeId: attributeId,
        label: validated.label,
        value: optionValue,
        sortOrder: validated.sortOrder,
        isActive: validated.isActive,
      },
    });

    return created;
  }

  public async updateOption(
    optionId: string,
    input: z.infer<typeof updateAttributeOptionSchema>,
    _adminId: string,
    _ipAddress?: string
  ) {
    ensureDatabaseConfigured();
    const validated = updateAttributeOptionSchema.parse(input);
    const existing = await this.repo.findOptionById(optionId);
    if (!existing) {
      throw new NotFoundError('Không tìm thấy tùy chọn thuộc tính.');
    }

    let nextValue = existing.value;
    if (validated.value !== undefined) {
      nextValue = slugify(validated.value);
    }

    const updated = await prisma.variantAttributeOption.update({
      where: { id: optionId },
      data: {
        ...(validated.label !== undefined ? { label: validated.label } : {}),
        value: nextValue,
        ...(validated.sortOrder !== undefined ? { sortOrder: validated.sortOrder } : {}),
        ...(validated.isActive !== undefined ? { isActive: validated.isActive } : {}),
      },
    });

    return updated;
  }

  public async deleteOption(optionId: string, _adminId: string, _ipAddress?: string) {
    ensureDatabaseConfigured();
    const existing = await this.repo.findOptionById(optionId);
    if (!existing) {
      throw new NotFoundError('Không tìm thấy tùy chọn thuộc tính.');
    }

    const usageCount = await prisma.variantAttributeValue.count({
      where: { variantAttributeOptionId: optionId },
    });

    if (usageCount > 0) {
      const deactivated = await prisma.variantAttributeOption.update({
        where: { id: optionId },
        data: { isActive: false },
      });

      return { mode: 'DEACTIVATED' as const, option: deactivated };
    }

    await prisma.variantAttributeOption.delete({ where: { id: optionId } });

    return { mode: 'DELETED' as const, option: existing };
  }
}

export const attributeRepository = new AttributeRepository();
export const attributeService = new AttributeService(attributeRepository);

