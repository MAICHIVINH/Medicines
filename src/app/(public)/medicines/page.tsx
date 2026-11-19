import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { RightOutlined } from '@ant-design/icons';
import { isDatabaseConfigured } from '@/config/env';
import { categoryService } from '@/modules/category/category.service';
import { attributeService } from '@/modules/attribute/attribute.service';
import {
  medicineService,
  type DynamicAttributeFilterItem,
  type MedicineListQuery,
} from '@/modules/medicine/medicine.service';
import {
  MedicineCatalogBrowser,
  type FilterAttributeOption,
  type FilterCategoryOption,
} from '@/components/medicine/MedicineCatalogBrowser';
import { DatabaseStatusNotice } from '@/components/ui/DatabaseStatusNotice';
import type { MedicineCardItem } from '@/components/medicine/MedicineCard';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Tra cứu Danh sách Thuốc & Hoạt chất',
  description:
    'Tra cứu, tìm kiếm và lọc danh mục thuốc theo tên thuốc, hoạt chất, nhà sản xuất, mã SKU, nhóm dược lý, khoảng giá tham khảo và các thuộc tính bào chế động.',
};

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function MedicinesCatalogPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const dbReady = isDatabaseConfigured();

  let initialItems: MedicineCardItem[] = [];
  let initialMeta = { page: 1, limit: 12, total: 0, totalPages: 1 };
  let categories: FilterCategoryOption[] = [];
  let filterableAttributes: FilterAttributeOption[] = [];
  let dbError: string | undefined;

  if (dbReady) {
    try {
      const page = Number(params.page || 1);
      const search = typeof params.search === 'string' ? params.search : undefined;
      const categorySlug =
        typeof params.categorySlug === 'string' ? params.categorySlug : undefined;
      const minPrice =
        typeof params.minPrice === 'string' && params.minPrice !== ''
          ? Number(params.minPrice)
          : undefined;
      const maxPrice =
        typeof params.maxPrice === 'string' && params.maxPrice !== ''
          ? Number(params.maxPrice)
          : undefined;
      const isPrescriptionRequired =
        params.isPrescriptionRequired === 'true'
          ? true
          : params.isPrescriptionRequired === 'false'
            ? false
            : undefined;
      const isFeatured =
        params.isFeatured === 'true'
          ? true
          : params.isFeatured === 'false'
            ? false
            : undefined;
      const sortByParam = typeof params.sortBy === 'string' ? params.sortBy : 'newest';
      const sortBy: MedicineListQuery['sortBy'] =
        sortByParam === 'name_asc' ||
        sortByParam === 'name_desc' ||
        sortByParam === 'price_asc' ||
        sortByParam === 'price_desc' ||
        sortByParam === 'newest'
          ? sortByParam
          : 'newest';

      const attributeFilters: DynamicAttributeFilterItem[] = [];
      for (const [key, val] of Object.entries(params)) {
        if (key.startsWith('attr_') && typeof val === 'string' && val.trim()) {
          attributeFilters.push({
            attributeCode: key.slice(5),
            value: val.trim(),
          });
        }
      }

      const [catsRes, attrsRes, medRes] = await Promise.all([
        categoryService.listCategories({ includeInactive: false, includeDeleted: false }),
        attributeService.listAttributes({ includeInactive: false, filterableOnly: true }),
        medicineService.listMedicines({
          page,
          limit: 12,
          search,
          categorySlug,
          minPrice,
          maxPrice,
          isPrescriptionRequired,
          isFeatured,
          sortBy,
          attributeFilters,
          includeUnpublished: false,
        }),
      ]);

      categories = catsRes.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        parentId: c.parentId,
      }));

      filterableAttributes = attrsRes.map((a) => ({
        id: a.id,
        name: a.name,
        code: a.code,
        dataType: a.dataType,
        unit: a.unit,
        options: a.options.map((o) => ({
          id: o.id,
          value: o.value,
          label: o.label,
        })),
      }));

      initialItems = medRes.items;
      initialMeta = medRes.meta;
    } catch (error) {
      dbError = error instanceof Error ? error.message : 'Lỗi truy vấn dữ liệu.';
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-slate-500">
        <Link href="/" className="hover:text-pharma-600">
          Trang chủ
        </Link>
        <RightOutlined className="text-[10px]" />
        <span className="font-medium text-slate-800">Danh sách &amp; Tra cứu Thuốc</span>
      </nav>

      {/* Page Heading */}
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
          Danh mục Thuốc &amp; Dược phẩm
        </h1>
        <p className="text-sm text-slate-600">
          Tra cứu theo tên thuốc, hoạt chất, nhà sản xuất, mã SKU biến thể và các thuộc tính bào chế động.
        </p>
      </div>

      {(!dbReady || dbError) && <DatabaseStatusNotice message={dbError} />}

      <Suspense
        fallback={
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500">
            Đang tải giao diện tra cứu thuốc...
          </div>
        }
      >
        <MedicineCatalogBrowser
          initialItems={initialItems}
          initialMeta={initialMeta}
          categories={categories}
          filterableAttributes={filterableAttributes}
        />
      </Suspense>
    </div>
  );
}

