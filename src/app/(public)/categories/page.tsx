import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import {
  AppstoreOutlined,
  RightOutlined,
  FolderOpenOutlined,
} from '@ant-design/icons';
import { isDatabaseConfigured } from '@/config/env';
import { categoryService } from '@/modules/category/category.service';
import { DatabaseStatusNotice } from '@/components/ui/DatabaseStatusNotice';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Danh mục Phân nhóm Thuốc Cha – Con',
  description:
    'Duyệt toàn bộ hệ thống danh mục phân nhóm thuốc theo tác dụng dược lý, hỗ trợ danh mục cha - con chuẩn hóa.',
};

export default async function CategoriesPage() {
  const dbReady = isDatabaseConfigured();
  let allCategories: Awaited<ReturnType<typeof categoryService.listCategories>> = [];
  let dbError: string | undefined;

  if (dbReady) {
    try {
      allCategories = await categoryService.listCategories({
        includeInactive: false,
        includeDeleted: false,
      });
    } catch (error) {
      dbError = error instanceof Error ? error.message : 'Lỗi kết nối cơ sở dữ liệu.';
    }
  }

  const rootCategories = allCategories.filter((c) => !c.parentId);
  const childLookup = new Map<string, typeof allCategories>();
  for (const cat of allCategories) {
    if (cat.parentId) {
      const list = childLookup.get(cat.parentId) || [];
      list.push(cat);
      childLookup.set(cat.parentId, list);
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-slate-500">
        <Link href="/" className="hover:text-pharma-600">
          Trang chủ
        </Link>
        <RightOutlined className="text-[10px]" />
        <span className="font-medium text-slate-800">Danh mục Dược phẩm</span>
      </nav>

      {/* Header */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-pharma-600">
              Hệ thống Phân loại
            </span>
            <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold text-slate-900">
              Danh mục Nhóm Thuốc &amp; Dược lý
            </h1>
            <p className="mt-2 text-sm text-slate-600 max-w-2xl">
              Hệ thống danh mục được tổ chức theo cấu trúc phân cấp Cha – Con. Chọn một danh mục để tra cứu danh sách các thuốc đã được kiểm duyệt thuộc nhóm tương ứng.
            </p>
          </div>
          <Link
            href="/medicines"
            className="inline-flex items-center justify-center rounded-xl bg-pharma-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-pharma-700 transition-colors shrink-0"
          >
            Xem tất cả thuốc
          </Link>
        </div>
      </div>

      {(!dbReady || dbError) && <DatabaseStatusNotice message={dbError} />}

      {/* Categories Hierarchy Grid */}
      {rootCategories.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {rootCategories.map((root) => {
            const subCategories = childLookup.get(root.id) || [];
            const subMedicinesCount = subCategories.reduce(
              (acc, sub) => acc + (sub._count?.medicines ?? 0),
              0
            );
            const totalGroupMedicines = (root._count?.medicines ?? 0) + subMedicinesCount;

            return (
              <div
                key={root.id}
                className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:border-pharma-300 transition-all"
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-pharma-50 text-pharma-600 shrink-0">
                        <AppstoreOutlined className="text-xl" />
                      </div>
                      <div>
                        <Link
                          href={`/categories/${root.slug}`}
                          className="text-lg font-bold text-slate-900 hover:text-pharma-700 transition-colors"
                        >
                          {root.name}
                        </Link>
                        <p className="text-xs text-slate-500">
                          Tổng số thuốc trong nhóm: <strong>{totalGroupMedicines}</strong>
                        </p>
                      </div>
                    </div>
                    <Link
                      href={`/categories/${root.slug}`}
                      className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-pharma-50 hover:text-pharma-700 shrink-0"
                    >
                      Xem nhóm
                    </Link>
                  </div>

                  {root.description && (
                    <p className="text-sm text-slate-600 leading-relaxed">
                      {root.description}
                    </p>
                  )}

                  {/* Subcategories list */}
                  <div className="pt-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2.5">
                      Danh mục con trực thuộc ({subCategories.length})
                    </p>

                    {subCategories.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {subCategories.map((sub) => (
                          <Link
                            key={sub.id}
                            href={`/categories/${sub.slug}`}
                            className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-slate-50/70 px-3.5 py-2.5 text-xs font-medium text-slate-700 hover:border-pharma-300 hover:bg-pharma-50/50 hover:text-pharma-800 transition-colors"
                          >
                            <span className="truncate pr-2">{sub.name}</span>
                            <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-600 border border-slate-200 shrink-0">
                              {sub._count?.medicines ?? 0}
                            </span>
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-xl bg-slate-50 px-3.5 py-2.5 text-xs text-slate-500">
                        Danh mục cấp 1 độc lập ({root._count?.medicines ?? 0} thuốc trực tiếp)
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                  <Link
                    href={`/medicines?categorySlug=${encodeURIComponent(root.slug)}`}
                    className="font-semibold text-pharma-600 hover:text-pharma-700"
                  >
                    Lọc danh sách thuốc theo nhóm này →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center space-y-3">
          <FolderOpenOutlined className="text-4xl text-slate-400" />
          <h3 className="text-base font-bold text-slate-800">
            Chưa có danh mục thuốc nào đang hoạt động
          </h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            Các danh mục ngừng hoạt động sẽ không hiển thị trên cổng tra cứu công khai.
          </p>
        </div>
      )}
    </div>
  );
}

