import { NextRequest } from 'next/server';
import { MedicineStatus } from '@prisma/client';
import {
  medicineService,
  createMedicineSchema,
  type DynamicAttributeFilterItem,
  type MedicineListQuery,
} from '@/modules/medicine/medicine.service';
import { getOptionalAdminSession, requireAdminSession } from '@/infrastructure/auth/guard';
import { apiSuccess, handleApiError } from '@/lib/errors';
import { enforceRateLimit } from '@/lib/rate-limit';
import { extractClientIp } from '@/lib/utils';

export async function GET(req: NextRequest) {
  try {
    const ip = extractClientIp(req.headers);
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || undefined;

    if (search) {
      enforceRateLimit(`${ip}:medicine_search`, {
        namespace: 'public_search',
        maxRequests: 60,
        windowMs: 60 * 1000, // 60 lượt tìm kiếm / phút / IP
      });
    }

    const admin = await getOptionalAdminSession();
    const includeUnpublished = admin ? searchParams.get('includeUnpublished') === 'true' : false;
    const includeDeleted = admin ? searchParams.get('includeDeleted') === 'true' : false;

    const page = Number(searchParams.get('page') || 1);
    const limit = Number(searchParams.get('limit') || 12);
    const categoryId = searchParams.get('categoryId') || undefined;
    const categorySlug = searchParams.get('categorySlug') || undefined;

    const minPriceRaw = searchParams.get('minPrice');
    const maxPriceRaw = searchParams.get('maxPrice');
    const minPrice = minPriceRaw !== null && minPriceRaw !== '' ? Number(minPriceRaw) : undefined;
    const maxPrice = maxPriceRaw !== null && maxPriceRaw !== '' ? Number(maxPriceRaw) : undefined;

    const isPrescriptionRaw = searchParams.get('isPrescriptionRequired');
    const isPrescriptionRequired =
      isPrescriptionRaw === 'true' || isPrescriptionRaw === 'RX'
        ? true
        : isPrescriptionRaw === 'false' || isPrescriptionRaw === 'OTC'
          ? false
          : isPrescriptionRaw === 'null' || isPrescriptionRaw === 'none' || isPrescriptionRaw === 'NON_DRUG'
            ? null
            : undefined;

    const isFeaturedRaw = searchParams.get('isFeatured');
    const isFeatured =
      isFeaturedRaw === 'true'
        ? true
        : isFeaturedRaw === 'false'
          ? false
          : undefined;

    const statusParam = searchParams.get('status') as MedicineStatus | null;
    const status =
      includeUnpublished &&
      statusParam &&
      Object.values(MedicineStatus).includes(statusParam)
        ? statusParam
        : undefined;

    const sortByParam = searchParams.get('sortBy');
    const sortBy: MedicineListQuery['sortBy'] =
      sortByParam === 'name_asc' ||
      sortByParam === 'name_desc' ||
      sortByParam === 'price_asc' ||
      sortByParam === 'price_desc' ||
      sortByParam === 'newest'
        ? sortByParam
        : 'newest';

    // Lọc thuộc tính động qua query params `attr_{code}=value`
    const attributeFilters: DynamicAttributeFilterItem[] = [];
    searchParams.forEach((val, key) => {
      if (key.startsWith('attr_') && val.trim()) {
        const attributeCode = key.slice(5);
        if (attributeCode) {
          attributeFilters.push({ attributeCode, value: val.trim() });
        }
      }
    });

    const result = await medicineService.listMedicines({
      page,
      limit,
      search,
      categoryId,
      categorySlug,
      minPrice,
      maxPrice,
      isPrescriptionRequired,
      isFeatured,
      status,
      includeUnpublished,
      includeDeleted,
      sortBy,
      attributeFilters,
    });

    return apiSuccess(result.items, 200, result.meta);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdminSession();
    const body = await req.json();
    const parsed = createMedicineSchema.parse(body);
    const ip = extractClientIp(req.headers);

    const created = await medicineService.createMedicine(parsed, admin.adminId, ip);
    return apiSuccess(created, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

