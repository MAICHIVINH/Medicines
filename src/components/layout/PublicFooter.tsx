import React from 'react';
import Link from 'next/link';
import {
  MedicineBoxOutlined,
  SafetyCertificateOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';

export function PublicFooter() {
  return (
    <footer className="mt-auto border-t border-slate-200 bg-slate-900 text-slate-300">
      {/* Main Footer Columns */}
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-pharma-600 text-white">
                <MedicineBoxOutlined className="text-xl" />
              </div>
              <div>
                <span className="text-lg font-bold text-white">
                  Dược sĩ <span className="text-pharma-400">Khánh</span>
                </span>
                <p className="text-xs text-slate-400">
                  Hệ thống Tra cứu Dược
                </p>
              </div>
            </div>
            <p className="text-sm text-slate-400 max-w-md leading-relaxed">
              Cơ sở dữ liệu danh mục thuốc được chuẩn hóa theo phân nhóm dược lý, hỗ trợ tra cứu nhanh theo hoạt chất, nhà sản xuất, mã SKU biến thể và các thuộc tính bào chế động.
            </p>
            <div className="flex items-center gap-2 text-xs text-pharma-400">
              <SafetyCertificateOutlined />
              <span>Dữ liệu được kiểm duyệt và xác minh bởi Quản trị viên Dược phẩm</span>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white">
              Tra cứu nhanh
            </h3>
            <ul className="space-y-2 text-sm text-slate-400">
              <li>
                <Link href="/" className="hover:text-white transition-colors">
                  Trang chủ Dược điển
                </Link>
              </li>
              <li>
                <Link href="/medicines" className="hover:text-white transition-colors">
                  Danh mục Thuốc đã xuất bản
                </Link>
              </li>
              <li>
                <Link href="/categories" className="hover:text-white transition-colors">
                  Phân nhóm Dược lý Cha - Con
                </Link>
              </li>
              <li>
                <Link
                  href="/medicines?isPrescriptionRequired=true"
                  className="hover:text-white transition-colors"
                >
                  Danh mục Thuốc kê đơn (Rx)
                </Link>
              </li>
              <li>
                <Link
                  href="/medicines?isPrescriptionRequired=false"
                  className="hover:text-white transition-colors"
                >
                  Danh mục Thuốc không kê đơn (OTC)
                </Link>
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white">
              Hệ thống &amp; Kỹ thuật
            </h3>
            <ul className="space-y-2 text-sm text-slate-400">
              <li>
                <Link href="/admin" className="hover:text-white transition-colors">
                  Khu vực Quản trị (Admin Portal)
                </Link>
              </li>
              <li>
                <Link href="/sitemap.xml" className="hover:text-white transition-colors">
                  Sơ đồ trang (Sitemap.xml)
                </Link>
              </li>
              <li className="text-xs text-slate-500 pt-2">
                Hạ tầng dữ liệu: Neon PostgreSQL &amp; Neon Object Storage (S3)
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-slate-800 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>© {new Date().getFullYear()} Dược sĩ Khánh . Hệ thống Tra cứu &amp; Quản lý Danh mục Thuốc.</p>
          <p>Phiên bản Production 1.0 • Thiết kế theo chuẩn thông tin Dược phẩm</p>
        </div>
      </div>
    </footer>
  );
}

