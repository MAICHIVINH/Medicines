import React from 'react';
import Link from 'next/link';
import {
  AppstoreOutlined,
  MedicineBoxOutlined,
  DeploymentUnitOutlined,
  CheckCircleOutlined,
  FileTextOutlined,
  StopOutlined,
  PictureOutlined,
  ClockCircleOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { isDatabaseConfigured } from '@/config/env';
import { medicineService } from '@/modules/medicine/medicine.service';
import { DatabaseStatusNotice } from '@/components/ui/DatabaseStatusNotice';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  const dbReady = isDatabaseConfigured();
  let stats = {
    totalCategories: 0,
    totalMedicines: 0,
    totalVariants: 0,
    publishedMedicines: 0,
    draftMedicines: 0,
    archivedMedicines: 0,
    totalImages: 0,
    lastUpdatedAt: null as string | null,
    recentMedicines: [] as Array<{
      id: string;
      name: string;
      slug: string;
      status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
      updatedAt: Date;
      category: { name: string } | null;
    }>,
    categoryDistribution: [] as Array<{
      id: string;
      name: string;
      medicineCount: number;
    }>,
  };
  let dbError: string | undefined;

  if (dbReady) {
    try {
      stats = await medicineService.getAdminDashboardStats();
    } catch (error) {
      dbError = error instanceof Error ? error.message : 'Lỗi truy vấn thống kê.';
    }
  }

  const statCards = [
    {
      title: 'Tổng số danh mục',
      value: stats.totalCategories,
      icon: <AppstoreOutlined className="text-xl text-pharma-600" />,
      bg: 'bg-pharma-50',
      href: '/admin/categories',
    },
    {
      title: 'Tổng số thuốc',
      value: stats.totalMedicines,
      icon: <MedicineBoxOutlined className="text-xl text-blue-600" />,
      bg: 'bg-blue-50',
      href: '/admin/medicines',
    },
    {
      title: 'Tổng số biến thể (SKU)',
      value: stats.totalVariants,
      icon: <DeploymentUnitOutlined className="text-xl text-indigo-600" />,
      bg: 'bg-indigo-50',
      href: '/admin/medicines',
    },
    {
      title: 'Thuốc đã xuất bản',
      value: stats.publishedMedicines,
      icon: <CheckCircleOutlined className="text-xl text-emerald-600" />,
      bg: 'bg-emerald-50',
      href: '/admin/medicines',
    },
    {
      title: 'Thuốc bản nháp',
      value: stats.draftMedicines,
      icon: <FileTextOutlined className="text-xl text-amber-600" />,
      bg: 'bg-amber-50',
      href: '/admin/medicines',
    },
    {
      title: 'Thuốc ngừng hiển thị',
      value: stats.archivedMedicines,
      icon: <StopOutlined className="text-xl text-rose-600" />,
      bg: 'bg-rose-50',
      href: '/admin/medicines',
    },
    {
      title: 'Số lượng hình ảnh (S3)',
      value: stats.totalImages,
      icon: <PictureOutlined className="text-xl text-purple-600" />,
      bg: 'bg-purple-50',
      href: '/admin/medicines',
    },
    {
      title: 'Cập nhật gần nhất',
      value: stats.lastUpdatedAt
        ? new Date(stats.lastUpdatedAt).toLocaleString('vi-VN')
        : 'Chưa có',
      icon: <ClockCircleOutlined className="text-xl text-slate-600" />,
      bg: 'bg-slate-100',
      href: '/admin/medicines',
      isText: true,
    },
  ];

  const maxCatCount = Math.max(
    1,
    ...stats.categoryDistribution.map((c) => c.medicineCount)
  );

  return (
    <div className="space-y-8">
      {/* Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">
            Tổng quan Hệ thống Dược điển
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Số liệu thống kê thời gian thực từ cơ sở dữ liệu Neon PostgreSQL &amp; Neon Object Storage
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/admin/medicines"
            className="inline-flex items-center gap-1.5 rounded-xl bg-pharma-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-pharma-700 transition-colors"
          >
            <PlusOutlined />
            <span>Quản lý &amp; Thêm thuốc mới</span>
          </Link>
          <Link
            href="/admin/categories"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <AppstoreOutlined />
            <span>Danh mục</span>
          </Link>
        </div>
      </div>

      {(!dbReady || dbError) && <DatabaseStatusNotice message={dbError} />}

      {/* 8 Required KPI Stat Cards (6.2) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <Link
            key={card.title}
            href={card.href}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-pharma-300 hover:shadow-md transition-all flex items-start justify-between gap-3"
          >
            <div>
              <span className="block text-xs font-medium text-slate-500">
                {card.title}
              </span>
              <span
                className={`mt-2 block font-extrabold text-slate-900 ${
                  card.isText ? 'text-sm' : 'text-2xl'
                }`}
              >
                {card.value}
              </span>
            </div>
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${card.bg}`}
            >
              {card.icon}
            </div>
          </Link>
        ))}
      </div>

      {/* Charts & Recent Medicines */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Category Distribution Visual Chart */}
        <div className="lg:col-span-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">
              Phân bổ số lượng thuốc theo Danh mục
            </h2>
            <Link
              href="/admin/categories"
              className="text-xs font-semibold text-pharma-600 hover:text-pharma-700"
            >
              Quản lý →
            </Link>
          </div>

          {stats.categoryDistribution.length > 0 ? (
            <div className="space-y-3 pt-2">
              {stats.categoryDistribution.map((cat) => {
                const percent = Math.round((cat.medicineCount / maxCatCount) * 100);
                return (
                  <div key={cat.id} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-700 truncate pr-2">
                        {cat.name}
                      </span>
                      <span className="font-bold text-slate-900 shrink-0">
                        {cat.medicineCount} thuốc
                      </span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-pharma-600 transition-all"
                        style={{ width: `${Math.max(6, percent)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-slate-400">
              Chưa có dữ liệu phân bổ danh mục.
            </div>
          )}
        </div>

        {/* Recently Updated Medicines */}
        <div className="lg:col-span-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MedicineBoxOutlined className="text-pharma-600" />
              <h2 className="text-base font-bold text-slate-900">
                Danh sách thuốc cập nhật gần nhất
              </h2>
            </div>
            <Link
              href="/admin/medicines"
              className="text-xs font-semibold text-pharma-600 hover:text-pharma-700"
            >
              Xem tất cả →
            </Link>
          </div>

          {stats.recentMedicines.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {stats.recentMedicines.map((med) => (
                <div
                  key={med.id}
                  className="py-2.5 flex items-center justify-between gap-4 text-xs"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/admin/medicines/${med.id}`}
                      className="font-semibold text-slate-800 hover:text-pharma-700 truncate block"
                    >
                      {med.name}
                    </Link>
                    <span className="text-slate-400">
                      {med.category?.name || 'Chưa phân loại'} • {med.status}
                    </span>
                  </div>
                  <span className="text-slate-400 shrink-0">
                    {new Date(med.updatedAt).toLocaleString('vi-VN')}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-slate-400">
              Chưa có dữ liệu thuốc trong hệ thống.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
