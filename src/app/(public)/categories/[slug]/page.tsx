import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { RightOutlined, AppstoreOutlined, InboxOutlined } from '@ant-design/icons';
import { isDatabaseConfigured } from '@/config/env';
import { categoryService } from '@/modules/category/category.service';
import { medicineService } from '@/modules/medicine/medicine.service';
import { MedicineCard } from '@/components/medicine/MedicineCard';

export const dynamic = 'force-dynamic';

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  if (!isDatabaseConfigured()) {
    return { title: 'Danh mục thuốc' };
  }

  try {
    const category = await categoryService.getCategoryByIdOrSlug(slug, false);
    return {
      title: `${category.name} – Danh mục Thuốc`,
      description:
        category.description ||
        `Tra cứu danh sách các thuốc thuộc nhóm ${category.name} trên hệ thống PharmaCatalog VN.`,
      openGraph: {
        title: `${category.name} | PharmaCatalog VN`,
        description:
          category.description ||
          `Danh mục thuốc thuộc nhóm ${category.name} đã được kiểm duyệt.`,
      },
    };
  } catch {
    return { title: 'Không tìm thấy danh mục' };
  }
}

export default async function CategoryDetailPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const resolvedSearchParams = await searchParams;
  const page = Math.max(1, Number(resolvedSearchParams.page || 1));

  if (!isDatabaseConfigured()) {
    notFound();
  }

  let category;
  try {
    category = await categoryService.getCategoryByIdOrSlug(slug, false);
  } catch {
    notFound();
  }

  const medicinesResult = await medicineService.listMedicines({
    categoryId: category.id,
    page,
    limit: 12,
    includeUnpublished: false,
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <Link href="/" className="hover:text-pharma-600">
          Trang chủ
        </Link>
        <RightOutlined className="text-[10px]" />
        <Link href="/categories" className="hover:text-pharma-600">
          Danh mục Dược phẩm
        </Link>
        {category.parent && (
          <>
            <RightOutlined className="text-[10px]" />
            <Link
              href={`/categories/${category.parent.slug}`}
              className="hover:text-pharma-600"
            >
              {category.parent.name}
            </Link>
          </>
        )}
        <RightOutlined className="text-[10px]" />
        <span className="font-medium text-slate-800">{category.name}</span>
      </nav>

      {/* Category Header Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-pharma-50 text-pharma-600 shrink-0">
              <AppstoreOutlined className="text-2xl" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                {category.name}
              </h1>
              <p className="mt-1 text-xs text-slate-500">
                Tìm thấy <strong>{medicinesResult.meta.total}</strong> thuốc đã xuất bản trong nhóm này
              </p>
            </div>
          </div>

          <Link
            href={`/medicines?categorySlug=${encodeURIComponent(category.slug)}`}
            className="inline-flex items-center justify-center rounded-xl bg-pharma-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-pharma-700 transition-colors shrink-0"
          >
            Mở bộ lọc nâng cao cho danh mục này
          </Link>
        </div>

        {category.description && (
          <p className="text-sm text-slate-600 leading-relaxed max-w-4xl">
            {category.description}
          </p>
        )}

        {/* Subcategories if any */}
        {category.children && category.children.length > 0 && (
          <div className="pt-3 border-t border-slate-100">
            <span className="block text-xs font-semibold text-slate-500 mb-2">
              Danh mục con trực thuộc:
            </span>
            <div className="flex flex-wrap gap-2">
              {category.children.map((sub) => (
                <Link
                  key={sub.id}
                  href={`/categories/${sub.slug}`}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-1.5 text-xs font-medium text-slate-700 hover:border-pharma-300 hover:bg-pharma-50 hover:text-pharma-700 transition-colors"
                >
                  <span>{sub.name}</span>
                  <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-600 border border-slate-200">
                    {sub._count?.medicines ?? 0}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Medicines Grid or Empty State (Hỗ trợ danh mục không có thuốc - 5.2) */}
      {medicinesResult.items.length > 0 ? (
        <div className="space-y-8">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {medicinesResult.items.map((med) => (
              <MedicineCard key={med.id} medicine={med} />
            ))}
          </div>

          {/* Pagination */}
          {medicinesResult.meta.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              {Array.from({ length: medicinesResult.meta.totalPages }, (_, i) => i + 1).map(
                (p) => (
                  <Link
                    key={p}
                    href={`/categories/${category.slug}?page=${p}`}
                    className={`inline-flex h-10 w-10 items-center justify-center rounded-xl text-sm font-semibold transition-colors ${
                      p === medicinesResult.meta.page
                        ? 'bg-pharma-600 text-white'
                        : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {p}
                  </Link>
                )
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center space-y-3">
          <InboxOutlined className="text-4xl text-slate-400" />
          <h3 className="text-base font-bold text-slate-800">
            Danh mục này hiện chưa có thuốc xuất bản
          </h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            Các thuốc thuộc danh mục <strong>{category.name}</strong> đang được Quản trị viên cập nhật và kiểm duyệt thông tin chuyên môn.
          </p>
          <div className="pt-2">
            <Link
              href="/medicines"
              className="inline-flex items-center rounded-xl bg-pharma-600 px-4 py-2 text-xs font-semibold text-white hover:bg-pharma-700"
            >
              Tra cứu các danh mục thuốc khác
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

