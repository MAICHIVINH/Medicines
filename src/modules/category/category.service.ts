import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma, ensureDatabaseConfigured } from '@/infrastructure/database/prisma';
import { AppError, ConflictError, NotFoundError } from '@/lib/errors';
import { slugify } from '@/lib/utils';

export const createCategorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Tên danh mục phải có ít nhất 2 ký tự.')
    .max(255, 'Tên danh mục không vượt quá 255 ký tự.'),
  slug: z
    .string()
    .trim()
    .max(255, 'Slug không vượt quá 255 ký tự.')
    .optional(),
  description: z.string().trim().max(5000).nullable().optional(),
  parentId: z.string().uuid('Mã danh mục cha không hợp lệ.').nullable().optional(),
  sortOrder: z.coerce.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

export const updateCategorySchema = createCategorySchema.partial().extend({
  restore: z.boolean().optional(),
});

export interface CategoryListQuery {
  includeInactive?: boolean;
  includeDeleted?: boolean;
  search?: string;
}

export class CategoryRepository {
  public async findAll(query: CategoryListQuery = {}) {
    const where: Prisma.CategoryWhereInput = {};

    if (!query.includeDeleted) {
      where.deletedAt = null;
    }

    if (!query.includeInactive) {
      where.isActive = true;
    }

    if (query.search && query.search.trim()) {
      const q = query.search.trim();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { slug: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ];
    }

    return prisma.category.findMany({
      where,
      include: {
        parent: {
          select: { id: true, name: true, slug: true },
        },
        children: {
          where: query.includeDeleted
            ? {}
            : { deletedAt: null, ...(query.includeInactive ? {} : { isActive: true }) },
          orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        },
        _count: {
          select: {
            medicines: {
              where: query.includeInactive
                ? { deletedAt: null }
                : { deletedAt: null, status: 'PUBLISHED' },
            },
          },
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  public async findByIdOrSlug(idOrSlug: string, includeInactive = false) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      idOrSlug
    );

    const where: Prisma.CategoryWhereInput = isUuid
      ? { id: idOrSlug }
      : { slug: idOrSlug };

    if (!includeInactive) {
      where.isActive = true;
      where.deletedAt = null;
    }

    return prisma.category.findFirst({
      where,
      include: {
        parent: {
          select: { id: true, name: true, slug: true },
        },
        children: {
          where: includeInactive ? { deletedAt: null } : { deletedAt: null, isActive: true },
          orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
          include: {
            _count: {
              select: {
                medicines: {
                  where: includeInactive
                    ? { deletedAt: null }
                    : { deletedAt: null, status: 'PUBLISHED' },
                },
              },
            },
          },
        },
        _count: {
          select: {
            medicines: {
              where: includeInactive
                ? { deletedAt: null }
                : { deletedAt: null, status: 'PUBLISHED' },
            },
          },
        },
      },
    });
  }

  public async findByIdRaw(id: string) {
    return prisma.category.findUnique({ where: { id } });
  }

  public async findBySlugRaw(slug: string) {
    return prisma.category.findUnique({ where: { slug } });
  }
}

/**
 * Thuật toán kiểm tra quan hệ cha-con gây vòng lặp (Circular Dependency Check)
 * Có thể kiểm thử độc lập (Pure helper + DB check)
 */
export function detectCategoryCycleInMemory(
  categoryId: string,
  newParentId: string | null | undefined,
  parentLookup: Map<string, string | null>
): boolean {
  if (!newParentId) return false;
  if (categoryId === newParentId) return true;

  const visited = new Set<string>([categoryId]);
  let current: string | null | undefined = newParentId;

  while (current) {
    if (visited.has(current)) {
      return true;
    }
    visited.add(current);
    current = parentLookup.get(current) ?? null;
  }

  return false;
}

export class CategoryService {
  constructor(private readonly repo = new CategoryRepository()) {}

  public async listCategories(query: CategoryListQuery = {}) {
    ensureDatabaseConfigured();
    return this.repo.findAll(query);
  }

  public async getCategoryByIdOrSlug(idOrSlug: string, includeInactive = false) {
    ensureDatabaseConfigured();
    const category = await this.repo.findByIdOrSlug(idOrSlug, includeInactive);
    if (!category) {
      throw new NotFoundError('Không tìm thấy danh mục thuốc yêu cầu.');
    }
    return category;
  }

  /**
   * Kiểm tra vòng lặp danh mục cha-con trong Database
   */
  public async assertNoCircularHierarchy(
    categoryId: string,
    targetParentId: string | null | undefined
  ): Promise<void> {
    if (!targetParentId) return;

    if (categoryId === targetParentId) {
      throw new AppError(
        'Một danh mục không thể nhận chính nó làm danh mục cha.',
        400,
        'CIRCULAR_CATEGORY_HIERARCHY'
      );
    }

    const allCategories = await prisma.category.findMany({
      select: { id: true, parentId: true, deletedAt: true },
    });

    const parentEntity = allCategories.find((c) => c.id === targetParentId && !c.deletedAt);
    if (!parentEntity) {
      throw new NotFoundError('Danh mục cha được chọn không tồn tại hoặc đã bị xóa.');
    }

    const parentLookup = new Map<string, string | null>();
    for (const cat of allCategories) {
      parentLookup.set(cat.id, cat.parentId);
    }

    const hasCycle = detectCategoryCycleInMemory(categoryId, targetParentId, parentLookup);
    if (hasCycle) {
      throw new AppError(
        'Không thể thiết lập danh mục cha-con gây vòng lặp (danh mục cha mới đang là danh mục con/cháu của danh mục hiện tại).',
        400,
        'CIRCULAR_CATEGORY_HIERARCHY'
      );
    }
  }

  public async createCategory(
    input: z.infer<typeof createCategorySchema>,
    adminId: string,
    ipAddress?: string
  ) {
    ensureDatabaseConfigured();
    const validated = createCategorySchema.parse(input);
    const slug = slugify(validated.slug?.trim() || validated.name);

    if (!slug) {
      throw new AppError('Slug danh mục không hợp lệ.', 400, 'INVALID_SLUG');
    }

    const existingSlug = await this.repo.findBySlugRaw(slug);
    if (existingSlug) {
      throw new ConflictError(`Slug danh mục "${slug}" đã tồn tại trong hệ thống.`);
    }

    if (validated.parentId) {
      const parent = await this.repo.findByIdRaw(validated.parentId);
      if (!parent || parent.deletedAt) {
        throw new NotFoundError('Danh mục cha không tồn tại hoặc đã bị xóa.');
      }
    }

    const created = await prisma.category.create({
      data: {
        name: validated.name,
        slug,
        description: validated.description ?? null,
        parentId: validated.parentId ?? null,
        sortOrder: validated.sortOrder,
        isActive: validated.isActive,
        createdBy: adminId,
        updatedBy: adminId,
      },
    });

    return created;
  }

  public async updateCategory(
    id: string,
    input: z.infer<typeof updateCategorySchema>,
    adminId: string,
    _ipAddress?: string
  ) {
    ensureDatabaseConfigured();
    const validated = updateCategorySchema.parse(input);
    const existing = await this.repo.findByIdRaw(id);
    if (!existing) {
      throw new NotFoundError('Không tìm thấy danh mục cần cập nhật.');
    }

    let slug = existing.slug;
    if (validated.slug !== undefined || (validated.name && !existing.slug)) {
      slug = slugify(validated.slug?.trim() || validated.name || existing.name);
      if (!slug) {
        throw new AppError('Slug danh mục không hợp lệ.', 400, 'INVALID_SLUG');
      }
      if (slug !== existing.slug) {
        const duplicate = await this.repo.findBySlugRaw(slug);
        if (duplicate && duplicate.id !== id) {
          throw new ConflictError(`Slug danh mục "${slug}" đã được sử dụng bởi danh mục khác.`);
        }
      }
    }

    if (validated.parentId !== undefined) {
      await this.assertNoCircularHierarchy(id, validated.parentId);
    }

    const updated = await prisma.category.update({
      where: { id },
      data: {
        ...(validated.name !== undefined ? { name: validated.name } : {}),
        slug,
        ...(validated.description !== undefined ? { description: validated.description } : {}),
        ...(validated.parentId !== undefined ? { parentId: validated.parentId } : {}),
        ...(validated.sortOrder !== undefined ? { sortOrder: validated.sortOrder } : {}),
        ...(validated.isActive !== undefined ? { isActive: validated.isActive } : {}),
        ...(validated.restore === true ? { deletedAt: null, isActive: true } : {}),
        updatedBy: adminId,
      },
    });

    return updated;
  }

  /**
   * Xóa mềm danh mục (4.1: Không cho phép xóa danh mục đang được thuốc hoặc danh mục con tham chiếu nếu chưa xử lý dữ liệu liên quan)
   */
  public async deleteCategory(id: string, adminId: string, _ipAddress?: string) {
    ensureDatabaseConfigured();
    const existing = await this.repo.findByIdRaw(id);
    if (!existing || existing.deletedAt) {
      throw new NotFoundError('Danh mục không tồn tại hoặc đã bị xóa.');
    }

    const [activeMedicineCount, activeChildrenCount] = await Promise.all([
      prisma.medicine.count({
        where: { categoryId: id, deletedAt: null },
      }),
      prisma.category.count({
        where: { parentId: id, deletedAt: null },
      }),
    ]);

    if (activeMedicineCount > 0) {
      throw new ConflictError(
        `Không thể xóa danh mục "${existing.name}" vì đang có ${activeMedicineCount} thuốc tham chiếu đến danh mục này. Vui lòng chuyển các thuốc sang danh mục khác trước.`
      );
    }

    if (activeChildrenCount > 0) {
      throw new ConflictError(
        `Không thể xóa danh mục "${existing.name}" vì đang có ${activeChildrenCount} danh mục con trực thuộc. Vui lòng xử lý danh mục con trước.`
      );
    }

    const deleted = await prisma.category.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false,
        updatedBy: adminId,
      },
    });

    return deleted;
  }
}

export const categoryRepository = new CategoryRepository();
export const categoryService = new CategoryService(categoryRepository);

