import React from 'react';
import Link from 'next/link';
import { MedicineBoxOutlined } from '@ant-design/icons';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-4 py-16 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-pharma-50 text-pharma-600 mb-4">
        <MedicineBoxOutlined className="text-3xl" />
      </div>
      <h1 className="text-3xl font-extrabold text-slate-900">
        404 – Không tìm thấy dữ liệu yêu cầu
      </h1>
      <p className="mt-2 max-w-md text-sm text-slate-600 leading-relaxed">
        Trang hoặc thông tin thuốc bạn đang tìm kiếm không tồn tại, chưa được xuất bản hoặc đã bị gỡ bỏ khỏi danh mục.
      </p>
      <div className="mt-6 flex items-center gap-3">
        <Link
          href="/"
          className="rounded-xl bg-pharma-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-pharma-700 transition-colors"
        >
          Về Trang chủ
        </Link>
        <Link
          href="/medicines"
          className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
        >
          Tra cứu Danh sách Thuốc
        </Link>
      </div>
    </div>
  );
}

