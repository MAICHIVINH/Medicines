import { MedicineStatus, Prisma, VariantStatus } from '@prisma/client';
import { z } from 'zod';
import { prisma, ensureDatabaseConfigured } from '@/infrastructure/database/prisma';
import { neonStorageService } from '@/infrastructure/storage/neon-storage.service';
import { AppError, ConflictError, NotFoundError } from '@/lib/errors';
import { removeVietnameseTones, slugify } from '@/lib/utils';

export const prescriptionRequiredSchema = z.preprocess((val) => {
  if (val === 'RX' || val === 'true' || val === true) return true;
  if (val === 'OTC' || val === 'false' || val === false) return false;
  if (val === 'NON_DRUG' || val === 'null' || val === null || val === 'none') return null;
  return val;
}, z.boolean().nullable().optional());

export const createMedicineSchema = z.object({
  categoryId: z.string().uuid('Danh mục thuốc không hợp lệ.'),
  name: z
    .string()
    .trim()
    .min(2, 'Tên thuốc phải có ít nhất 2 ký tự.')
    .max(255, 'Tên thuốc không vượt quá 255 ký tự.'),
  slug: z
    .string()
    .trim()
    .max(255, 'Slug không vượt quá 255 ký tự.')
    .optional(),
  activeIngredient: z
    .string()
    .trim()
    .min(2, 'Hoạt chất phải có ít nhất 2 ký tự.')
    .max(500, 'Hoạt chất không vượt quá 500 ký tự.'),
  manufacturer: z
    .string()
    .trim()
    .min(2, 'Nhà sản xuất phải có ít nhất 2 ký tự.')
    .max(255, 'Nhà sản xuất không vượt quá 255 ký tự.'),
  registrationNumber: z
    .string()
    .trim()
    .max(100, 'Số đăng ký không vượt quá 100 ký tự.')
    .nullable()
    .optional(),
  description: z.string().trim().max(20000).nullable().optional(),
  usageInformation: z.string().trim().max(20000).nullable().optional(),
  storageInformation: z.string().trim().max(10000).nullable().optional(),
  isPrescriptionRequired: prescriptionRequiredSchema.default(false),
  status: z.nativeEnum(MedicineStatus).default(MedicineStatus.DRAFT),
  isFeatured: z.boolean().default(false),
});

export const updateMedicineSchema = createMedicineSchema.partial().extend({
  isPrescriptionRequired: prescriptionRequiredSchema,
  restore: z.boolean().optional(),
});

export interface DynamicAttributeFilterItem {
  attributeCode: string;
  value: string;
}

export interface MedicineListQuery {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: string;
  categorySlug?: string;
  minPrice?: number;
  maxPrice?: number;
  isPrescriptionRequired?: boolean | null;
  isFeatured?: boolean;
  status?: MedicineStatus;
  includeUnpublished?: boolean;
  includeDeleted?: boolean;
  sortBy?: 'newest' | 'name_asc' | 'name_desc' | 'price_asc' | 'price_desc';
  attributeFilters?: DynamicAttributeFilterItem[];
}

/**
 * Kiểm tra các điều kiện bắt buộc trước khi cho phép Xuất bản thuốc (6.4)
 */
export function validateMedicineForPublish(medicine: {
  name?: string | null;
  categoryId?: string | null;
  activeIngredient?: string | null;
  manufacturer?: string | null;
  description?: string | null;
  usageInformation?: string | null;
  storageInformation?: string | null;
  activeVariantsCount: number;
}): { valid: boolean; missingFields: string[] } {
  const missing: string[] = [];

  if (!medicine.name?.trim()) missing.push('Tên thuốc');
  if (!medicine.categoryId?.trim()) missing.push('Danh mục phân loại');
  if (!medicine.activeIngredient?.trim()) missing.push('Hoạt chất');
  if (!medicine.manufacturer?.trim()) missing.push('Nhà sản xuất');
  if (!medicine.description?.trim()) missing.push('Mô tả thuốc');
  if (!medicine.usageInformation?.trim()) missing.push('Thông tin hướng dẫn sử dụng');
  if (!medicine.storageInformation?.trim()) missing.push('Thông tin bảo quản');
  if (medicine.activeVariantsCount < 1) {
    missing.push('Ít nhất 1 biến thể đang hoạt động (SKU và giá tham khảo)');
  }

  return {
    valid: missing.length === 0,
    missingFields: missing,
  };
}

export class MedicineRepository {
  public async findByIdOrSlug(idOrSlug: string, includeUnpublished = false) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      idOrSlug
    );

    const where: Prisma.MedicineWhereInput = isUuid
      ? { id: idOrSlug }
      : { slug: idOrSlug };

    if (!includeUnpublished) {
      where.status = MedicineStatus.PUBLISHED;
      where.deletedAt = null;
      where.category = {
        isActive: true,
        deletedAt: null,
      };
    }

    return prisma.medicine.findFirst({
      where,
      include: {
        category: {
          include: {
            parent: {
              select: { id: true, name: true, slug: true },
            },
          },
        },
        images: {
          orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
        },
        variants: {
          where: includeUnpublished
            ? { deletedAt: null }
            : { status: VariantStatus.ACTIVE, deletedAt: null },
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
          orderBy: [{ price: 'asc' }, { createdAt: 'asc' }],
        },
      },
    });
  }

  public async findMany(query: MedicineListQuery) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 12));
    const skip = (page - 1) * limit;

    const andConditions: Prisma.MedicineWhereInput[] = [];

    if (!query.includeDeleted) {
      andConditions.push({ deletedAt: null });
    }

    if (!query.includeUnpublished) {
      andConditions.push({ status: MedicineStatus.PUBLISHED });
      andConditions.push({
        category: {
          isActive: true,
          deletedAt: null,
        },
      });
    } else if (query.status) {
      andConditions.push({ status: query.status });
    }

    if (query.isFeatured !== undefined) {
      andConditions.push({ isFeatured: query.isFeatured });
    }

    if (query.isPrescriptionRequired !== undefined) {
      andConditions.push({ isPrescriptionRequired: query.isPrescriptionRequired });
    }

    // Lọc theo danh mục (hỗ trợ cả danh mục cha bao gồm các danh mục con trực thuộc)
    if (query.categoryId) {
      andConditions.push({
        OR: [
          { categoryId: query.categoryId },
          { category: { parentId: query.categoryId } },
        ],
      });
    } else if (query.categorySlug) {
      andConditions.push({
        OR: [
          { category: { slug: query.categorySlug } },
          { category: { parent: { slug: query.categorySlug } } },
        ],
      });
    }

    // Tìm kiếm theo Tên thuốc, Hoạt chất, Nhà sản xuất, Mã SKU (hỗ trợ cả có dấu và không dấu qua slug)
    if (query.search && query.search.trim()) {
      const rawQ = query.search.trim();
      const unaccentedQ = removeVietnameseTones(rawQ);
      const sluggedQ = slugify(rawQ);

      const orSearch: Prisma.MedicineWhereInput[] = [
        { name: { contains: rawQ, mode: 'insensitive' } },
        { activeIngredient: { contains: rawQ, mode: 'insensitive' } },
        { manufacturer: { contains: rawQ, mode: 'insensitive' } },
        { registrationNumber: { contains: rawQ, mode: 'insensitive' } },
        {
          variants: {
            some: {
              sku: { contains: rawQ, mode: 'insensitive' },
              ...(query.includeUnpublished ? {} : { status: VariantStatus.ACTIVE, deletedAt: null }),
            },
          },
        },
      ];

      if (sluggedQ && sluggedQ.length >= 2) {
        orSearch.push({ slug: { contains: sluggedQ, mode: 'insensitive' } });
      }

      if (unaccentedQ !== rawQ) {
        orSearch.push(
          { name: { contains: unaccentedQ, mode: 'insensitive' } },
          { activeIngredient: { contains: unaccentedQ, mode: 'insensitive' } },
          { manufacturer: { contains: unaccentedQ, mode: 'insensitive' } }
        );
      }

      andConditions.push({ OR: orSearch });
    }

    // Lọc khoảng giá tham khảo trên các biến thể đang hoạt động
    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      const priceCond: Prisma.DecimalFilter = {};
      if (query.minPrice !== undefined && !Number.isNaN(query.minPrice)) {
        priceCond.gte = new Prisma.Decimal(query.minPrice);
      }
      if (query.maxPrice !== undefined && !Number.isNaN(query.maxPrice)) {
        priceCond.lte = new Prisma.Decimal(query.maxPrice);
      }

      andConditions.push({
        variants: {
          some: {
            deletedAt: null,
            ...(query.includeUnpublished ? {} : { status: VariantStatus.ACTIVE }),
            price: priceCond,
          },
        },
      });
    }

    // Lọc theo thuộc tính động được cấu hình (5.3 & 6.6)
    if (query.attributeFilters && query.attributeFilters.length > 0) {
      for (const filter of query.attributeFilters) {
        if (!filter.attributeCode || !filter.value) continue;

        const boolParsed =
          filter.value === 'true' ? true : filter.value === 'false' ? false : undefined;

        andConditions.push({
          variants: {
            some: {
              deletedAt: null,
              ...(query.includeUnpublished ? {} : { status: VariantStatus.ACTIVE }),
              attributeValues: {
                some: {
                  attribute: {
                    code: filter.attributeCode,
                    isActive: true,
                    isFilterable: true,
                  },
                  OR: [
                    { option: { value: filter.value, isActive: true } },
                    { textValue: { equals: filter.value, mode: 'insensitive' } },
                    ...(boolParsed !== undefined ? [{ booleanValue: boolParsed }] : []),
                  ],
                },
              },
            },
          },
        });
      }
    }

    const where: Prisma.MedicineWhereInput =
      andConditions.length > 0 ? { AND: andConditions } : {};

    // Sắp xếp
    let orderBy: Prisma.MedicineOrderByWithRelationInput[] = [
      { isFeatured: 'desc' },
      { publishedAt: 'desc' },
      { createdAt: 'desc' },
    ];

    if (query.sortBy === 'name_asc') {
      orderBy = [{ name: 'asc' }];
    } else if (query.sortBy === 'name_desc') {
      orderBy = [{ name: 'desc' }];
    } else if (query.sortBy === 'newest') {
      orderBy = [{ publishedAt: 'desc' }, { updatedAt: 'desc' }];
    }

    const [items, total] = await Promise.all([
      prisma.medicine.findMany({
        where,
        include: {
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          images: {
            orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
            take: 3,
          },
          variants: {
            where: query.includeUnpublished
              ? { deletedAt: null }
              : { status: VariantStatus.ACTIVE, deletedAt: null },
            include: {
              attributeValues: {
                include: {
                  attribute: true,
                  option: true,
                },
              },
            },
            orderBy: { price: 'asc' },
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
      prisma.medicine.count({ where }),
    ]);

    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }
}

export class MedicineService {
  constructor(private readonly repo = new MedicineRepository()) {}

  private async enrichMedicineWithImageUrls<
    T extends {
      images: Array<{
        id: string;
        objectKey: string;
        bucketName: string;
        publicUrl: string | null;
        isPrimary: boolean;
      }>;
      variants: Array<{
        price: Prisma.Decimal | number | string;
        images?: Array<{
          id: string;
          objectKey: string;
          bucketName: string;
          publicUrl: string | null;
          isPrimary: boolean;
        }>;
        attributeValues?: Array<{
          numberValue: Prisma.Decimal | number | string | null;
        }>;
      }>;
    },
  >(
    medicine: T
  ): Promise<
    Omit<T, 'images' | 'variants'> & {
      images: Array<T['images'][number] & { displayUrl: string }>;
      variants: Array<
        Omit<T['variants'][number], 'images' | 'price' | 'attributeValues'> & {
          price: number;
          numericPrice: number;
          images: Array<
            NonNullable<T['variants'][number]['images']>[number] & {
              displayUrl: string;
            }
          >;
          attributeValues: Array<
            Omit<
              NonNullable<T['variants'][number]['attributeValues']>[number],
              'numberValue'
            > & {
              numberValue: number | null;
            }
          >;
        }
      >;
      primaryImageUrl: string | null;
      referencePrice: number | null;
    }
  > {
    type ImgItem = T['images'][number];
    type VarItem = T['variants'][number];
    type VarImgItem = NonNullable<VarItem['images']>[number];
    type VarAttrItem = NonNullable<VarItem['attributeValues']>[number];

    const resolvedImages: Array<ImgItem & { displayUrl: string }> = await Promise.all(
      medicine.images.map(async (img) => ({
        ...img,
        displayUrl: await neonStorageService.getObjectUrl({
          objectKey: img.objectKey,
          bucketName: img.bucketName,
          publicUrl: img.publicUrl,
        }),
      }))
    );

    const resolvedVariants = await Promise.all(
      medicine.variants.map(async (v) => {
        const vImages: Array<VarImgItem & { displayUrl: string }> = v.images
          ? await Promise.all(
              v.images.map(async (img) => ({
                ...img,
                displayUrl: await neonStorageService.getObjectUrl({
                  objectKey: img.objectKey,
                  bucketName: img.bucketName,
                  publicUrl: img.publicUrl,
                }),
              }))
            )
          : [];

        const vAttrValues: Array<
          Omit<VarAttrItem, 'numberValue'> & { numberValue: number | null }
        > = v.attributeValues
          ? v.attributeValues.map((av) => ({
              ...(av as Omit<VarAttrItem, 'numberValue'>),
              numberValue:
                av.numberValue !== null && av.numberValue !== undefined
                  ? Number(av.numberValue)
                  : null,
            }))
          : [];

        const numericPrice = Number(v.price);

        return {
          ...(v as Omit<VarItem, 'images' | 'price' | 'attributeValues'>),
          price: numericPrice,
          numericPrice,
          images: vImages,
          attributeValues: vAttrValues,
        };
      })
    );

    const primaryImage =
      resolvedImages.find((i) => i.isPrimary) || resolvedImages[0] || null;
    const referencePrice =
      resolvedVariants.length > 0
        ? Math.min(...resolvedVariants.map((v) => v.numericPrice))
        : null;

    return {
      ...medicine,
      images: resolvedImages,
      variants: resolvedVariants,
      primaryImageUrl: primaryImage?.displayUrl || null,
      referencePrice,
    };
  }

  public async listMedicines(query: MedicineListQuery) {
    ensureDatabaseConfigured();
    const result = await this.repo.findMany(query);

    let enrichedItems = await Promise.all(
      result.items.map((item) => this.enrichMedicineWithImageUrls(item))
    );

    if (query.sortBy === 'price_asc') {
      enrichedItems = enrichedItems.sort(
        (a, b) => (a.referencePrice ?? Number.MAX_SAFE_INTEGER) - (b.referencePrice ?? Number.MAX_SAFE_INTEGER)
      );
    } else if (query.sortBy === 'price_desc') {
      enrichedItems = enrichedItems.sort(
        (a, b) => (b.referencePrice ?? 0) - (a.referencePrice ?? 0)
      );
    }

    return {
      items: enrichedItems,
      meta: result.meta,
    };
  }

  public async getMedicineDetail(idOrSlug: string, includeUnpublished = false) {
    ensureDatabaseConfigured();
    const medicine = await this.repo.findByIdOrSlug(idOrSlug, includeUnpublished);
    if (!medicine) {
      throw new NotFoundError('Không tìm thấy thông tin thuốc yêu cầu.');
    }

    return this.enrichMedicineWithImageUrls(medicine);
  }

  public async getRelatedMedicines(medicineId: string, categoryId: string, limit = 4) {
    ensureDatabaseConfigured();
    const items = await prisma.medicine.findMany({
      where: {
        id: { not: medicineId },
        categoryId,
        status: MedicineStatus.PUBLISHED,
        deletedAt: null,
      },
      include: {
        category: {
          select: { id: true, name: true, slug: true },
        },
        images: {
          orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
          take: 2,
        },
        variants: {
          where: { status: VariantStatus.ACTIVE, deletedAt: null },
          orderBy: { price: 'asc' },
        },
      },
      orderBy: [{ isFeatured: 'desc' }, { publishedAt: 'desc' }],
      take: limit,
    });

    return Promise.all(items.map((item) => this.enrichMedicineWithImageUrls(item)));
  }

  public async createMedicine(
    input: z.infer<typeof createMedicineSchema>,
    adminId: string,
    ipAddress?: string
  ) {
    ensureDatabaseConfigured();
    const validated = createMedicineSchema.parse(input);
    const slug = slugify(validated.slug?.trim() || validated.name);

    if (!slug) {
      throw new AppError('Slug thuốc không hợp lệ.', 400, 'INVALID_SLUG');
    }

    const existingSlug = await prisma.medicine.findUnique({ where: { slug } });
    if (existingSlug) {
      throw new ConflictError(`Slug thuốc "${slug}" đã tồn tại.`);
    }

    const category = await prisma.category.findUnique({
      where: { id: validated.categoryId },
    });
    if (!category || category.deletedAt) {
      throw new NotFoundError('Danh mục được chọn không tồn tại.');
    }

    // Khi mới tạo chưa có biến thể, nếu chọn PUBLISHED thì kiểm tra quy tắc nghiệp vụ
    if (validated.status === MedicineStatus.PUBLISHED) {
      throw new AppError(
        'Thuốc mới khởi tạo cần được lưu nháp và cấu hình ít nhất 1 biến thể (SKU & Giá) trước khi xuất bản.',
        400,
        'CANNOT_PUBLISH_WITHOUT_VARIANTS'
      );
    }

    const created = await prisma.medicine.create({
      data: {
        categoryId: validated.categoryId,
        name: validated.name,
        slug,
        activeIngredient: validated.activeIngredient,
        manufacturer: validated.manufacturer,
        registrationNumber: validated.registrationNumber ?? null,
        description: validated.description ?? null,
        usageInformation: validated.usageInformation ?? null,
        storageInformation: validated.storageInformation ?? null,
        isPrescriptionRequired: validated.isPrescriptionRequired,
        status: validated.status,
        isFeatured: validated.isFeatured,
        publishedAt: null,
        createdBy: adminId,
        updatedBy: adminId,
      },
    });

    return created;
  }

  public async updateMedicine(
    id: string,
    input: z.infer<typeof updateMedicineSchema>,
    adminId: string,
    _ipAddress?: string
  ) {
    ensureDatabaseConfigured();
    const validated = updateMedicineSchema.parse(input);
    const existing = await prisma.medicine.findUnique({
      where: { id },
      include: {
        variants: {
          where: { status: VariantStatus.ACTIVE, deletedAt: null },
        },
      },
    });

    if (!existing) {
      throw new NotFoundError('Không tìm thấy thuốc cần chỉnh sửa.');
    }

    let slug = existing.slug;
    if (validated.slug !== undefined || (validated.name && !existing.slug)) {
      slug = slugify(validated.slug?.trim() || validated.name || existing.name);
      if (!slug) {
        throw new AppError('Slug thuốc không hợp lệ.', 400, 'INVALID_SLUG');
      }
      if (slug !== existing.slug) {
        const duplicate = await prisma.medicine.findUnique({ where: { slug } });
        if (duplicate && duplicate.id !== id) {
          throw new ConflictError(`Slug thuốc "${slug}" đã tồn tại.`);
        }
      }
    }

    if (validated.categoryId) {
      const cat = await prisma.category.findUnique({
        where: { id: validated.categoryId },
      });
      if (!cat || cat.deletedAt) {
        throw new NotFoundError('Danh mục thuốc không tồn tại.');
      }
    }

    const nextStatus = validated.status ?? existing.status;

    if (nextStatus === MedicineStatus.PUBLISHED) {
      const check = validateMedicineForPublish({
        name: validated.name ?? existing.name,
        categoryId: validated.categoryId ?? existing.categoryId,
        activeIngredient: validated.activeIngredient ?? existing.activeIngredient,
        manufacturer: validated.manufacturer ?? existing.manufacturer,
        description:
          validated.description !== undefined ? validated.description : existing.description,
        usageInformation:
          validated.usageInformation !== undefined
            ? validated.usageInformation
            : existing.usageInformation,
        storageInformation:
          validated.storageInformation !== undefined
            ? validated.storageInformation
            : existing.storageInformation,
        activeVariantsCount: existing.variants.length,
      });

      if (!check.valid) {
        throw new AppError(
          `Không thể xuất bản thuốc do thiếu các thông tin bắt buộc: ${check.missingFields.join(', ')}.`,
          400,
          'PUBLISH_VALIDATION_FAILED',
          { missingFields: check.missingFields }
        );
      }
    }

    const publishedAt =
      nextStatus === MedicineStatus.PUBLISHED && !existing.publishedAt
        ? new Date()
        : existing.publishedAt;

    const updated = await prisma.medicine.update({
      where: { id },
      data: {
        ...(validated.categoryId !== undefined ? { categoryId: validated.categoryId } : {}),
        ...(validated.name !== undefined ? { name: validated.name } : {}),
        slug,
        ...(validated.activeIngredient !== undefined
          ? { activeIngredient: validated.activeIngredient }
          : {}),
        ...(validated.manufacturer !== undefined ? { manufacturer: validated.manufacturer } : {}),
        ...(validated.registrationNumber !== undefined
          ? { registrationNumber: validated.registrationNumber }
          : {}),
        ...(validated.description !== undefined ? { description: validated.description } : {}),
        ...(validated.usageInformation !== undefined
          ? { usageInformation: validated.usageInformation }
          : {}),
        ...(validated.storageInformation !== undefined
          ? { storageInformation: validated.storageInformation }
          : {}),
        ...(validated.isPrescriptionRequired !== undefined
          ? { isPrescriptionRequired: validated.isPrescriptionRequired }
          : {}),
        ...(validated.status !== undefined ? { status: validated.status } : {}),
        ...(validated.isFeatured !== undefined ? { isFeatured: validated.isFeatured } : {}),
        ...(validated.restore === true ? { deletedAt: null } : {}),
        publishedAt,
        updatedBy: adminId,
      },
    });

    return updated;
  }

  public async publishMedicine(id: string, adminId: string, _ipAddress?: string) {
    ensureDatabaseConfigured();
    const existing = await prisma.medicine.findUnique({
      where: { id },
      include: {
        variants: {
          where: { status: VariantStatus.ACTIVE, deletedAt: null },
        },
      },
    });

    if (!existing || existing.deletedAt) {
      throw new NotFoundError('Không tìm thấy thuốc cần xuất bản.');
    }

    const check = validateMedicineForPublish({
      name: existing.name,
      categoryId: existing.categoryId,
      activeIngredient: existing.activeIngredient,
      manufacturer: existing.manufacturer,
      description: existing.description,
      usageInformation: existing.usageInformation,
      storageInformation: existing.storageInformation,
      activeVariantsCount: existing.variants.length,
    });

    if (!check.valid) {
      throw new AppError(
        `Không thể xuất bản thuốc do thiếu thông tin bắt buộc: ${check.missingFields.join(', ')}.`,
        400,
        'PUBLISH_VALIDATION_FAILED',
        { missingFields: check.missingFields }
      );
    }

    const updated = await prisma.medicine.update({
      where: { id },
      data: {
        status: MedicineStatus.PUBLISHED,
        publishedAt: new Date(),
        updatedBy: adminId,
      },
    });

    return updated;
  }

  public async unpublishMedicine(id: string, adminId: string, _ipAddress?: string) {
    ensureDatabaseConfigured();
    const existing = await prisma.medicine.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) {
      throw new NotFoundError('Không tìm thấy thuốc.');
    }

    const updated = await prisma.medicine.update({
      where: { id },
      data: {
        status: MedicineStatus.ARCHIVED,
        updatedBy: adminId,
      },
    });

    return updated;
  }

  public async deleteMedicine(id: string, adminId: string, _ipAddress?: string) {
    ensureDatabaseConfigured();
    const existing = await prisma.medicine.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) {
      throw new NotFoundError('Thuốc không tồn tại hoặc đã bị xóa.');
    }

    const deleted = await prisma.medicine.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        status: MedicineStatus.ARCHIVED,
        updatedBy: adminId,
      },
    });

    return deleted;
  }

  public async getTrashMedicines() {
    ensureDatabaseConfigured();
    const items = await prisma.medicine.findMany({
      where: { deletedAt: { not: null } },
      include: {
        category: {
          select: { id: true, name: true, slug: true },
        },
        variants: {
          select: { id: true, sku: true, name: true, price: true },
        },
        images: {
          select: { id: true, objectKey: true, bucketName: true, fileName: true, isPrimary: true },
        },
      },
      orderBy: { deletedAt: 'desc' },
    });

    return items;
  }

  public async restoreMedicine(id: string, adminId: string) {
    ensureDatabaseConfigured();
    const existing = await prisma.medicine.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('Thuốc không tồn tại trong hệ thống.');
    }
    if (!existing.deletedAt) {
      return existing;
    }

    const restored = await prisma.medicine.update({
      where: { id },
      data: {
        deletedAt: null,
        status: MedicineStatus.DRAFT,
        updatedBy: adminId,
      },
    });

    return restored;
  }

  public async hardDeleteMedicine(id: string) {
    ensureDatabaseConfigured();
    const existing = await prisma.medicine.findUnique({
      where: { id },
      include: { images: true },
    });
    if (!existing) {
      throw new NotFoundError('Thuốc không tồn tại.');
    }

    // 1. Dọn sạch các tệp ảnh trên Neon Object Storage / S3
    for (const img of existing.images) {
      try {
        await neonStorageService.deleteObject(img.objectKey, img.bucketName);
      } catch {
        // Bỏ qua lỗi S3 để không làm gián đoạn xóa database
      }
    }

    // 2. Xóa vĩnh viễn khỏi Database (Cascade tự động xóa biến thể, thuộc tính biến thể, và record ảnh)
    await prisma.medicine.delete({
      where: { id },
    });

    return { id, name: existing.name, deletedPermanently: true };
  }

  public async emptyMedicineTrash() {
    ensureDatabaseConfigured();
    const deletedItems = await prisma.medicine.findMany({
      where: { deletedAt: { not: null } },
      include: { images: true },
    });

    for (const item of deletedItems) {
      for (const img of item.images) {
        try {
          await neonStorageService.deleteObject(img.objectKey, img.bucketName);
        } catch {
          // Bỏ qua lỗi S3
        }
      }
    }

    const result = await prisma.medicine.deleteMany({
      where: { deletedAt: { not: null } },
    });

    return { count: result.count };
  }

  /**
   * 6.2. Dashboard Thống kê toàn diện từ Database thật
   */
  public async getAdminDashboardStats() {
    ensureDatabaseConfigured();

    const [
      totalCategories,
      totalMedicines,
      totalVariants,
      publishedMedicines,
      draftMedicines,
      archivedMedicines,
      totalImages,
      latestMedicineUpdate,
      latestCategoryUpdate,
      recentMedicines,
      categoryDistribution,
    ] = await Promise.all([
      prisma.category.count({ where: { deletedAt: null } }),
      prisma.medicine.count({ where: { deletedAt: null } }),
      prisma.medicineVariant.count({ where: { deletedAt: null } }),
      prisma.medicine.count({
        where: { deletedAt: null, status: MedicineStatus.PUBLISHED },
      }),
      prisma.medicine.count({
        where: { deletedAt: null, status: MedicineStatus.DRAFT },
      }),
      prisma.medicine.count({
        where: { deletedAt: null, status: MedicineStatus.ARCHIVED },
      }),
      prisma.medicineImage.count(),
      prisma.medicine.findFirst({
        orderBy: { updatedAt: 'desc' },
        select: { updatedAt: true },
      }),
      prisma.category.findFirst({
        orderBy: { updatedAt: 'desc' },
        select: { updatedAt: true },
      }),
      prisma.medicine.findMany({
        where: { deletedAt: null },
        take: 8,
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
          updatedAt: true,
          category: {
            select: { name: true },
          },
        },
      }),
      prisma.category.findMany({
        where: { deletedAt: null, isActive: true },
        select: {
          id: true,
          name: true,
          _count: {
            select: {
              medicines: {
                where: { deletedAt: null },
              },
            },
          },
        },
        orderBy: { sortOrder: 'asc' },
        take: 8,
      }),
    ]);

    const dates = [
      latestMedicineUpdate?.updatedAt,
      latestCategoryUpdate?.updatedAt,
    ].filter((d): d is Date => Boolean(d));

    const lastUpdatedAt =
      dates.length > 0
        ? new Date(Math.max(...dates.map((d) => d.getTime()))).toISOString()
        : null;

    return {
      totalCategories,
      totalMedicines,
      totalVariants,
      publishedMedicines,
      draftMedicines,
      archivedMedicines,
      totalImages,
      lastUpdatedAt,
      recentMedicines,
      categoryDistribution: categoryDistribution.map((c) => ({
        id: c.id,
        name: c.name,
        medicineCount: c._count.medicines,
      })),
    };
  }
}

export const medicineRepository = new MedicineRepository();
export const medicineService = new MedicineService(medicineRepository);

